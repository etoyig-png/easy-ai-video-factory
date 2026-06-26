export type HeyGenOwnership = "public" | "private";

export interface HeyGenQuota {
  remainingQuota: number | null;
  rawUnit: string | null;
}

export interface HeyGenListAvatarLooksOptions {
  ownership?: HeyGenOwnership;
  avatarType?: string;
  limit?: number;
  paginationToken?: string;
}

export interface HeyGenAvatarLook {
  id: string;
  name: string | null;
  groupId: string | null;
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  gender: string | null;
  defaultVoiceId: string | null;
  supportedApiEngines: string[];
  dimensions: { width: number | null; height: number | null } | null;
  status: string | null;
}

export interface HeyGenAvatarLookList {
  looks: HeyGenAvatarLook[];
  nextPaginationToken: string | null;
}

export interface HeyGenListVoicesOptions {
  limit?: number;
  paginationToken?: string;
}

export interface HeyGenVoice {
  id: string;
  name: string | null;
  language: string | null;
  gender: string | null;
  previewAudioUrl: string | null;
  supportInteractiveAvatar: boolean | null;
}

export interface HeyGenVoiceList {
  voices: HeyGenVoice[];
  nextPaginationToken: string | null;
}

export interface HeyGenCreateVideoRequest {
  avatarId: string;
  title?: string;
  script: string;
  voiceId?: string;
  resolution?: { width: number; height: number };
  aspectRatio?: "16:9" | "9:16" | "1:1";
  background?: unknown;
  captions?: boolean;
  outputFormat?: "mp4" | "webm";
  voiceSettings?: unknown;
  motionPrompt?: string;
  engine?: string;
  callbackUrl?: string;
  idempotencyKey?: string;
}

export type HeyGenVideoStatus = "pending" | "processing" | "completed" | "failed" | "unknown";

export interface HeyGenVideo {
  id: string;
  status: HeyGenVideoStatus;
  videoUrl: string | null;
  error: string | null;
}
