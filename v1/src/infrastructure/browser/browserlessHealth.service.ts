// Responsabilidad: monitorear disponibilidad y cuota del servicio Browserless Cloud.
// Realiza un HTTP health-check antes de conectar y clasifica errores de conexión WebSocket.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

import { AppLogger } from '@infrastructure/logging/appLogger.service';

export interface BrowserlessUsage {
  unitsUsed: number;
  unitsTotal: number;
  percentUsed: number;
  concurrencyLimit?: number;
}

export type BrowserlessHealthStatus =
  | { ok: true; usage?: BrowserlessUsage }
  | { ok: false; reason: 'SERVICE_DOWN' | 'QUOTA_EXCEEDED' | 'AUTH_ERROR' | 'UNKNOWN'; message: string };

/** Umbral de uso a partir del cual se emite warn (%) */
const WARN_THRESHOLD = 75;
/** Umbral de uso a partir del cual se emite warn crítico (%) */
const CRITICAL_THRESHOLD = 90;
/** Tiempo máximo de espera para peticiones HTTP de health-check (ms) */
const HTTP_TIMEOUT_MS = 8_000;

@Injectable()
export class BrowserlessHealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers de configuración
  // ---------------------------------------------------------------------------

  /** Convierte el endpoint WSS configurado en una URL HTTPS base (sin path). */
  private getHttpBaseUrl(): string | null {
    const endpoint = this.configService.get<string>('BROWSERLESS_ENDPOINT');
    if (!endpoint) return null;
    // wss://production-sfo.browserless.io/stealth  →  https://production-sfo.browserless.io
    return endpoint.replace(/^wss?:\/\//i, 'https://').replace(/\/[^/]*$/, '');
  }

  private getToken(): string | null {
    const raw = this.configService.get<string>('BROWSERLESS_API_TOKEN');
    return raw ? raw.replace(/^['"]|['"]$/g, '') : null;
  }

  // ---------------------------------------------------------------------------
  // HTTP helper
  // ---------------------------------------------------------------------------

  private httpGet(url: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { timeout: HTTP_TIMEOUT_MS }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer | string) => (body += chunk.toString()));
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health-check HTTP timeout'));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Health check principal
  // ---------------------------------------------------------------------------

  /**
   * Verifica disponibilidad del servicio Browserless y, si la API lo permite,
   * consulta el uso actual de cuota. Emite logs estructurados con warnings.
   *
   * Debe llamarse antes de `puppeteer.connect()` en cada ciclo de automatización.
   */
  async checkHealth(): Promise<BrowserlessHealthStatus> {
    const baseUrl = this.getHttpBaseUrl();
    const token = this.getToken();

    if (!baseUrl || !token) {
      this.appLogger.structured({
        level: 'error',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_HEALTH',
        status: 'Error',
        message: 'Browserless: BROWSERLESS_ENDPOINT o BROWSERLESS_API_TOKEN no configurados',
      });
      return { ok: false, reason: 'UNKNOWN', message: 'Credenciales de Browserless no configuradas' };
    }

    // 1. Verificar que el servicio responde (endpoint /config es liviano y siempre existe)
    const availabilityResult = await this.checkAvailability(baseUrl, token);
    if (!availabilityResult.ok) return availabilityResult;

    // 2. Intentar obtener datos de uso de cuota (endpoint /usage, no crítico si falla)
    const usage = await this.fetchUsage(baseUrl, token);
    if (usage) {
      this.logUsageWarnings(usage);
      return { ok: true, usage };
    }

    return { ok: true };
  }

  private async checkAvailability(baseUrl: string, token: string): Promise<BrowserlessHealthStatus> {
    try {
      const { statusCode } = await this.httpGet(
        `${baseUrl}/config?token=${encodeURIComponent(token)}`,
      );

      if (statusCode === 401 || statusCode === 403) {
        this.appLogger.structured({
          level: 'error',
          context: BrowserlessHealthService.name,
          type: 'BROWSERLESS_HEALTH',
          status: 'Error',
          message: `Browserless: token inválido o sin autorización (HTTP ${statusCode})`,
          meta: { statusCode, baseUrl },
        });
        return {
          ok: false,
          reason: 'AUTH_ERROR',
          message: `Token rechazado por Browserless (HTTP ${statusCode})`,
        };
      }

      if (statusCode === 402 || statusCode === 429) {
        this.appLogger.structured({
          level: 'error',
          context: BrowserlessHealthService.name,
          type: 'BROWSERLESS_HEALTH',
          status: 'Error',
          message: `Browserless: cuota agotada o límite de concurrencia alcanzado (HTTP ${statusCode})`,
          meta: { statusCode, baseUrl },
        });
        return {
          ok: false,
          reason: 'QUOTA_EXCEEDED',
          message: `Cuota de Browserless agotada (HTTP ${statusCode}). Revisar saldo en https://www.browserless.io/account/dashboard`,
        };
      }

      if (statusCode >= 500) {
        this.appLogger.structured({
          level: 'error',
          context: BrowserlessHealthService.name,
          type: 'BROWSERLESS_HEALTH',
          status: 'Error',
          message: `Browserless: error interno del servicio (HTTP ${statusCode})`,
          meta: { statusCode, baseUrl },
        });
        return {
          ok: false,
          reason: 'SERVICE_DOWN',
          message: `Browserless con error interno (HTTP ${statusCode})`,
        };
      }

      this.appLogger.structured({
        level: 'log',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_HEALTH',
        status: 'Success',
        message: 'Browserless: servicio disponible',
        meta: { statusCode, baseUrl },
      });

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.appLogger.structured({
        level: 'error',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_HEALTH',
        status: 'Error',
        message: 'Browserless: servicio no disponible (sin respuesta HTTP)',
        meta: { error: message, baseUrl },
      });
      return {
        ok: false,
        reason: 'SERVICE_DOWN',
        message: `Browserless no disponible: ${message}`,
      };
    }
  }

  private async fetchUsage(baseUrl: string, token: string): Promise<BrowserlessUsage | null> {
    try {
      const { statusCode, body } = await this.httpGet(
        `${baseUrl}/usage?token=${encodeURIComponent(token)}`,
      );
      if (statusCode !== 200) return null;

      const data = JSON.parse(body) as Record<string, unknown>;
      return this.parseUsageResponse(data);
    } catch {
      // El endpoint /usage puede no estar disponible en todos los planes; no es crítico
      return null;
    }
  }

  /**
   * Intenta parsear la respuesta de /usage según los formatos conocidos de Browserless v1/v2.
   * Retorna null si la estructura no es reconocida.
   */
  private parseUsageResponse(data: Record<string, unknown>): BrowserlessUsage | null {
    // Formato plano: { used: number, total: number, concurrency: number }
    if (typeof data['used'] === 'number' && typeof data['total'] === 'number') {
      const unitsUsed = data['used'] as number;
      const unitsTotal = data['total'] as number;
      return {
        unitsUsed,
        unitsTotal,
        percentUsed: unitsTotal > 0 ? Math.round((unitsUsed / unitsTotal) * 100) : 0,
        concurrencyLimit: typeof data['concurrency'] === 'number' ? (data['concurrency'] as number) : undefined,
      };
    }

    // Formato anidado: { units: { used, total }, subscription: { concurrency } }
    const units = data['units'] as Record<string, unknown> | undefined;
    const subscription = data['subscription'] as Record<string, unknown> | undefined;
    if (units && typeof units['used'] === 'number' && typeof units['total'] === 'number') {
      const unitsUsed = units['used'] as number;
      const unitsTotal = units['total'] as number;
      return {
        unitsUsed,
        unitsTotal,
        percentUsed: unitsTotal > 0 ? Math.round((unitsUsed / unitsTotal) * 100) : 0,
        concurrencyLimit:
          typeof subscription?.['concurrency'] === 'number'
            ? (subscription['concurrency'] as number)
            : undefined,
      };
    }

    return null;
  }

  private logUsageWarnings(usage: BrowserlessUsage): void {
    const { percentUsed, unitsUsed, unitsTotal, concurrencyLimit } = usage;
    const meta: Record<string, unknown> = {
      unitsUsed,
      unitsTotal,
      percentUsed: `${percentUsed}%`,
    };
    if (concurrencyLimit !== undefined) meta['concurrencyLimit'] = concurrencyLimit;

    if (percentUsed >= CRITICAL_THRESHOLD) {
      this.appLogger.structured({
        level: 'warn',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_QUOTA',
        status: 'Warning',
        message: `ALERTA CRITICA: Browserless al ${percentUsed}% de cuota (${unitsUsed}/${unitsTotal} unidades). Riesgo inminente de quedar sin saldo. Revisar https://www.browserless.io/account/dashboard`,
        meta,
      });
    } else if (percentUsed >= WARN_THRESHOLD) {
      this.appLogger.structured({
        level: 'warn',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_QUOTA',
        status: 'Warning',
        message: `Browserless al ${percentUsed}% de cuota (${unitsUsed}/${unitsTotal} unidades). Considerar revisar el saldo pronto.`,
        meta,
      });
    } else {
      this.appLogger.structured({
        level: 'log',
        context: BrowserlessHealthService.name,
        type: 'BROWSERLESS_QUOTA',
        status: 'Info',
        message: `Browserless cuota: ${percentUsed}% utilizado (${unitsUsed}/${unitsTotal} unidades)`,
        meta,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Clasificación de errores de conexión WebSocket
  // ---------------------------------------------------------------------------

  /**
   * Dado un error lanzado por `puppeteer.connect()`, determina la causa probable
   * y devuelve un mensaje de usuario y una categoría.
   */
  classifyConnectionError(error: Error): {
    reason: 'QUOTA_EXCEEDED' | 'AUTH_ERROR' | 'SERVICE_DOWN' | 'UNKNOWN';
    userMessage: string;
  } {
    const msg = error.message.toLowerCase();

    if (
      msg.includes('402') ||
      msg.includes('payment') ||
      msg.includes('quota') ||
      msg.includes('units') ||
      msg.includes('limit exceeded') ||
      msg.includes('over limit')
    ) {
      return {
        reason: 'QUOTA_EXCEEDED',
        userMessage:
          'Browserless: cuota de unidades agotada. Revisar saldo en https://www.browserless.io/account/dashboard',
      };
    }

    if (
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('invalid token') ||
      msg.includes('bad token')
    ) {
      return {
        reason: 'AUTH_ERROR',
        userMessage: 'Browserless: token de API inválido o sin autorización',
      };
    }

    if (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('timeout') ||
      msg.includes('unavailable') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('network')
    ) {
      return {
        reason: 'SERVICE_DOWN',
        userMessage: 'Browserless: servicio no disponible en este momento (posible outage)',
      };
    }

    return {
      reason: 'UNKNOWN',
      userMessage: `Browserless: error de conexión — ${error.message}`,
    };
  }
}
