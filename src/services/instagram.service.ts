import { apiRequest } from './apiClient';
import type {
  InstagramCreateContainerInput,
  InstagramCreateContainerResponse,
  InstagramCreateContainerResult,
  InstagramMediaItem,
  InstagramMediaResponse,
  InstagramProfile,
  InstagramProfileResponse,
  InstagramPublishInput,
  InstagramPublishResponse,
  InstagramPublishResult,
  InstagramPublishingLimit,
  InstagramPublishingLimitResponse,
} from '../types/instagram.types';

export async function getInstagramProfile(): Promise<InstagramProfile> {
  const response = await apiRequest<InstagramProfileResponse>(
    '/api/owner/instagram/profile',
    { auth: 'owner' },
  );
  return response.profile;
}

export async function getInstagramMedia(limit = 10): Promise<InstagramMediaItem[]> {
  const response = await apiRequest<InstagramMediaResponse>(
    `/api/owner/instagram/media?limit=${encodeURIComponent(String(limit))}`,
    { auth: 'owner' },
  );
  return response.data;
}

export async function getInstagramPublishingLimit(): Promise<InstagramPublishingLimit> {
  const response = await apiRequest<InstagramPublishingLimitResponse>(
    '/api/owner/instagram/publishing-limit',
    { auth: 'owner' },
  );
  return response.publishingLimit;
}

export async function createInstagramMediaContainer(
  input: InstagramCreateContainerInput,
): Promise<InstagramCreateContainerResult> {
  const response = await apiRequest<InstagramCreateContainerResponse>(
    '/api/owner/instagram/media-container',
    {
      method: 'POST',
      auth: 'owner',
      body: input,
    },
  );
  return { creationId: response.creationId };
}

export async function publishInstagramMedia(
  input: InstagramPublishInput,
): Promise<InstagramPublishResult> {
  const response = await apiRequest<InstagramPublishResponse>(
    '/api/owner/instagram/publish',
    {
      method: 'POST',
      auth: 'owner',
      body: input,
    },
  );
  return { id: response.id };
}
