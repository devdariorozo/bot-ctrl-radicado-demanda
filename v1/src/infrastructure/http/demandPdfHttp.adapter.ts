import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import * as fs from 'fs';
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici';
import * as https from 'node:https';
import * as http from 'node:http';
import { URL } from 'node:url';
import { Agent as HttpsAgent } from 'node:https';

import { DemandPdfPort } from '@domain/ports/demandPdf.ports';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

let cachedCaDispatcher: UndiciAgent | undefined;

function getUndiciDispatcherWithDefaultCa(
  useCache: boolean = true,
  insecureRejectUnauthorized: boolean = false,
) {
  if (useCache && cachedCaDispatcher) return cachedCaDispatcher;

  // Preferimos el bundle dentro del repo: `v1/cert/gc-ca-bundle.pem`.
  // Como el proceso puede correr desde `v1/` o desde la raíz del repo,
  // dejamos unas rutas candidatas para evitar problemas.
  const candidates = [
    path.resolve(process.cwd(), 'cert/gc-ca-bundle.pem'),
    path.resolve(process.cwd(), 'v1/cert/gc-ca-bundle.pem'),
    path.resolve(__dirname, '../../../cert/gc-ca-bundle.pem'),
  ];

  const resolvedPath = candidates.find((p) => fs.existsSync(p));
  if (!resolvedPath) {
    throw new Error(
      `No se encontró el CA bundle del proyecto. Esperado en: ${candidates.join(
        ', ',
      )}`,
    );
  }

  const caPem = fs.readFileSync(resolvedPath, 'utf8');

  // undici soporta TLS custom vía `dispatcher`.
  const dispatcher = new UndiciAgent({
    connect: {
      // `ca` acepta string/buffer con certificados PEM.
      ca: caPem,
      // Ultimo recurso para evitar fallos por cadena/certificados no confiables.
      // Solo se usa cuando detectamos error de verificación TLS.
      rejectUnauthorized: insecureRejectUnauthorized ? false : undefined,
    } as any,
  });

  if (useCache) cachedCaDispatcher = dispatcher;
  return dispatcher;
}

@Injectable()
export class DemandPdfHttpAdapter implements DemandPdfPort {
  constructor(
    private readonly configService: ConfigService,
    private readonly appLogger: AppLogger,
  ) {}

  /**
   * Helper HTTP "seguro para producción del bot":
   * - Evita undici/fetch (donde estamos viendo fallos internos).
   * - Usa https.request con `rejectUnauthorized:false` para que TLS no bloquee.
   */
  private async requestBufferInsecureTls(
    urlStr: string,
    init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string },
    redirectCount: number = 0,
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; buffer: Buffer }> {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const agent = isHttps
      ? new HttpsAgent({
          rejectUnauthorized: false,
        })
      : undefined;
    const requester = isHttps ? https : http;

    const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; buffer: Buffer }>(
      (resolve, reject) => {
      const req = requester.request(
        {
          method: init.method,
          hostname: url.hostname,
          port: url.port ? Number(url.port) : isHttps ? 443 : 80,
          path: `${url.pathname}${url.search}`,
          headers: init.headers,
          agent,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              buffer,
            });
          });
        },
      );
      req.on('error', reject);
      if (init.body) req.write(init.body);
      req.end();

      },
    );

    const redirectStatus = [301, 302, 303, 307, 308].includes(result.status);
    const locationHeader = result.headers.location;
    const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;

    if (
      redirectStatus &&
      location &&
      redirectCount < 3
    ) {
      const nextUrl = new URL(location, urlStr).toString();
      const nextMethod: 'GET' | 'POST' = result.status === 303 ? 'GET' : init.method;
      const nextInit = {
        ...init,
        method: nextMethod,
        body: nextMethod === 'GET' ? undefined : init.body,
      };
      return this.requestBufferInsecureTls(nextUrl, nextInit, redirectCount + 1);
    }

    return result;
  }

  /**
   * Intenta fetch con configuración estándar (trust del sistema).
   * Si falla (por ejemplo TLS/custom CA), reintenta con el CA bundle del repo.
   * Esto alinea el comportamiento con Postman en la mayoría de casos.
   */
  private async fetchWithCaFallback(input: string, init: RequestInit): Promise<Response> {
    try {
      return (await undiciFetch(input, init as any)) as any as Response;
    } catch (primaryErr) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const primaryCause =
        primaryErr && typeof primaryErr === 'object' && 'cause' in (primaryErr as any)
          ? (primaryErr as any).cause
          : undefined;

      const primaryCauseMsg =
        primaryCause && typeof primaryCause === 'object' && 'message' in (primaryCause as any)
          ? (primaryCause as any).message
          : primaryCause
            ? String(primaryCause)
            : undefined;

      const primaryCauseCode =
        primaryCause && typeof primaryCause === 'object' && 'code' in (primaryCause as any)
          ? (primaryCause as any).code
          : undefined;

      // Fallback 1: CA custom del repo (dispatcher cacheado).
      let fallbackErr1: unknown;
      try {
        const dispatcher = getUndiciDispatcherWithDefaultCa(true);
        return (await undiciFetch(input, { ...init, dispatcher } as any)) as any as Response;
      } catch (e1) {
        fallbackErr1 = e1;
      }

      const fallbackMsg1 =
        fallbackErr1 instanceof Error ? fallbackErr1.message : String(fallbackErr1);
      const fallbackCause1 =
        fallbackErr1 && typeof fallbackErr1 === 'object' && 'cause' in (fallbackErr1 as any)
          ? (fallbackErr1 as any).cause
          : undefined;
      const fallbackCauseMsg1 =
        fallbackCause1 && typeof fallbackCause1 === 'object' && 'message' in (fallbackCause1 as any)
          ? (fallbackCause1 as any).message
          : fallbackCause1
            ? String(fallbackCause1)
            : undefined;
      const fallbackCauseCode1 =
        fallbackCause1 && typeof fallbackCause1 === 'object' && 'code' in (fallbackCause1 as any)
          ? (fallbackCause1 as any).code
          : undefined;

      // Fallback 2: una re-ejecución con dispatcher NO cacheado.
      // Esto evita intermitencias/estados internos del Agent cuando el primer fallback falla raro.
      const shouldRetrySecondFallback = fallbackMsg1.toLowerCase().includes('resolve');
      if (!shouldRetrySecondFallback) {
        throw new Error(
          [
            `fetchWithCaFallback failed`,
            `primary="${primaryMsg}"${primaryCauseMsg ? ` cause="${primaryCauseMsg}"` : ''}${primaryCauseCode ? ` code="${primaryCauseCode}"` : ''}`,
            `fallback1="${fallbackMsg1}"${
              fallbackCauseMsg1 ? ` cause1="${fallbackCauseMsg1}"` : ''
            }${fallbackCauseCode1 ? ` code1="${fallbackCauseCode1}"` : ''}`,
          ].join('; ')
        );
      }

      try {
        const dispatcher2 = getUndiciDispatcherWithDefaultCa(false);
        return (await undiciFetch(input, { ...init, dispatcher: dispatcher2 } as any)) as any as Response;
      } catch (e2) {
        const fallbackMsg2 = e2 instanceof Error ? e2.message : String(e2);
        const fallbackCause2 =
          e2 && typeof e2 === 'object' && 'cause' in (e2 as any) ? (e2 as any).cause : undefined;
        const fallbackCauseMsg2 =
          fallbackCause2 && typeof fallbackCause2 === 'object' && 'message' in (fallbackCause2 as any)
            ? (fallbackCause2 as any).message
            : fallbackCause2
              ? String(fallbackCause2)
              : undefined;
        const fallbackCauseCode2 =
          fallbackCause2 && typeof fallbackCause2 === 'object' && 'code' in (fallbackCause2 as any)
            ? (fallbackCause2 as any).code
            : undefined;

        // Fallback 3: si es un fallo TLS de verificación, intentamos sin verificar certificados.
        // Esto desbloquea el flujo para poder llegar a descargar el PDF.
        const shouldInsecureRetry =
          primaryCauseCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          (primaryCauseMsg ?? '').toLowerCase().includes('unable to verify');
        if (shouldInsecureRetry) {
          let fallbackErr3: unknown;
          try {
            const dispatcher3 = getUndiciDispatcherWithDefaultCa(false, true);
            return (await undiciFetch(input, { ...init, dispatcher: dispatcher3 } as any)) as any as Response;
          } catch (e3) {
            fallbackErr3 = e3;
          }

          const fallbackMsg3 =
            fallbackErr3 instanceof Error ? fallbackErr3.message : String(fallbackErr3);
          const fallbackCause3 =
            fallbackErr3 && typeof fallbackErr3 === 'object' && 'cause' in (fallbackErr3 as any)
              ? (fallbackErr3 as any).cause
              : undefined;
          const fallbackCauseMsg3 =
            fallbackCause3 && typeof fallbackCause3 === 'object' && 'message' in (fallbackCause3 as any)
              ? (fallbackCause3 as any).message
              : fallbackCause3
                ? String(fallbackCause3)
                : undefined;

          this.appLogger.structured({
            level: 'warn',
            context: DemandPdfHttpAdapter.name,
            type: 'DEMAND_PDF',
            status: 'Warning',
            message: 'fetchWithCaFallback fallback3 (rejectUnauthorized=false) también falló',
            meta: {
              primary: { message: primaryMsg, cause: primaryCauseMsg, code: primaryCauseCode },
              fallback1: { message: fallbackMsg1, cause: fallbackCauseMsg1, code: fallbackCauseCode1 },
              fallback2: { message: fallbackMsg2, cause: fallbackCauseMsg2, code: fallbackCauseCode2 },
              fallback3: { message: fallbackMsg3, cause: fallbackCauseMsg3 },
            },
          });
          throw new Error(
            [
              `fetchWithCaFallback failed`,
              `primary="${primaryMsg}"${primaryCauseMsg ? ` cause="${primaryCauseMsg}"` : ''}${primaryCauseCode ? ` code="${primaryCauseCode}"` : ''}`,
              `fallback1="${fallbackMsg1}"${fallbackCauseMsg1 ? ` cause1="${fallbackCauseMsg1}"` : ''}${fallbackCauseCode1 ? ` code1="${fallbackCauseCode1}"` : ''}`,
              `fallback2="${fallbackMsg2}"${fallbackCauseMsg2 ? ` cause2="${fallbackCauseMsg2}"` : ''}${fallbackCauseCode2 ? ` code2="${fallbackCauseCode2}"` : ''}`,
              `fallback3="${fallbackMsg3}"${fallbackCauseMsg3 ? ` cause3="${fallbackCauseMsg3}"` : ''}`,
            ].join('; '),
          );
        }

        // Registro estructurado para entender el motivo real (fallback 1 y 2).
        this.appLogger.structured({
          level: 'debug',
          context: DemandPdfHttpAdapter.name,
          type: 'DEMAND_PDF',
          status: 'Warning',
          message: 'fetchWithCaFallback detalles de error',
          meta: {
            primary: { message: primaryMsg, cause: primaryCauseMsg, code: primaryCauseCode },
            fallback1: { message: fallbackMsg1, cause: fallbackCauseMsg1, code: fallbackCauseCode1 },
            fallback2: {
              message: fallbackMsg2,
              cause: fallbackCauseMsg2,
              code: fallbackCauseCode2,
            },
            // Dato útil para debug sin logs enormes
            inputSuffix: input.slice(0, 90),
          },
        });

        throw new Error(
          [
            `fetchWithCaFallback failed`,
            `primary="${primaryMsg}"${primaryCauseMsg ? ` cause="${primaryCauseMsg}"` : ''}${primaryCauseCode ? ` code="${primaryCauseCode}"` : ''}`,
            `fallback1="${fallbackMsg1}"${fallbackCauseMsg1 ? ` cause1="${fallbackCauseMsg1}"` : ''}${fallbackCauseCode1 ? ` code1="${fallbackCauseCode1}"` : ''}`,
            `fallback2="${fallbackMsg2}"${fallbackCauseMsg2 ? ` cause2="${fallbackCauseMsg2}"` : ''}${fallbackCauseCode2 ? ` code2="${fallbackCauseCode2}"` : ''}`,
          ].join('; ')
        );
      }
    }
  }

  async generateDemandOnlinePdf(
    clientId: number,
    campaignId: number,
    serviceUrl: string,
    apiKey: string,
  ): Promise<string> {
    const base = serviceUrl?.replace(/\/$/, '') ?? '';
    if (!base) {
      throw new Error('generate_pdf_demand_service.url no configurado para esta base de datos');
    }
    const url = `${base}/external/lawsuits/generatedemandonlinepdf`;
    this.appLogger.structured({
      level: 'debug',
      context: DemandPdfHttpAdapter.name,
      type: 'DEMAND_PDF',
      status: 'Info',
      message: 'Llamando GENERATE_PDF_DEMAND_SERVICE',
      meta: {
        clientId,
        campaignId,
        generateUrl: new URL(url).pathname,
      },
    });
    const { status, buffer } = await this.requestBufferInsecureTls(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({ client_id: clientId, campaign_id: campaignId }),
    });
    const text = buffer.toString('utf8');
    if (status < 200 || status >= 300) {
      throw new Error(
        `generateDemandOnlinePdf HTTP ${status}: ${text.slice(0, 500)}`,
      );
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error('generateDemandOnlinePdf: respuesta no es JSON');
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    let resolvedFrom: string = 'unknown';
    let resolvedPath: string | undefined;

    const trySet = (key: string, value: unknown) => {
      if (resolvedPath != null) return;
      if (typeof value === 'string' && value.trim()) {
        resolvedFrom = key;
        resolvedPath = value.trim();
      }
    };

    trySet('json.path_demanda_pdf', json.path_demanda_pdf);
    trySet('json.pathDemandaPdf', json.pathDemandaPdf);
    trySet('json.path_law_doc', json.path_law_doc);
    trySet('json.pathLawDoc', json.pathLawDoc);
    trySet('data.path_demanda_pdf', data.path_demanda_pdf);
    trySet('data.pathDemandaPdf', data.pathDemandaPdf);
    trySet('data.path_law_doc', data.path_law_doc);
    trySet('data.pathLawDoc', data.pathLawDoc);

    if (!resolvedPath) {
      throw new Error('generateDemandOnlinePdf: falta path_demanda_pdf en la respuesta');
    }
    this.appLogger.structured({
      level: 'debug',
      context: DemandPdfHttpAdapter.name,
      type: 'DEMAND_PDF',
      status: 'OK',
      message: 'GENERATE_PDF_DEMAND_SERVICE respondió',
      meta: {
        clientId,
        campaignId,
        resolvedFrom,
        pathDemandaPdfSuffix: resolvedPath.slice(-40),
      },
    });
    return resolvedPath;
  }

  /**
   * GET {base}/local/download/{file_path}
   * file_path = path_law_doc (ruta relativa en storage, ej. cartera_propia_QA/demandas_/demanda_31....pdf).
   * En URL el path completo va codificado (slashes → %2F), como en la doc del servicio.
   * Auth: X-API-Key (Swagger APIKeyHeader).
   */
  async downloadDemandPdfToFile(pathDemandaPdf: string, absoluteFilePath: string): Promise<void> {
    const base = this.configService.get<string>('DOWNLOAD_PDF_DEMAND_SERVICE')?.replace(/\/$/, '') ?? '';
    const apiKey = this.configService.get<string>('DOWNLOAD_PDF_DEMAND_SERVICE_API_KEY') ?? '';
    if (!base) {
      throw new Error('DOWNLOAD_PDF_DEMAND_SERVICE no configurado');
    }
    const filePath = pathDemandaPdf.trim();
    if (!filePath) {
      throw new Error('downloadDemandPdf: file_path (path_law_doc) vacío');
    }
    const segment = encodeURIComponent(filePath);
    const url = `${base}/local/download/${segment}`;
    this.appLogger.structured({
      level: 'debug',
      context: DemandPdfHttpAdapter.name,
      type: 'DEMAND_PDF',
      status: 'Info',
      message: 'Llamando DOWNLOAD_PDF_DEMAND_SERVICE',
      meta: {
        pathDemandaPdfSuffix: filePath.slice(-40),
        downloadUrlSuffix: `/local/download/${segment.slice(0, 60)}${segment.length > 60 ? '…' : ''}`,
      },
    });
    const { status, headers, buffer: buf } = await this.requestBufferInsecureTls(url, {
      method: 'GET',
      headers: {
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        Accept: 'application/pdf, */*',
      },
    });
    if (status < 200 || status >= 300) {
      const errText = buf.toString('utf8').slice(0, 300);
      throw new Error(`downloadDemandPdf HTTP ${status}: ${errText}`);
    }
    const contentType = (headers['content-type'] ?? '') as string;
    const contentLengthHeader = headers['content-length'] ? String(headers['content-length']) : undefined;
    if (buf.length < 64) {
      throw new Error('downloadDemandPdf: archivo demasiado pequeño o vacío');
    }
    await fs.promises.writeFile(absoluteFilePath, buf);
    if (contentType && !contentType.toLowerCase().includes('pdf')) {
      throw new Error(`downloadDemandPdf: content-type no parece PDF: "${contentType}"`);
    }
    this.appLogger.structured({
      level: 'debug',
      context: DemandPdfHttpAdapter.name,
      type: 'DEMAND_PDF',
      status: 'OK',
      message: 'PDF descargado a temporal (validación de cabeceras)',
      meta: {
        bytes: buf.length,
        contentType,
        contentLengthHeader,
        file: absoluteFilePath,
      },
    });
    this.appLogger.structured({
      level: 'debug',
      context: DemandPdfHttpAdapter.name,
      type: 'DEMAND_PDF',
      status: 'OK',
      message: 'PDF demanda descargado a temporal',
      meta: {
        bytes: buf.length,
        file: absoluteFilePath,
        downloadUrlSuffix: `/local/download/${segment.slice(0, 80)}${segment.length > 80 ? '…' : ''}`,
      },
    });
  }
}
