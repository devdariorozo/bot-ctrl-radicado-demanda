// Responsabilidad: estandarizar las respuestas HTTP exitosas del API.
//
// Envuelve cualquier respuesta en una estructura:
// {
//   status: number;
//   type: 'success' | 'info' | 'warning' | 'error';
//   title: string;
//   message: string;
//   page?: number;    // solo cuando aplica paginación
//   limit?: number;   // solo cuando aplica paginación
//   total?: number;   // cantidad total de registros relevantes
//   data: any;        // DTO, objeto o arreglo de resultados
// }
//
// - Si el body ya viene como { data, meta }, se respeta data y se
//   deriva total desde meta.total o desde el tamaño del array.

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response, Request } from 'express';

type ResponseType = 'success' | 'info' | 'warning' | 'error';

function mapStatusToType(status: number): ResponseType {
  if (status >= 200 && status < 300) return 'success';
  if (status === 400) return 'warning';
  if (status === 409) return 'info';
  if (status >= 500) return 'error';
  return 'warning';
}

function formatDateValue(value: unknown): unknown {
  if (!value) return value;
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return value;
  // Formato legible: YYYY-MM-DD HH:mm:ss
  const iso = d.toISOString(); // 2026-02-28T02:11:48.000Z
  return iso.replace('T', ' ').substring(0, 19);
}

function formatDatesDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => formatDatesDeep(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const formatted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (
        (key.endsWith('_at') || key === 'created_at' || key === 'updated_at' || key === 'deleted_at') &&
        (typeof val === 'string' || val instanceof Date)
      ) {
        formatted[key] = formatDateValue(val);
      } else if (Array.isArray(val) || (val && typeof val === 'object')) {
        formatted[key] = formatDatesDeep(val);
      } else {
        formatted[key] = val;
      }
    }
    return formatted as T;
  }
  return value;
}

function buildDefaultMessage(req: Request, status: number): string {
  if (status >= 200 && status < 300) {
    if (req.method === 'GET') return 'Operación de consulta ejecutada correctamente.';
    if (req.method === 'POST') return 'El registro se ha creado correctamente en el sistema.';
    if (req.method === 'PUT') return 'El registro se ha actualizado correctamente en el sistema.';
    if (req.method === 'DELETE') return 'El registro se ha eliminado correctamente en el sistema.';
    return 'Operación ejecutada correctamente.';
  }
  return 'Operación procesada.';
}

function buildSpanishTitle(req: Request, status: number): string {
  if (status < 200 || status >= 300) {
    return 'Operación sobre registros';
  }

  const method = req.method?.toUpperCase();
  const hasIdParam =
    req.params && Object.values(req.params).some((v) => v !== undefined && v !== null && v !== '');
  const queryKeys = Object.keys(req.query || {}).filter(
    (k) => k !== 'page' && k !== 'limit',
  );
  const hasFilters = queryKeys.length > 0;

  if (method === 'GET') {
    if (hasIdParam) return 'Listar Registro';
    if (hasFilters) return 'Filtrar Registros';
    return 'Listar Registros';
  }
  if (method === 'POST') return 'Crear Registro';
  if (method === 'PUT' || method === 'PATCH') return 'Actualizar Registro';
  if (method === 'DELETE') return 'Eliminar Registro';

  return 'Operación sobre registros';
}

@Injectable()
export class StandardResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const res = httpCtx.getResponse<Response>();
    const req = httpCtx.getRequest<Request>();

    return next.handle().pipe(
      map((body) => {
        const status = res.statusCode ?? 200;
        const type = mapStatusToType(status);
        const title = buildSpanishTitle(req, status);
        const message = buildDefaultMessage(req, status);
        const method = req.method?.toUpperCase();

        const parsePositiveInt = (value: unknown, defaultValue: number): number => {
          if (typeof value === 'number') {
            return Number.isFinite(value) && value > 0 ? Math.floor(value) : defaultValue;
          }
          if (typeof value === 'string') {
            const n = Number(value);
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultValue;
          }
          return defaultValue;
        };

        // Si el body ya tiene estructura paginada { data, meta }
        if (
          body &&
          typeof body === 'object' &&
          'data' in body &&
          'meta' in body
        ) {
          const rawData = (body as { data: any; meta: { total?: number; page?: number; limit?: number } }).data;
          const data = formatDatesDeep(rawData);
          const meta = (body as { data: any; meta: { total?: number; page?: number; limit?: number } }).meta;
          const total =
            typeof meta?.total === 'number'
              ? meta.total
              : Array.isArray(data)
              ? data.length
              : undefined;
          const page =
            typeof meta?.page === 'number'
              ? meta.page
              : method === 'GET'
              ? parsePositiveInt(req.query?.page, 1)
              : undefined;
          const limit =
            typeof meta?.limit === 'number'
              ? meta.limit
              : method === 'GET'
              ? parsePositiveInt(req.query?.limit, Array.isArray(data) ? data.length || 1 : 10)
              : undefined;

          return {
            status,
            type,
            title,
            message,
            page,
            limit,
            total,
            data,
          };
        }

        // Si el controller ya devolvió { data } (sin meta), usar ese data y no añadir page/limit/total
        if (
          body &&
          typeof body === 'object' &&
          'data' in body &&
          !('meta' in body)
        ) {
          const rawData = (body as { data: any }).data;
          return {
            status,
            type,
            title,
            message,
            data: formatDatesDeep(rawData),
          };
        }

        // Si es un array "plano"
        if (Array.isArray(body)) {
          const page =
            method === 'GET'
              ? parsePositiveInt(req.query?.page, 1)
              : undefined;
          const limit =
            method === 'GET'
              ? parsePositiveInt(req.query?.limit, body.length || 1)
              : undefined;

          return {
            status,
            type,
            title,
            message,
            page,
            limit,
            total: body.length,
            data: formatDatesDeep(body),
          };
        }

        // Cualquier otro caso (DTO simple, objeto, etc.)
        const formattedBody = formatDatesDeep(body);

        if (method === 'GET') {
          const hasIdParam =
            req.params &&
            Object.values(req.params).some(
              (v) => v !== undefined && v !== null && v !== '',
            );

          // Si es GET por id, normalizar siempre a un array de un solo elemento
          if (hasIdParam && formattedBody && typeof formattedBody === 'object') {
            const page = parsePositiveInt(req.query?.page, 1);
            const limit = parsePositiveInt(req.query?.limit, 1);

            return {
              status,
              type,
              title,
              message,
              page,
              limit,
              total: 1,
              data: [formattedBody],
            };
          }

          // Para otros GET (sin id en path), conservar comportamiento anterior
          const page = parsePositiveInt(req.query?.page, 1);
          const limit = parsePositiveInt(
            req.query?.limit,
            formattedBody && typeof formattedBody === 'object' ? 1 : 0,
          );
          const total = formattedBody && typeof formattedBody === 'object' ? 1 : 0;

          return {
            status,
            type,
            title,
            message,
            data: formattedBody,
            page,
            limit,
            total,
          };
        }

        return {
          status,
          type,
          title,
          message,
          data: formattedBody,
        };
      }),
    );
  }
}

