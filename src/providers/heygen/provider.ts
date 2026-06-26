import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import { z } from "zod";
import { getHeyGenConfig, type HeyGenConfig } from "./config";
import type {
  HeyGenAvatarLook,
  HeyGenAvatarLookList,
  HeyGenCreateVideoRequest,
  HeyGenListAvatarLooksOptions,
  HeyGenListVoicesOptions,
  HeyGenQuota,
  HeyGenVideo,
  HeyGenVoice,
  HeyGenVoiceList,
} from "./types";

const JsonRecordSchema = z.record(z.string(), z.unknown());
const IdSchema = z.union([z.string(), z.number()]).transform(String);

export class HeyGenProviderError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(redactHeyGenSecrets(message));
    this.name = "HeyGenProviderError";
  }
}

export const redactHeyGenSecrets = (message: string): string => {
  const apiKey = process.env.HEYGEN_API_KEY;
  return apiKey ? message.split(apiKey).join("[REDACTED]") : message;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const safeString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const safeNumber = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const safeBoolean = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);

const unwrapData = (json: unknown): unknown => {
  const record = JsonRecordSchema.parse(json);
  return record.data ?? record;
};

const queryString = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
};

const duplicateRequestHash = (request: HeyGenCreateVideoRequest): string =>
  createHash("sha256").update(JSON.stringify(request)).digest("hex");

export class HeyGenProvider {
  private readonly config: HeyGenConfig;

  constructor(config: HeyGenConfig = getHeyGenConfig()) {
    this.config = config;
  }

  async getRemainingQuota(): Promise<HeyGenQuota> {
    const data = JsonRecordSchema.parse(unwrapData(await this.request("/v2/user/remaining_quota")));
    return {
      remainingQuota: safeNumber(data.remaining_quota) ?? safeNumber(data.remainingQuota) ?? safeNumber(data.quota),
      rawUnit: safeString(data.unit) ?? safeString(data.quota_unit),
    };
  }

  async listAvatarLooks(options: HeyGenListAvatarLooksOptions = {}): Promise<HeyGenAvatarLookList> {
    const json = unwrapData(
      await this.request(
        `/v3/avatars/looks${queryString({
          ownership: options.ownership,
          avatar_type: options.avatarType,
          limit: options.limit,
          pagination_token: options.paginationToken,
        })}`,
      ),
    );
    const record = JsonRecordSchema.parse(json);
    const rawLooks = z.array(JsonRecordSchema).parse(record.avatar_looks ?? record.looks ?? []);
    return {
      looks: rawLooks.map(this.normalizeAvatarLook),
      nextPaginationToken: safeString(record.next_pagination_token) ?? safeString(record.nextPaginationToken),
    };
  }

  async listVoices(options: HeyGenListVoicesOptions = {}): Promise<HeyGenVoiceList> {
    const json = unwrapData(
      await this.request(`/v3/voices${queryString({ limit: options.limit, pagination_token: options.paginationToken })}`),
    );
    const record = JsonRecordSchema.parse(json);
    const rawVoices = z.array(JsonRecordSchema).parse(record.voices ?? []);
    return {
      voices: rawVoices.map(this.normalizeVoice),
      nextPaginationToken: safeString(record.next_pagination_token) ?? safeString(record.nextPaginationToken),
    };
  }

  async createVideo(request: HeyGenCreateVideoRequest): Promise<{ videoId: string; duplicateRequestHash: string }> {
    if (!this.config.generationEnabled) {
      throw new HeyGenProviderError("HeyGen paid video generation is disabled. Set HEYGEN_GENERATION_ENABLED=true server-side to enable it intentionally.");
    }

    const hash = duplicateRequestHash(request);
    const headers = request.idempotencyKey ? { "Idempotency-Key": request.idempotencyKey } : { "Idempotency-Key": hash };
    const data = JsonRecordSchema.parse(unwrapData(await this.request("/v3/videos", { method: "POST", body: request, extraHeaders: headers, paid: true })));
    const videoId = IdSchema.parse(data.video_id ?? data.id);
    return { videoId, duplicateRequestHash: hash };
  }

  async getVideo(videoId: string): Promise<HeyGenVideo> {
    const data = JsonRecordSchema.parse(unwrapData(await this.request(`/v3/videos/${encodeURIComponent(videoId)}`)));
    return {
      id: IdSchema.parse(data.video_id ?? data.id ?? videoId),
      status: this.normalizeVideoStatus(data.status),
      videoUrl: safeString(data.video_url) ?? safeString(data.url),
      error: safeString(data.error) ? redactHeyGenSecrets(String(data.error)) : null,
    };
  }

  async pollVideoUntilComplete(videoId: string, options: { pollIntervalMs?: number; maxPollDurationMs?: number } = {}): Promise<HeyGenVideo> {
    const started = Date.now();
    let interval = options.pollIntervalMs ?? this.config.pollIntervalMs;
    const maxDuration = options.maxPollDurationMs ?? this.config.maxPollDurationMs;

    while (Date.now() - started < maxDuration) {
      const video = await this.getVideo(videoId);
      if (video.status === "completed") return video;
      if (video.status === "failed") throw new HeyGenProviderError(video.error ?? "HeyGen video generation failed.");
      await sleep(interval);
      interval = Math.min(Math.round(interval * 1.5), 30000);
    }

    throw new HeyGenProviderError("Timed out while polling HeyGen video status.");
  }

  async downloadCompletedVideo(videoUrl: string, destination: string): Promise<void> {
    if (!videoUrl.startsWith("https://")) throw new HeyGenProviderError("Refusing to download a non-HTTPS HeyGen video URL.");
    const response = await fetch(videoUrl, { signal: AbortSignal.timeout(this.config.timeoutMs) });
    if (!response.ok) throw new HeyGenProviderError(`HeyGen video download failed with HTTP ${response.status}.`, response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, buffer);
  }

  private async request(path: string, options: { method?: "GET" | "POST"; body?: unknown; extraHeaders?: Record<string, string>; paid?: boolean } = {}): Promise<unknown> {
    const method = options.method ?? "GET";
    const attempts = options.paid && !options.extraHeaders?.["Idempotency-Key"] ? 1 : this.config.retryCount + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(`${this.config.baseUrl}${path}`, {
          method,
          headers: {
            "content-type": "application/json",
            "x-api-key": this.config.apiKey,
            ...options.extraHeaders,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        if (response.status === 429 && attempt < attempts) {
          await sleep(Math.min(1000 * attempt, 5000));
          continue;
        }

        if (!response.ok) {
          throw new HeyGenProviderError(`HeyGen request failed with HTTP ${response.status}.`, response.status);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt >= attempts) break;
        await sleep(250 * attempt);
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Unknown HeyGen provider error.";
    throw new HeyGenProviderError(message, lastError instanceof HeyGenProviderError ? lastError.status : undefined);
  }

  private normalizeAvatarLook(look: Record<string, unknown>): HeyGenAvatarLook {
    const dimensions = JsonRecordSchema.safeParse(look.dimensions).success ? (look.dimensions as Record<string, unknown>) : null;
    return {
      id: IdSchema.parse(look.id ?? look.avatar_id ?? look.look_id),
      name: safeString(look.name),
      groupId: safeString(look.group_id) ?? safeString(look.groupId),
      previewImageUrl: safeString(look.preview_image_url) ?? safeString(look.previewImageUrl),
      previewVideoUrl: safeString(look.preview_video_url) ?? safeString(look.previewVideoUrl),
      gender: safeString(look.gender),
      defaultVoiceId: safeString(look.default_voice_id) ?? safeString(look.defaultVoiceId),
      supportedApiEngines: z.array(z.string()).catch([]).parse(look.supported_api_engines ?? look.supportedApiEngines),
      dimensions: dimensions ? { width: safeNumber(dimensions.width), height: safeNumber(dimensions.height) } : null,
      status: safeString(look.status),
    };
  }

  private normalizeVoice(voice: Record<string, unknown>): HeyGenVoice {
    return {
      id: IdSchema.parse(voice.id ?? voice.voice_id),
      name: safeString(voice.name),
      language: safeString(voice.language) ?? safeString(voice.language_code),
      gender: safeString(voice.gender),
      previewAudioUrl: safeString(voice.preview_audio_url) ?? safeString(voice.previewAudioUrl),
      supportInteractiveAvatar: safeBoolean(voice.support_interactive_avatar),
    };
  }

  private normalizeVideoStatus(status: unknown) {
    if (status === "completed" || status === "failed" || status === "queued" || status === "pending" || status === "processing") return status;
    return "unknown";
  }
}
