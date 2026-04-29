// Responsabilidad: lectura y gestión de archivos de logs para exponerlos vía API.
import { Injectable, UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { userMsg } from '@application/utils/apiUserMessages.utils';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

// Status que pueden venir del archivo:
// - Nuevo formato: Success, Info, Warning, Error
// - Formato legacy: OK, WARN, ERROR
export type LogStatusWord = 'Success' | 'Info' | 'Warning' | 'Error';
export type LogStatusLegacy = 'OK' | 'WARN' | 'ERROR';
export type LogStatus = LogStatusWord | LogStatusLegacy | undefined;

export interface LogEntry {
  timestamp: string;
  level: string;
  status: LogStatusWord;
  /** Símbolo sugerido para el frontend (✅, ℹ️, ⚠️, ❌). */
  icon: string;
  type?: string;
  context?: string;
  message: string;
  meta?: Record<string, unknown> | null;
  stack?: string | null;
}

export interface LogsTotals {
  success: number;
  error: number;
  warning: number;
  info: number;
}

export interface LogsListResult {
  log_date: string;
  file_name: string;
  number_lines: number;
  lines: LogEntry[];
  totals: LogsTotals;
}

@Injectable()
export class LogsService {
  private readonly logsDir: string;
  private readonly systemName: string;

  constructor(private readonly configService: ConfigService) {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.systemName =
      this.configService.get<string>('PROJECT_NAME', 'bot-ctrl-filed-demand') ||
      'bot-ctrl-filed-demand';
  }

  /** Devuelve el resumen de logs para una fecha dada, tomando N líneas desde la más reciente. */
  async listByDate(log_date: string, number_lines: number): Promise<LogsListResult | null> {
    const normalizedDate = this.validateDate(log_date);
    const normalizedLines = this.validateLines(number_lines);

    const filePath = this.getFilePathByDate(normalizedDate);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const rawLines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const selected = rawLines.slice(-normalizedLines);

    const lines: LogEntry[] = [];
    let success = 0;
    let error = 0;
    let warning = 0;
    let info = 0;

    for (const line of selected) {
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch {
        // Si la línea no es JSON válido, la devolvemos como mensaje plano.
        const fallback = this.normalizeStatus(undefined);
        lines.push({
          timestamp: this.formatTimestamp(new Date().toISOString()),
          level: 'log',
          status: fallback.status,
          icon: fallback.icon,
          message: line,
          type: undefined,
          context: undefined,
          meta: null,
          stack: null,
        });
        info += 1;
        continue;
      }

      const normalized = this.normalizeStatus(parsed.status as LogStatus | undefined);

      const entry: LogEntry = {
        timestamp: this.formatTimestamp(String(parsed.timestamp ?? new Date().toISOString())),
        level: String(parsed.level ?? 'log'),
        status: normalized.status,
        icon: normalized.icon,
        type: parsed.type as string | undefined,
        context: parsed.context as string | undefined,
        message: String(parsed.message ?? ''),
        meta: (parsed.meta ?? null) as Record<string, unknown> | null,
        stack: (parsed.stack ?? null) as string | null,
      };

      switch (entry.status) {
        case 'Success':
          success++;
          break;
        case 'Error':
          error++;
          break;
        case 'Warning':
          warning++;
          break;
        default:
          info++;
          break;
      }

      lines.push(entry);
    }

    return {
      log_date: normalizedDate,
      file_name: path.basename(filePath),
      number_lines: lines.length,
      lines: lines.reverse(),
      totals: {
        success,
        error,
        warning,
        info,
      },
    };
  }

  /** Elimina el archivo de logs correspondiente a la fecha dada. */
  async deleteByDate(log_date: string): Promise<void> {
    const normalizedDate = this.validateDate(log_date);
    const filePath = this.getFilePathByDate(normalizedDate);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({ message: userMsg.logNoArchivo });
    }

    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      throw new UnprocessableEntityException({ message: userMsg.logNoBorrar });
    }
  }

  private validateDate(value: string): string {
    if (!value) {
      throw new UnprocessableEntityException(userMsg.logFechaRequerida);
    }
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(value)) {
      throw new UnprocessableEntityException(userMsg.logFechaFormato);
    }
    return value;
  }

  private validateLines(value: number): number {
    if (value == null) {
      throw new UnprocessableEntityException(userMsg.logLineas);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      throw new UnprocessableEntityException(userMsg.logLineas);
    }
    return Math.floor(n);
  }

  private getFilePathByDate(date: string): string {
    return path.join(this.logsDir, `${date}-logs-${this.systemName}.log`);
  }

  private formatTimestamp(iso: string): string {
    return iso.replace('T', ' ').slice(0, 19);
  }

  /** Normaliza el status interno (nuevo o legacy) a SUCCESS, INFO, WARNING, ERROR + símbolo. */
  private normalizeStatus(
    status: LogStatus,
  ): {
    status: LogStatusWord;
    icon: string;
  } {
    switch (status) {
      case 'Error':
      case 'ERROR':
        return { status: 'Error', icon: '❌' };
      case 'Warning':
      case 'WARN':
        return { status: 'Warning', icon: '⚠️' };
      case 'Success':
      case 'OK':
        return { status: 'Success', icon: '✅' };
      default:
        return { status: 'Info', icon: 'ℹ️' };
    }
  }
}

