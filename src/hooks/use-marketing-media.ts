import { useCallback, useState } from 'react';
import {
  editMarketingMedia,
  generateMarketingMedia,
  getMarketingMedia,
  listMarketingMedia,
  prepareInstagramMarketingMedia,
  uploadMarketingMedia,
} from '../services/marketing-media.service';
import { isHttpError } from '../types/api';
import type {
  EditMarketingMediaRequest,
  GenerateMarketingMediaRequest,
  MarketingMedia,
  MarketingMediaHumanError,
  MarketingMediaResult,
  MarketingMediaStatus,
  MarketingMediaUploadFile,
  PrepareInstagramOptions,
} from '../types/marketing-media.types';

type MarketingMediaOperation = 'upload' | 'generate' | 'edit' | 'prepare' | 'default';

function defaultOperationMessage(operation: MarketingMediaOperation): string {
  switch (operation) {
    case 'generate':
      return 'No pudimos generar la imagen. Intenta nuevamente ajustando la descripción.';
    case 'edit':
      return 'No pudimos editar la imagen. Revisa la imagen y vuelve a intentarlo.';
    case 'upload':
      return 'No pudimos subir la imagen. Revisa que sea JPG, PNG o WebP y que pese menos de 10 MB.';
    case 'prepare':
      return 'No pudimos preparar la publicación. Intenta nuevamente en unos segundos.';
    default:
      return 'No pudimos completar la operación.';
  }
}

function mapMarketingMediaError(
  error: unknown,
  operation: MarketingMediaOperation = 'default',
): string {
  if (isHttpError(error)) {
    if (error.status === 400 || error.status === 422) {
      return defaultOperationMessage(operation);
    }
    if (error.status === 401) {
      return 'No autorizado. Inicia sesión nuevamente.';
    }
    if (error.status === 413) {
      return 'La imagen es demasiado grande. Usa una imagen menor a 10 MB.';
    }
    if (error.status === 429) {
      return 'Demasiados intentos. Espera unos minutos.';
    }
    if (error.status >= 500) {
      return defaultOperationMessage(operation);
    }

    return defaultOperationMessage(operation);
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('network')) {
      return 'Error de red. Revisa la conexión e intenta nuevamente.';
    }
    return defaultOperationMessage(operation);
  }

  return 'Error inesperado. Intenta nuevamente.';
}

function mapPrepareInstagramError(error: unknown): MarketingMediaHumanError {
  if (isHttpError(error)) {
    const message = error.message.toLowerCase();
    if (message.includes('story') && (message.includes('whatsapp') || message.includes('cta'))) {
      return {
        title: 'No pudimos preparar la historia',
        message: 'Las historias no admiten enlace de WhatsApp en este flujo.',
      };
    }
    if (message.includes('whatsapp') && (message.includes('config') || message.includes('phone'))) {
      return {
        title: 'No pudimos agregar WhatsApp',
        message: 'El enlace de WhatsApp no está configurado.',
      };
    }
  }

  return {
    title: 'No pudimos preparar la publicación',
    message: 'Intenta nuevamente en unos segundos.',
  };
}

export function useMarketingMedia() {
  const [mediaItems, setMediaItems] = useState<MarketingMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MarketingMediaResult | null>(null);
  const [preparedCreationId, setPreparedCreationId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [prepareError, setPrepareError] = useState<MarketingMediaHumanError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const listMedia = useCallback(async (limit = 10, status?: MarketingMediaStatus) => {
    setListLoading(true);
    setError(null);
    try {
      const media = await listMarketingMedia(limit, status);
      setMediaItems(media);
      return media;
    } catch (err: unknown) {
      setError(mapMarketingMediaError(err));
      return null;
    } finally {
      setListLoading(false);
    }
  }, []);

  const getMedia = useCallback(async (id: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const media = await getMarketingMedia(id);
      return media;
    } catch (err: unknown) {
      setError(mapMarketingMediaError(err));
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const uploadMedia = useCallback(async (
    uploadFile: MarketingMediaUploadFile,
    caption?: string,
  ) => {
    setUploadLoading(true);
    setError(null);
    setGenerationError(null);
    setEditError(null);
    setSelectedMedia(null);
    setPreparedCreationId(null);
    try {
      const uploaded = await uploadMarketingMedia(uploadFile, caption);
      setSelectedMedia(uploaded);
      await listMedia();
      return uploaded;
    } catch (err: unknown) {
      setError(mapMarketingMediaError(err, 'upload'));
      return null;
    } finally {
      setUploadLoading(false);
    }
  }, [listMedia]);

  const generateMedia = useCallback(async (
    payload: GenerateMarketingMediaRequest,
  ) => {
    setIsGenerating(true);
    setError(null);
    setGenerationError(null);
    setEditError(null);
    setSelectedMedia(null);
    setPreparedCreationId(null);
    try {
      const generated = await generateMarketingMedia(payload);
      setSelectedMedia(generated);
      await listMedia();
      return generated;
    } catch (err: unknown) {
      const message = mapMarketingMediaError(err, 'generate');
      setGenerationError(message);
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [listMedia]);

  const editMedia = useCallback(async (
    payload: EditMarketingMediaRequest,
  ) => {
    setIsEditing(true);
    setError(null);
    setGenerationError(null);
    setEditError(null);
    setSelectedMedia(null);
    setPreparedCreationId(null);
    try {
      const edited = await editMarketingMedia(payload);
      setSelectedMedia(edited);
      await listMedia();
      return edited;
    } catch (err: unknown) {
      const message = mapMarketingMediaError(err, 'edit');
      setEditError(message);
      setError(message);
      return null;
    } finally {
      setIsEditing(false);
    }
  }, [listMedia]);

  const prepareInstagramMedia = useCallback(async (
    mediaId?: number,
    options?: PrepareInstagramOptions,
  ) => {
    const targetMediaId = mediaId ?? selectedMedia?.mediaId;
    if (!targetMediaId) {
      setError('Primero crea o selecciona una imagen para prepararla.');
      return null;
    }

    setPrepareLoading(true);
    setError(null);
    setPrepareError(null);
    setPreparedCreationId(null);
    try {
      const prepared = await prepareInstagramMarketingMedia(targetMediaId, options);
      setPreparedCreationId(prepared.creationId);
      await listMedia();
      return prepared;
    } catch (err: unknown) {
      setPrepareError(mapPrepareInstagramError(err));
      return null;
    } finally {
      setPrepareLoading(false);
    }
  }, [listMedia, selectedMedia?.mediaId]);

  const resetMediaFlow = useCallback(() => {
    setSelectedMedia(null);
    setPreparedCreationId(null);
    setError(null);
    setPrepareError(null);
    setGenerationError(null);
    setEditError(null);
  }, []);

  const resetInstagramPreparation = useCallback(() => {
    setPreparedCreationId(null);
    setPrepareError(null);
    setError(null);
  }, []);

  const loading = uploadLoading || isGenerating || isEditing || listLoading || detailLoading || prepareLoading;

  return {
    mediaItems,
    selectedMedia,
    preparedCreationId,
    loading,
    uploadLoading,
    isGenerating,
    isEditing,
    listLoading,
    detailLoading,
    prepareLoading,
    prepareError,
    error,
    generationError,
    editError,
    uploadMedia,
    generateMedia,
    editMedia,
    listMedia,
    getMedia,
    prepareInstagramMedia,
    resetInstagramPreparation,
    resetMediaFlow,
  };
}
