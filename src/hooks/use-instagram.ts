import { useCallback, useState } from 'react';
import {
  createInstagramMediaContainer,
  getInstagramMedia,
  getInstagramProfile,
  getInstagramPublishingLimit,
  publishInstagramMedia,
} from '../services/instagram.service';
import { isHttpError } from '../types/api';
import type {
  InstagramMediaItem,
  InstagramProfile,
  InstagramPublishingLimit,
} from '../types/instagram.types';

export type InstagramAsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function hasText(value: string, text: string): boolean {
  return value.toLowerCase().includes(text);
}

function mapError(error: unknown): string {
  if (isHttpError(error)) {
    const message = error.message.trim();
    const lowerMessage = message.toLowerCase();

    if (error.status === 401) {
      return 'No autorizado. Inicia sesion nuevamente.';
    }
    if (error.status === 400 || error.status === 422) {
      return 'Hay un error de validacion. Revisa los datos e intenta otra vez.';
    }
    if (
      hasText(lowerMessage, 'not configured') ||
      hasText(lowerMessage, 'missing instagram') ||
      hasText(lowerMessage, 'instagram no configurado')
    ) {
      return 'Instagram no esta configurado para el negocio.';
    }
    if (
      hasText(lowerMessage, 'expired') ||
      hasText(lowerMessage, 'token') ||
      hasText(lowerMessage, 'oauth')
    ) {
      return 'La conexion de Instagram expiro. Revisa la configuracion antes de publicar.';
    }
    if (error.status >= 500) {
      return 'Instagram no pudo completar la operacion. Intenta nuevamente.';
    }

    return message || 'No se pudo completar la operacion.';
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network')) {
      return 'Error de red. Revisa la conexion e intenta nuevamente.';
    }
    return error.message;
  }

  return 'Error inesperado. Intenta nuevamente.';
}

export function useInstagram() {
  const [profileState, setProfileState] = useState<InstagramAsyncState<InstagramProfile>>({ status: 'idle' });
  const [mediaState, setMediaState] = useState<InstagramAsyncState<InstagramMediaItem[]>>({ status: 'idle' });
  const [limitState, setLimitState] = useState<InstagramAsyncState<InstagramPublishingLimit>>({ status: 'idle' });
  const [creationId, setCreationId] = useState<string | null>(null);
  const [containerLoading, setContainerLoading] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileState({ status: 'loading' });
    try {
      const data = await getInstagramProfile();
      setProfileState({ status: 'success', data });
    } catch (error) {
      setProfileState({ status: 'error', message: mapError(error) });
    }
  }, []);

  const loadMedia = useCallback(async (limit = 10) => {
    setMediaState({ status: 'loading' });
    try {
      const data = await getInstagramMedia(limit);
      setMediaState({ status: 'success', data });
    } catch (error) {
      setMediaState({ status: 'error', message: mapError(error) });
    }
  }, []);

  const loadPublishingLimit = useCallback(async () => {
    setLimitState({ status: 'loading' });
    try {
      const data = await getInstagramPublishingLimit();
      setLimitState({ status: 'success', data });
    } catch (error) {
      setLimitState({ status: 'error', message: mapError(error) });
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadMedia(), loadPublishingLimit()]);
  }, [loadProfile, loadMedia, loadPublishingLimit]);

  const createContainer = useCallback(async (imageUrl: string, caption: string) => {
    setContainerLoading(true);
    setContainerError(null);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishedId(null);
    setCreationId(null);
    try {
      const result = await createInstagramMediaContainer({
        imageUrl,
        caption: caption.trim() || undefined,
      });
      setCreationId(result.creationId);
    } catch (error) {
      setContainerError(mapError(error));
    } finally {
      setContainerLoading(false);
    }
  }, []);

  const publish = useCallback(async (): Promise<boolean> => {
    if (!creationId) return false;
    setPublishLoading(true);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishedId(null);
    try {
      const result = await publishInstagramMedia({ creationId });
      setPublishSuccess(true);
      setPublishedId(result.id);
      setCreationId(null);
      await loadMedia();
      return true;
    } catch (error) {
      setPublishError(mapError(error));
      return false;
    } finally {
      setPublishLoading(false);
    }
  }, [creationId, loadMedia]);

  const resetContainer = useCallback(() => {
    setCreationId(null);
    setContainerError(null);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishedId(null);
  }, []);

  return {
    profileState,
    mediaState,
    limitState,
    creationId,
    containerLoading,
    containerError,
    publishLoading,
    publishError,
    publishSuccess,
    publishedId,
    loadProfile,
    loadMedia,
    loadPublishingLimit,
    loadAll,
    createContainer,
    publish,
    resetContainer,
  };
}
