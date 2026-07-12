export type MarketingMediaStatus =
  | 'draft'
  | 'uploaded'
  | 'stored'
  | 'prepared'
  | 'published'
  | 'failed';

export type MarketingMediaMimeType = 'image/jpeg' | 'image/png' | 'image/webp';
export type MarketingMediaSourceType =
  | 'uploaded'
  | 'ai_generated'
  | 'ai_edited_from_reference'
  | 'external_url';

export interface MarketingMedia {
  id: number;
  ownerId: string;
  businessId: string | null;
  sourceType: MarketingMediaSourceType;
  status: MarketingMediaStatus;
  prompt: string | null;
  caption: string | null;
  privateStoragePath: string | null;
  publicStoragePath: string | null;
  publicUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  provider: string | null;
  referenceMediaId: number | null;
  instagramCreationId: string | null;
  instagramMediaId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingMediaUploadResult {
  mediaId: number;
  status: 'stored';
  publicUrl: string;
  caption: string | null;
  sourceType: MarketingMediaSourceType;
  mimeType: MarketingMediaMimeType;
  sizeBytes: number;
}

export interface MarketingMediaUploadResponse extends MarketingMediaUploadResult {
  ok: true;
}

export interface GenerateMarketingMediaRequest {
  prompt: string;
  caption?: string;
  style?: string;
}

export interface EditMarketingMediaRequest {
  file: File;
  prompt: string;
  caption?: string;
  style?: string;
}

export interface MarketingMediaResponse {
  ok: boolean;
  mediaId: number;
  status: 'stored';
  publicUrl?: string;
  caption?: string | null;
  sourceType: MarketingMediaSourceType;
  mimeType?: MarketingMediaMimeType;
  sizeBytes?: number;
}

export type MarketingMediaResult = MarketingMediaUploadResult;

export interface MarketingMediaListResponse {
  ok: true;
  data: MarketingMedia[];
}

export interface MarketingMediaGetResponse {
  ok: true;
  media: MarketingMedia;
}

export interface PrepareInstagramMediaResult {
  mediaId: number;
  status: 'prepared';
  creationId: string;
}

export interface PrepareInstagramMediaResponse extends PrepareInstagramMediaResult {
  ok: true;
}

export interface MarketingMediaUploadFile {
  file: Blob;
  fileName: string;
  mimeType: MarketingMediaMimeType;
}

export const MARKETING_MEDIA_ALLOWED_MIME_TYPES: readonly MarketingMediaMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MARKETING_MEDIA_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MARKETING_MEDIA_MAX_CAPTION_LENGTH = 2200;
