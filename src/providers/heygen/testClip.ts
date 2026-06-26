import { createHash } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { HeyGenProvider, HeyGenProviderError, redactHeyGenSecrets } from "./provider";
import type { HeyGenAvatarLook, HeyGenCreateVideoRequest, HeyGenVideo, HeyGenVoice } from "./types";

export const HEYGEN_TEST_TITLE = "Easy AI HeyGen Technical Test Clip";
export const HEYGEN_TEST_SCRIPT = "Easy AI helps your business spend less time on repetitive work and more time serving customers.";
export const HEYGEN_TEST_RESOLUTION = { width: 1280, height: 720 } as const;
export const HEYGEN_TEST_ASPECT_RATIO = "16:9" as const;
export const HEYGEN_TEST_OUTPUT_FORMAT = "mp4" as const;
export const HEYGEN_TEST_ENGINE = "v3";

export interface SelectedHeyGenTalent {
  avatar: HeyGenAvatarLook;
  voice: HeyGenVoice | null;
  reason: string;
}

export interface HeyGenTestManifest {
  title: string;
  script: string;
  status: "not_generated" | "completed" | "failed" | "timeout";
  technicalTest: true;
  finalCommercial: false;
  generatedAt: string | null;
  requestedResolution: typeof HEYGEN_TEST_RESOLUTION;
  expectedPaidVideoRequests: 1;
  videoRequestCount: number;
  videoId: string | null;
  videoSrc: string | null;
  durationSeconds: number | null;
  avatar: { id: string | null; name: string | null };
  voice: { id: string | null; name: string | null };
  selectionReason: string | null;
  failureReason: string | null;
}

const normalized = (value: string | null | undefined) => value?.toLowerCase() ?? "";
const isFemale = (value: string | null | undefined) => normalized(value).includes("female") || /\b(woman|anna|ava|jenny|sara|sarah|emily|emma|laura|lisa|kate|julia|jessica)\b/.test(normalized(value));
const isProfessional = (value: string | null | undefined) => /business|professional|office|presenter|corporate|casual/.test(normalized(value));
const supportsCurrentEngine = (avatar: HeyGenAvatarLook) => avatar.supportedApiEngines.length === 0 || avatar.supportedApiEngines.some((engine) => normalized(engine).includes("v3") || normalized(engine).includes("production"));
const supportsHorizontal = (avatar: HeyGenAvatarLook) => !avatar.dimensions?.width || !avatar.dimensions?.height || avatar.dimensions.width >= avatar.dimensions.height || avatar.dimensions.width >= 720;
const isActive = (status: string | null) => !status || /active|available|ready/.test(normalized(status));

export const assertPaidGenerationConfirmation = (confirmation: string | undefined): void => {
  if (confirmation !== "GENERATE") {
    throw new HeyGenProviderError("No paid generation occurred. To approve exactly one HeyGen test clip, rerun the workflow and type GENERATE exactly.");
  }
};

export const createHeyGenTestIdempotencyKey = (): string =>
  `easy-ai-heygen-test-${createHash("sha256")
    .update(JSON.stringify({ title: HEYGEN_TEST_TITLE, script: HEYGEN_TEST_SCRIPT, resolution: HEYGEN_TEST_RESOLUTION, outputFormat: HEYGEN_TEST_OUTPUT_FORMAT }))
    .digest("hex")
    .slice(0, 24)}`;

export const selectHeyGenTalent = (avatars: HeyGenAvatarLook[], voices: HeyGenVoice[]): SelectedHeyGenTalent => {
  const compatibleAvatars = avatars.filter((avatar) => isActive(avatar.status) && supportsCurrentEngine(avatar) && supportsHorizontal(avatar));
  const avatar =
    compatibleAvatars.find((candidate) => isFemale(candidate.gender) && candidate.defaultVoiceId && isProfessional(candidate.name)) ??
    compatibleAvatars.find((candidate) => isFemale(candidate.gender) && candidate.defaultVoiceId) ??
    compatibleAvatars.find((candidate) => isFemale(candidate.gender) || isFemale(candidate.name)) ??
    compatibleAvatars[0] ??
    avatars[0];

  if (!avatar) throw new HeyGenProviderError("No HeyGen avatar looks were returned for the test clip.");

  const defaultVoice = avatar.defaultVoiceId ? voices.find((voice) => voice.id === avatar.defaultVoiceId) ?? null : null;
  const warmAmericanFemaleVoice = voices.find((voice) => isFemale(voice.gender) && /en-us|english|american/.test(normalized(`${voice.language} ${voice.name}`)) && /warm|natural|professional|business|jenny|sara|sarah|emily|anna/.test(normalized(voice.name)));
  const femaleEnglishVoice = voices.find((voice) => isFemale(voice.gender) && /en-us|english|american/.test(normalized(`${voice.language} ${voice.name}`)));
  const englishVoice = voices.find((voice) => /en-us|english|american/.test(normalized(`${voice.language} ${voice.name}`)));
  const voice = defaultVoice ?? warmAmericanFemaleVoice ?? femaleEnglishVoice ?? englishVoice ?? voices[0] ?? null;

  return {
    avatar,
    voice,
    reason: defaultVoice ? "Selected a compatible professional avatar and its default voice." : "Selected the best compatible professional avatar and fallback voice.",
  };
};

export const buildHeyGenTestRequest = (selection: SelectedHeyGenTalent): HeyGenCreateVideoRequest => ({
  avatarId: selection.avatar.id,
  voiceId: selection.voice?.id,
  title: HEYGEN_TEST_TITLE,
  script: HEYGEN_TEST_SCRIPT,
  resolution: HEYGEN_TEST_RESOLUTION,
  aspectRatio: HEYGEN_TEST_ASPECT_RATIO,
  outputFormat: HEYGEN_TEST_OUTPUT_FORMAT,
  captions: false,
  engine: HEYGEN_TEST_ENGINE,
  idempotencyKey: createHeyGenTestIdempotencyKey(),
});

export const createPreviewManifest = (input: Partial<HeyGenTestManifest> = {}): HeyGenTestManifest => ({
  title: HEYGEN_TEST_TITLE,
  script: HEYGEN_TEST_SCRIPT,
  status: "not_generated",
  technicalTest: true,
  finalCommercial: false,
  generatedAt: null,
  requestedResolution: HEYGEN_TEST_RESOLUTION,
  expectedPaidVideoRequests: 1,
  videoRequestCount: 0,
  videoId: null,
  videoSrc: null,
  durationSeconds: null,
  avatar: { id: null, name: null },
  voice: { id: null, name: null },
  selectionReason: null,
  failureReason: null,
  ...input,
});

export const writePreviewManifest = async (manifest: HeyGenTestManifest, destination = "public/content/heygen-test-clip/manifest.json") => {
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`);
};

export const validateDownloadedMp4 = async (filePath: string): Promise<number> => {
  const info = await stat(filePath);
  if (info.size <= 0) throw new HeyGenProviderError("Downloaded HeyGen MP4 is empty.");
  return info.size;
};

export const safeFailure = (error: unknown): string => redactHeyGenSecrets(error instanceof Error ? error.message : String(error));

export const generateHeyGenTestClip = async (provider = new HeyGenProvider(), outputDir = "public/content/heygen-test-clip") => {
  const quota = await provider.getRemainingQuota();
  const avatars = (await provider.listAvatarLooks({ ownership: "public", limit: 20 })).looks;
  const voices = (await provider.listVoices({ limit: 50 })).voices;
  const selection = selectHeyGenTalent(avatars, voices);
  const request = buildHeyGenTestRequest(selection);
  const created = await provider.createVideo(request);
  const completed: HeyGenVideo = await provider.pollVideoUntilComplete(created.videoId);
  if (completed.status !== "completed" || !completed.videoUrl) throw new HeyGenProviderError("HeyGen completion response did not include a downloadable MP4 URL.");
  await mkdir(outputDir, { recursive: true });
  const videoPath = join(outputDir, "easy-ai-heygen-test.mp4");
  await provider.downloadCompletedVideo(completed.videoUrl, videoPath);
  await validateDownloadedMp4(videoPath);
  const manifest = createPreviewManifest({
    status: "completed",
    generatedAt: new Date().toISOString(),
    videoRequestCount: 1,
    videoId: created.videoId,
    videoSrc: "/easy-ai-video-factory/content/heygen-test-clip/easy-ai-heygen-test.mp4",
    avatar: { id: selection.avatar.id, name: selection.avatar.name },
    voice: { id: selection.voice?.id ?? null, name: selection.voice?.name ?? null },
    selectionReason: selection.reason,
  });
  await writePreviewManifest(manifest, join(outputDir, "manifest.json"));
  return { manifest, quota, requestHash: created.duplicateRequestHash };
};
