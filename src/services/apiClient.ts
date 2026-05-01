import { API_BASE_URL, OWNER_SECRET } from '../config/api';
import type { ApiErrorBody } from '../types/api';
import { HttpError } from '../types/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  requiresOwnerAuth?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10000;

function logApiError(params: {
  path: string;
  method: string;
  body: unknown;
  requiresOwnerAuth: boolean;
  error: unknown;
}) {
  const errorInfo =
    params.error instanceof HttpError
      ? {
          name: params.error.name,
          status: params.error.status,
          message: params.error.message,
          details: params.error.details,
        }
      : params.error instanceof Error
        ? {
            name: params.error.name,
            message: params.error.message,
            stack: params.error.stack,
          }
        : params.error;

  console.error('[API ERROR]', {
    endpoint: params.path,
    url: `${API_BASE_URL}${params.path}`,
    method: params.method,
    requiresOwnerAuth: params.requiresOwnerAuth,
    ownerSecretConfigured: Boolean(OWNER_SECRET),
    body: params.body,
    error: errorInfo,
  });
}

function mapStatusToMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Solicitud invalida. Revisa los datos enviados.';
    case 401:
      return 'No autorizado. Verifica el token owner.';
    case 404:
      return 'Recurso no encontrado.';
    case 409:
      return 'Conflicto de horario o estado.';
    case 413:
      return 'La solicitud es demasiado grande.';
    case 422:
      return 'Transicion invalida para la cita.';
    case 429:
      return 'Demasiadas solicitudes. Intenta mas tarde.';
    case 500:
      return 'Error interno del servidor.';
    default:
      return 'No se pudo completar la solicitud.';
  }
}

function buildHeaders(requiresOwnerAuth: boolean): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresOwnerAuth) {
    if (!OWNER_SECRET) {
      throw new HttpError(401, 'OWNER_SECRET no configurado en variables de entorno.');
    }
    headers.Authorization = `Bearer ${OWNER_SECRET}`;
  }

  return headers;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    requiresOwnerAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestUrl = `${API_BASE_URL}${path}`;

  console.info('[API REQUEST]', {
    endpoint: path,
    url: requestUrl,
    method,
    requiresOwnerAuth,
    ownerSecretConfigured: Boolean(OWNER_SECRET),
    body,
  });

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: buildHeaders(requiresOwnerAuth),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let payload: unknown;
    if (responseText) {
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        payload = undefined;
      }
    }

    if (!response.ok) {
      const errorPayload = (payload ?? {}) as ApiErrorBody;
      const message = errorPayload.error ?? mapStatusToMessage(response.status);
      throw new HttpError(response.status, message, errorPayload.details);
    }

    console.info('[API RESPONSE]', {
      endpoint: path,
      url: requestUrl,
      method,
      status: response.status,
      payload,
    });

    return payload as T;
  } catch (error) {
    if (error instanceof HttpError) {
      logApiError({ path, method, body, requiresOwnerAuth, error });
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Tiempo de espera agotado al conectar con el backend.');
      logApiError({ path, method, body, requiresOwnerAuth, error: timeoutError });
      throw timeoutError;
    }

    logApiError({ path, method, body, requiresOwnerAuth, error });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
