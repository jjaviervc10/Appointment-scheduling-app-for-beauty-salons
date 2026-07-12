import { apiRequest } from './apiClient';
import type {
  EditMarketingMediaRequest,
  GenerateMarketingMediaRequest,
  MarketingMedia,
  MarketingMediaGetResponse,
  MarketingMediaListResponse,
  MarketingMediaResponse,
  MarketingMediaResult,
  MarketingMediaStatus,
  MarketingMediaUploadFile,
  MarketingMediaUploadResponse,
  PrepareInstagramMediaResponse,
  PrepareInstagramMediaResult,
} from '../types/marketing-media.types';

export async function uploadMarketingMedia(
  uploadFile: MarketingMediaUploadFile,
  caption?: string,
): Promise<MarketingMediaResult> {
  const formData = new FormData();
  formData.append('file', uploadFile.file, uploadFile.fileName);

  const trimmedCaption = caption?.trim();
  if (trimmedCaption) {
    formData.append('caption', trimmedCaption);
  }

  const response = await apiRequest<MarketingMediaUploadResponse>(
    '/api/owner/marketing/media/upload',
    {
      method: 'POST',
      auth: 'owner',
      body: formData,
      timeoutMs: 30000,
    },
  );

  return {
    mediaId: response.mediaId,
    status: response.status,
    publicUrl: response.publicUrl,
    caption: response.caption,
    sourceType: response.sourceType ?? 'uploaded',
    mimeType: response.mimeType,
    sizeBytes: response.sizeBytes,
  };
}

export async function generateMarketingMedia(
  payload: GenerateMarketingMediaRequest,
): Promise<MarketingMediaResult> {
  const response = await apiRequest<MarketingMediaResponse>(
    '/api/owner/marketing/media/generate',
    {
      method: 'POST',
      auth: 'owner',
      body: payload,
      timeoutMs: 90000,
    },
  );

  return {
    mediaId: response.mediaId,
    status: response.status,
    publicUrl: response.publicUrl ?? '',
    caption: response.caption ?? null,
    sourceType: response.sourceType,
    mimeType: response.mimeType ?? 'image/png',
    sizeBytes: response.sizeBytes ?? 0,
  };
}

export async function editMarketingMedia(
  payload: EditMarketingMediaRequest,
): Promise<MarketingMediaResult> {
  const formData = new FormData();
  formData.append('file', payload.file, payload.file.name || 'reference-image');
  formData.append('prompt', payload.prompt);

  const trimmedCaption = payload.caption?.trim();
  if (trimmedCaption) {
    formData.append('caption', trimmedCaption);
  }

  const trimmedStyle = payload.style?.trim();
  if (trimmedStyle) {
    formData.append('style', trimmedStyle);
  }

  const response = await apiRequest<MarketingMediaResponse>(
    '/api/owner/marketing/media/edit',
    {
      method: 'POST',
      auth: 'owner',
      body: formData,
      timeoutMs: 90000,
    },
  );

  return {
    mediaId: response.mediaId,
    status: response.status,
    publicUrl: response.publicUrl ?? '',
    caption: response.caption ?? null,
    sourceType: response.sourceType,
    mimeType: response.mimeType ?? 'image/png',
    sizeBytes: response.sizeBytes ?? 0,
  };
}

export async function listMarketingMedia(
  limit = 10,
  status?: MarketingMediaStatus,
): Promise<MarketingMedia[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) {
    query.set('status', status);
  }

  const response = await apiRequest<MarketingMediaListResponse>(
    `/api/owner/marketing/media?${query.toString()}`,
    { auth: 'owner' },
  );

  return response.data;
}

export async function getMarketingMedia(id: number): Promise<MarketingMedia> {
  const response = await apiRequest<MarketingMediaGetResponse>(
    `/api/owner/marketing/media/${encodeURIComponent(String(id))}`,
    { auth: 'owner' },
  );

  return response.media;
}

export async function prepareInstagramMarketingMedia(
  id: number,
): Promise<PrepareInstagramMediaResult> {
  const response = await apiRequest<PrepareInstagramMediaResponse>(
    `/api/owner/marketing/media/${encodeURIComponent(String(id))}/prepare-instagram`,
    {
      method: 'POST',
      auth: 'owner',
    },
  );

  return {
    mediaId: response.mediaId,
    status: response.status,
    creationId: response.creationId,
  };
}
