// Instagram frontend contracts.
// The frontend never stores or receives Instagram access tokens.

export interface InstagramProfile {
  id: string;
  userId: string;
  username: string;
}

export interface InstagramProfileResponse {
  ok: true;
  profile: InstagramProfile;
}

export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  mediaType: InstagramMediaType;
  permalink: string;
  timestamp: string;
}

export interface InstagramMediaResponse {
  ok: true;
  data: InstagramMediaItem[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
  };
}

export interface InstagramPublishingLimit {
  quotaTotal: number;
  quotaDurationSeconds: number;
  quotaUsage: number;
}

export interface InstagramPublishingLimitResponse {
  ok: true;
  publishingLimit: InstagramPublishingLimit;
}

export interface InstagramCreateContainerInput {
  imageUrl: string;
  caption?: string;
}

export interface InstagramCreateContainerResult {
  creationId: string;
}

export interface InstagramCreateContainerResponse extends InstagramCreateContainerResult {
  ok: true;
}

export interface InstagramPublishInput {
  creationId: string;
}

export interface InstagramPublishResult {
  id: string;
}

export interface InstagramPublishResponse extends InstagramPublishResult {
  ok: true;
}
