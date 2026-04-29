// Responsabilidad: trazabilidad tipada del ciclo de vida del proceso de radicación automática de demandas.

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppLogger } from '@infrastructure/logging/appLogger.service';

export type TraceResultType = 'SUCCESS' | 'ERROR' | 'NOT_FOUND';

export interface DemandsTraceContext {
  correlationId: string;
  managementDemandsOnlineId?: number;
  lawsuitId?: number;
  lawsuitsFilingsId?: number;
  numberFiled?: string;
  dataBasesId?: number;
  baseName?: string;
}

const TRACE_CTX = 'DemandsTrace';
const TRACE_TYPE = 'DEMANDS_TRACE';

@Injectable()
export class DemandsTraceService {
  constructor(private readonly appLogger: AppLogger) {}

  generateCorrelationId(): string {
    return randomUUID();
  }

  traceProcessStart(ctx: DemandsTraceContext, meta?: Record<string, unknown>): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Info',
      message: 'Inicio de procesamiento de demanda',
      meta: { ...this.toMeta(ctx), ...meta },
    });
  }

  traceEmailRead(
    ctx: DemandsTraceContext,
    emailId?: number,
    subject?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Info',
      message: 'Lectura de correo automation_email',
      meta: { ...this.toMeta(ctx), emailId, subject, ...meta },
    });
  }

  traceFiledExtraction(
    ctx: DemandsTraceContext,
    numberFiled: string | null,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: numberFiled ? 'Success' : 'Warning',
      message: numberFiled
        ? `Número de radicado extraído: ${numberFiled}`
        : 'Número de radicado no encontrado',
      meta: { ...this.toMeta(ctx), numberFiled, ...meta },
    });
  }

  traceLawsuitsFilingsSearch(
    ctx: DemandsTraceContext,
    lawsuitsFilingsId: number | null,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: lawsuitsFilingsId ? 'Success' : 'Warning',
      message: lawsuitsFilingsId
        ? `Búsqueda en lawsuits_filings: encontrado id=${lawsuitsFilingsId}`
        : 'Búsqueda en lawsuits_filings: no encontrado',
      meta: { ...this.toMeta(ctx), lawsuitsFilingsId, ...meta },
    });
  }

  traceTableUpdate(
    ctx: DemandsTraceContext,
    statusBefore: string,
    statusAfter: string,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Success',
      message: `Actualización de tabla: ${statusBefore} → ${statusAfter}`,
      meta: {
        ...this.toMeta(ctx),
        managementStatusBefore: statusBefore,
        managementStatusAfter: statusAfter,
        ...meta,
      },
    });
  }

  traceStatusChange(
    ctx: DemandsTraceContext,
    statusBefore: string,
    statusAfter: string,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Info',
      message: `Cambio de estado: ${statusBefore} → ${statusAfter}`,
      meta: {
        ...this.toMeta(ctx),
        managementStatusBefore: statusBefore,
        managementStatusAfter: statusAfter,
        ...meta,
      },
    });
  }

  traceResult(
    ctx: DemandsTraceContext,
    resultType: TraceResultType,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: resultType === 'ERROR' ? 'error' : 'log',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status:
        resultType === 'SUCCESS' ? 'Success' : resultType === 'ERROR' ? 'Error' : 'Warning',
      message: `Resultado del procesamiento: ${resultType}`,
      meta: { ...this.toMeta(ctx), resultType, ...meta },
    });
  }

  traceError(
    ctx: DemandsTraceContext,
    error: Error,
    errorCode?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'error',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Error',
      message: `Error en procesamiento${errorCode ? ` [${errorCode}]` : ''}: ${error.message}`,
      meta: {
        ...this.toMeta(ctx),
        errorCode,
        errorMessage: error.message,
        ...meta,
      },
      stack: error.stack,
    });
  }

  traceRetry(
    ctx: DemandsTraceContext,
    attempt: number,
    maxAttempts: number,
    meta?: Record<string, unknown>,
  ): void {
    this.appLogger.structured({
      level: 'warn',
      context: TRACE_CTX,
      type: TRACE_TYPE,
      status: 'Warning',
      message: `Reintento de procesamiento: intento ${attempt}/${maxAttempts}`,
      meta: { ...this.toMeta(ctx), attempt, maxAttempts, retries: attempt, ...meta },
    });
  }

  private toMeta(ctx: DemandsTraceContext): Record<string, unknown> {
    const m: Record<string, unknown> = { correlationId: ctx.correlationId };
    if (ctx.managementDemandsOnlineId !== undefined) m.managementDemandsOnlineId = ctx.managementDemandsOnlineId;
    if (ctx.lawsuitId !== undefined) m.lawsuitId = ctx.lawsuitId;
    if (ctx.lawsuitsFilingsId !== undefined) m.lawsuitsFilingsId = ctx.lawsuitsFilingsId;
    if (ctx.numberFiled !== undefined) m.numberFiled = ctx.numberFiled;
    if (ctx.dataBasesId !== undefined) m.dataBasesId = ctx.dataBasesId;
    if (ctx.baseName !== undefined) m.baseName = ctx.baseName;
    return m;
  }
}
