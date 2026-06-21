import { API_BASE_URL } from '../config/api';
import type { ApiErrorBody } from '../types/api';
import { HttpError } from '../types/api';
import { getClientToken, getOwnerToken } from '../utils/tokenStorage';

export type ApiAuthMode = 'none' | 'owner' | 'client';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: ApiAuthMode;
  /** @deprecated Use auth: 'owner'. Kept while existing owner services migrate. */
  requiresOwnerAuth?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10000;

let onUnauthorizedCallback:
  | ((auth: Exclude<ApiAuthMode, 'none'>) => void)
  | null = null;

export function setOnUnauthorized(
  callback: (auth: Exclude<ApiAuthMode, 'none'>) => void,
): void {
  onUnauthorizedCallback = callback;
}

async function buildHeaders(auth: ApiAuthMode): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth !== 'none') {
    const token = auth === 'owner'
      ? await getOwnerToken()
      : await getClientToken();

    if (!token) {
      throw new HttpError(401, 'No hay sesión activa. Inicia sesión para continuar.');
    }

    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function logApiError(params: {
  path: string;
  method: string;
  auth: ApiAuthMode;
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
          }
        : params.error;

  // Never log request bodies, authorization headers, tokens, OTPs or passwords.
  console.error('[API ERROR]', {
    endpoint: params.path,
    url: `${API_BASE_URL}${params.path}`,
    method: params.method,
    auth: params.auth,
    error: errorInfo,
  });
}

function mapStatusToMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Revisa los datos ingresados.';
    case 401:
      return 'Código o credenciales inválidas.';
    case 404:
      return 'Recurso no encontrado.';
    case 409:
      return 'El acceso ya fue configurado. Intenta iniciar sesión.';
    case 413:
      return 'La solicitud es demasiado grande.';
    case 422:
      return 'No se puede completar esta acción.';
    case 429:
      return 'Demasiados intentos. Espera unos minutos.';
    case 500:
      return 'No pudimos completar la solicitud.';
    default:
      return 'No se pudo completar la solicitud.';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth: requestedAuth,
    requiresOwnerAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const auth: ApiAuthMode =
    requestedAuth ?? (requiresOwnerAuth ? 'owner' : 'none');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestUrl = `${API_BASE_URL}${path}`;

  console.info('[API REQUEST]', {
    endpoint: path,
    url: requestUrl,
    method,
    auth,
    hasBody: body !== undefined,
  });

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: await buildHeaders(auth),
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
      const httpError = new HttpError(
        response.status,
        message,
        errorPayload.details,
      );

      if (response.status === 401 && auth !== 'none' && onUnauthorizedCallback) {
        onUnauthorizedCallback(auth);
      }

      throw httpError;
    }

    console.info('[API RESPONSE]', {
      endpoint: path,
      url: requestUrl,
      method,
      status: response.status,
    });

    return payload as T;
  } catch (error) {
    if (error instanceof HttpError) {
      logApiError({ path, method, auth, error });
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(
        'Tiempo de espera agotado al conectar con el backend.',
      );
      logApiError({ path, method, auth, error: timeoutError });
      throw timeoutError;
    }

    logApiError({ path, method, auth, error });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
