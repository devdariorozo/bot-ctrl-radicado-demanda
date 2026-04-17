// Responsabilidad: devolver un mensaje claro cuando el body del request es JSON inválido.

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

const FRIENDLY_MSG =
  'JSON inválido en el cuerpo de la petición. Verifica que los elementos de arreglos y objetos estén separados por comas, que todas las cadenas usen comillas dobles y que no haya comas finales.';

function isJsonParseError(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('json') ||
    lower.includes('expected ') ||
    lower.includes('unexpected token') ||
    lower.includes('position ')
  );
}

function buildOperationTitle(req: Request): string {
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

function translateErrorMessage(message: string, statusCode: number): string {
  const normalized = (message ?? '').trim();

  if (!normalized) {
    if (statusCode === HttpStatus.NOT_FOUND) {
      return 'No se encontraron datos para la solicitud realizada.';
    }
    if (statusCode === HttpStatus.BAD_REQUEST) {
      return 'Solicitud inválida. Revisa los datos enviados.';
    }
    if (statusCode === HttpStatus.CONFLICT) {
      return 'Conflicto con los datos enviados.';
    }
    if (statusCode >= 500) {
      return 'Ocurrió un error interno del servidor.';
    }
    return 'Error al procesar la solicitud.';
  }

  const lower = normalized.toLowerCase();

  if (statusCode === HttpStatus.NOT_FOUND && lower.includes('not found')) {
    if (lower.includes('data_bases') || lower.includes('databases')) {
      return 'No se encontró el registro de configuración de bases de datos.';
    }
    if (lower.includes('related records')) {
      return 'No se encontraron los registros relacionados requeridos.';
    }
    return 'No se encontraron datos para la solicitud realizada.';
  }

  if (statusCode === HttpStatus.CONFLICT && lower.includes('already exists')) {
    return 'Ya existe un registro con los datos proporcionados.';
  }

  if (
    statusCode === HttpStatus.BAD_REQUEST &&
    (lower.includes('must be') || lower.includes('must be valid'))
  ) {
    return 'Los datos enviados no son válidos. Revisa los campos requeridos.';
  }

  switch (normalized) {
    case 'No data found for the given id':
      return 'No se encontraron datos para el id proporcionado.';
    case 'No data found for the given type':
      return 'No se encontraron datos para el tipo proporcionado.';
    case 'No data found for the given state type id':
      return 'No se encontraron datos para el estado proporcionado.';
    case 'No changes to update':
      return 'No hay cambios para actualizar.';
    default:
      return normalized;
  }
}

@Catch()
export class JsonParseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(JsonParseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const err = exception as Error & { getStatus?: () => number; getResponse?: () => unknown };
    const status = err.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message ?? String(exception);

    if (status === HttpStatus.BAD_REQUEST && isJsonParseError(message)) {
      this.logger.warn(`JSON parse error (original): ${message}`);
      res.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        type: 'warning',
        title: 'JSON inválido',
        message: FRIENDLY_MSG,
        data: null,
      });
      return;
    }

    if (typeof err.getResponse === 'function') {
      const response = err.getResponse();
      const raw =
        typeof response === 'object' && response !== null
          ? (response as { message?: string | string[] })
          : { message, statusCode: status, error: 'Bad Request' };

      const statusCode = (raw as { statusCode?: number }).statusCode ?? status;
      const originalMsg =
        Array.isArray(raw.message) && raw.message.length > 0
          ? raw.message[0]
          : typeof raw.message === 'string'
          ? raw.message
          : message;
      const msg = translateErrorMessage(originalMsg, statusCode);

      const type =
        statusCode === HttpStatus.BAD_REQUEST
          ? 'warning'
          : statusCode === HttpStatus.CONFLICT
          ? 'info'
          : statusCode >= 500
          ? 'error'
          : 'warning';

      res.status(statusCode).json({
        status: statusCode,
        type,
        title: buildOperationTitle(req),
        message: msg,
        data: null,
      });
      return;
    }

    res.status(status).json({
      status,
      type: status >= 500 ? 'error' : 'warning',
      title: buildOperationTitle(req),
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Ocurrió un error interno del servidor.'
          : translateErrorMessage(message, status),
      data: null,
    });
  }
}
