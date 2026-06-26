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

export const HeyGenCreateVideoRequestSchema = z
  .object({
    type: z.literal("avatar"),
    avatar_id: z.string().min(1),
    title: z.string().min(1),
    script: z.string().min(1),
    voice_id: z.string().min(1).optional(),
    resolution: z.enum(["720p", "1080p", "4k"]),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]),
    output_format: z.enum(["mp4", "webm"]),
    idempotencyKey: z.string().min(1).optional(),
  })
  .strict();

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

const describeTopLevel = (value: unknown): { kind: "array" | "object" | "other"; keys: string[]; itemCount: number | null } => {
  if (Array.isArray(value)) return { kind: "array", keys: [], itemCount: value.length };
  if (value && typeof value === "object") return { kind: "object", keys: Object.keys(value as Record<string, unknown>).sort(), itemCount: null };
  return { kind: "other", keys: [], itemCount: null };
};

const formatSafeValidationFailure = (endpointName: string, value: unknown, error: unknown): string => {
  const details = describeTopLevel(value);
  const zodSummary = error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ") : "schema validation failed";
  return `Invalid HeyGen ${endpointName} response (${zodSummary}). Top-level type: ${details.kind}; safe top-level keys: ${details.keys.join(", ") || "none"}; item count: ${details.itemCount ?? "n/a"}.`;
};

const parseRecord = (endpointName: string, value: unknown): Record<string, unknown> => {
  const result = JsonRecordSchema.safeParse(value);
  if (!result.success) throw new HeyGenProviderError(formatSafeValidationFailure(endpointName, value, result.error));
  return result.data;
};

const parseRecordArray = (endpointName: string, value: unknown): Record<string, unknown>[] => {
  const result = z.array(JsonRecordSchema).safeParse(value);
  if (!result.success) throw new HeyGenProviderError(formatSafeValidationFailure(endpointName, value, result.error));
  return result.data;
};

const unwrapData = (endpointName: string, json: unknown): unknown => parseRecord(endpointName, json).data ?? json;

const normalizeListEnvelope = (endpointName: string, json: unknown, legacyKeys: string[]): { items: Record<string, unknown>[]; nextPaginationToken?: string } => {
  if (Array.isArray(json)) return { items: parseRecordArray(endpointName, json) };

  const record = parseRecord(endpointName, json);
  const directData = record.data;
  if (Array.isArray(directData)) {
    return { items: parseRecordArray(endpointName, directData), nextPaginationToken: safeString(record.next_token) ?? safeString(record.next_pagination_token) ?? safeString(record.nextPaginationToken) ?? undefined };
  }

  if (directData && typeof directData === "object" && !Array.isArray(directData)) {
    const nested = parseRecord(endpointName, directData);
    for (const key of legacyKeys) {
      if (Array.isArray(nested[key])) return { items: parseRecordArray(endpointName, nested[key]), nextPaginationToken: safeString(nested.next_pagination_token) ?? safeString(nested.nextPaginationToken) ?? safeString(record.next_token) ?? undefined };
    }
  }

  for (const key of legacyKeys) {
    if (Array.isArray(record[key])) return { items: parseRecordArray(endpointName, record[key]), nextPaginationToken: safeString(record.next_pagination_token) ?? safeString(record.nextPaginationToken) ?? safeString(record.next_token) ?? undefined };
  }

  throw new HeyGenProviderError(formatSafeValidationFailure(endpointName, json, new Error(`missing expected list array (${["data", ...legacyKeys].join("/")})`)));
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

const createVideoPayload = (request: HeyGenCreateVideoRequest): Omit<HeyGenCreateVideoRequest, "idempotencyKey"> => {
  const result = HeyGenCreateVideoRequestSchema.safeParse(request);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "<root>").join(", ");
    throw new HeyGenProviderError(`Invalid outgoing HeyGen create-video request. Invalid fields: ${fields}.`);
  }
  return {
    type: result.data.type,
    avatar_id: result.data.avatar_id,
    title: result.data.title,
    script: result.data.script,
    voice_id: result.data.voice_id,
    resolution: result.data.resolution,
    aspect_ratio: result.data.aspect_ratio,
    output_format: result.data.output_format,
  };
};

const safeHeyGenErrorDetails = (status: number, body: unknown): string => {
  const root = JsonRecordSchema.safeParse(body).success ? (body as Record<string, unknown>) : {};
  const data = JsonRecordSchema.safeParse(root.data).success ? (root.data as Record<string, unknown>) : {};
  const error = JsonRecordSchema.safeParse(root.error).success ? (root.error as Record<string, unknown>) : {};
  const details = JsonRecordSchema.safeParse(error.details ?? data.details ?? root.details).success ? ((error.details ?? data.details ?? root.details) as Record<string, unknown>) : {};
  const invalidFields = [root.field, root.param, data.field, data.param, error.field, error.param, details.field, details.param]
    .filter((value): value is string => typeof value === "string" && /^[A-Za-z0-9_.-]+$/.test(value));
  const code = safeString(root.code) ?? safeString(data.code) ?? safeString(error.code);
  const message = safeString(root.message) ?? safeString(data.message) ?? safeString(error.message) ?? safeString(root.error);
  const videoId = safeString(root.video_id) ?? safeString(data.video_id) ?? safeString(root.id) ?? safeString(data.id);
  return redactHeyGenSecrets([
    `HeyGen request failed with HTTP ${status}.`,
    code ? `HeyGen error code: ${code}.` : null,
    message ? `HeyGen error message: ${message}.` : null,
    invalidFields.length > 0 ? `Safe invalid fields: ${[...new Set(invalidFields)].join(", ")}.` : null,
    `Video ID returned: ${videoId ? "yes" : "no"}.`,
    status === 400 && !videoId ? "No HeyGen video was created." : null,
  ].filter(Boolean).join(" "));
};

export class HeyGenProvider {
  private readonly config: HeyGenConfig;

  constructor(config: HeyGenConfig = getHeyGenConfig()) {
    this.config = config;
  }

  async getRemainingQuota(): Promise<HeyGenQuota> {
    const data = parseRecord("remaining quota", unwrapData("remaining quota", await this.request("/v2/user/remaining_quota")));
    return {
      remainingQuota: safeNumber(data.remaining_quota) ?? safeNumber(data.remainingQuota) ?? safeNumber(data.quota),
      rawUnit: safeString(data.unit) ?? safeString(data.quota_unit),
    };
  }

  async listAvatarLooks(options: HeyGenListAvatarLooksOptions = {}): Promise<HeyGenAvatarLookList> {
    const json = await this.request(
      `/v3/avatars/looks${queryString({
        ownership: options.ownership,
        avatar_type: options.avatarType,
        limit: options.limit,
        pagination_token: options.paginationToken,
      })}`,
    );
    const list = normalizeListEnvelope("avatar looks", json, ["avatar_looks", "looks"]);
    try {
      return {
        looks: list.items.map(this.normalizeAvatarLook),
        nextPaginationToken: list.nextPaginationToken ?? null,
      };
    } catch (error) {
      throw new HeyGenProviderError(formatSafeValidationFailure("avatar looks", json, error));
    }
  }

  async listVoices(options: HeyGenListVoicesOptions = {}): Promise<HeyGenVoiceList> {
    const json = await this.request(`/v3/voices${queryString({ limit: options.limit, pagination_token: options.paginationToken })}`);
    const list = normalizeListEnvelope("voices", json, ["voices"]);
    try {
      return {
        voices: list.items.map(this.normalizeVoice),
        nextPaginationToken: list.nextPaginationToken ?? null,
      };
    } catch (error) {
      throw new HeyGenProviderError(formatSafeValidationFailure("voices", json, error));
    }
  }

  async createVideo(request: HeyGenCreateVideoRequest): Promise<{ videoId: string; duplicateRequestHash: string }> {
    if (!this.config.generationEnabled) {
      throw new HeyGenProviderError("HeyGen paid video generation is disabled. Set HEYGEN_GENERATION_ENABLED=true server-side to enable it intentionally.");
    }

    const payload = createVideoPayload(request);
    const hash = duplicateRequestHash(request);
    const headers = request.idempotencyKey ? { "Idempotency-Key": request.idempotencyKey } : { "Idempotency-Key": hash };
    const data = parseRecord("create video", unwrapData("create video", await this.request("/v3/videos", { method: "POST", body: payload, extraHeaders: headers, paid: true })));
    const videoId = IdSchema.parse(data.video_id ?? data.id);
    return { videoId, duplicateRequestHash: hash };
  }

  async getVideo(videoId: string): Promise<HeyGenVideo> {
    const data = parseRecord("video status", unwrapData("video status", await this.request(`/v3/videos/${encodeURIComponent(videoId)}`)));
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
    const attempts = options.paid ? 1 : this.config.retryCount + 1;
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
          let body: unknown = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }
          throw new HeyGenProviderError(safeHeyGenErrorDetails(response.status, body), response.status);
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
