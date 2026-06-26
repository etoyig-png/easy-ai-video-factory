import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { assertPaidGenerationConfirmation, buildHeyGenTestRequest, createHeyGenTestIdempotencyKey, createPreviewManifest, generateHeyGenTestClip, selectHeyGenTalent, validateDownloadedMp4 } from "../src/providers/heygen";
import type { HeyGenAvatarLook, HeyGenConfig, HeyGenVoice } from "../src/providers/heygen";
import { HeyGenCreateVideoRequestSchema, HeyGenProvider, redactHeyGenSecrets } from "../src/providers/heygen/provider";

const avatar = (overrides: Partial<HeyGenAvatarLook> = {}): HeyGenAvatarLook => ({ id: "avatar-1", name: "Professional Ava", groupId: null, previewImageUrl: null, previewVideoUrl: null, gender: "female", defaultVoiceId: "voice-1", supportedApiEngines: ["v3"], dimensions: { width: 1280, height: 720 }, status: "active", ...overrides });
const voice = (overrides: Partial<HeyGenVoice> = {}): HeyGenVoice => ({ id: "voice-1", name: "Warm American Female", language: "en-US", gender: "female", previewAudioUrl: null, supportInteractiveAvatar: true, ...overrides });
const config = (overrides: Partial<HeyGenConfig> = {}): HeyGenConfig => ({ apiKey: "secret-test-key", baseUrl: "https://mock.heygen.test", timeoutMs: 100, retryCount: 0, pollIntervalMs: 1, maxPollDurationMs: 25, generationEnabled: true, ...overrides });

const mockFetch = (handler: (url: string, init: RequestInit) => Promise<Response> | Response) => {
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => handler(String(input), init ?? {})) as typeof fetch;
};

test("missing confirmation stops before paid generation", () => assert.throws(() => assertPaidGenerationConfirmation(undefined), /No paid generation occurred/));
test("incorrect confirmation stops before paid generation", () => assert.throws(() => assertPaidGenerationConfirmation("generate"), /GENERATE exactly/));
test("correct confirmation passes", () => assert.doesNotThrow(() => assertPaidGenerationConfirmation("GENERATE")));

test("missing HEYGEN_API_KEY is still rejected by default config", async () => {
  const previous = process.env.HEYGEN_API_KEY;
  delete process.env.HEYGEN_API_KEY;
  const { getHeyGenConfig } = await import("../src/providers/heygen/config");
  assert.throws(() => getHeyGenConfig(), /HEYGEN_API_KEY is missing/);
  process.env.HEYGEN_API_KEY = previous;
});

test("avatar-selection fallback chooses a compatible professional avatar", () => {
  const selected = selectHeyGenTalent([avatar({ id: "fallback", gender: null, defaultVoiceId: null })], [voice({ id: "voice-2" })]);
  assert.equal(selected.avatar.id, "fallback");
  assert.equal(selected.voice?.id, "voice-2");
});

test("voice-selection fallback chooses English voice when default voice is unavailable", () => {
  const selected = selectHeyGenTalent([avatar({ defaultVoiceId: "missing" })], [voice({ id: "english", gender: "male", name: "American Business", language: "en-US" })]);
  assert.equal(selected.voice?.id, "english");
});

test("voice-selection prefers avatar default voice by actual ID", () => {
  const selected = selectHeyGenTalent([avatar({ defaultVoiceId: "default-voice", name: "Maya" })], [voice({ id: "display-match", name: "Hope" }), voice({ id: "default-voice", name: "Different Display" })]);
  assert.equal(selected.avatar.id, "avatar-1");
  assert.equal(selected.voice?.id, "default-voice");
});

test("builds the minimal valid v3 create-video payload with avatar look ID and voice ID", () => {
  const request = buildHeyGenTestRequest(selectHeyGenTalent([avatar({ id: "look-id", name: "Maya" })], [voice({ id: "voice-id", name: "Hope" })]));
  assert.deepEqual(request, {
    type: "avatar",
    avatar_id: "look-id",
    title: "Easy AI HeyGen Technical Test Clip",
    script: "Easy AI helps your business spend less time on repetitive work and more time serving customers.",
    voice_id: "voice-id",
    resolution: "720p",
    aspect_ratio: "16:9",
    output_format: "mp4",
    idempotencyKey: createHeyGenTestIdempotencyKey(),
  });
  assert.equal(HeyGenCreateVideoRequestSchema.safeParse(request).success, true);
});

test("create-video schema rejects old resolution, width and height, and missing required fields", () => {
  const invalid = { avatar_id: "look-id", script: "hello", resolution: "1280x720", aspect_ratio: "4:3", output_format: "mp4", width: 1280, height: 720 };
  const result = HeyGenCreateVideoRequestSchema.safeParse(invalid);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.message, /type/);
    assert.match(result.error.message, /resolution/);
    assert.match(result.error.message, /aspect_ratio/);
    assert.match(result.error.message, /width/);
  }
});

test("generation disabled by default prevents paid POST", async () => {
  let calls = 0;
  mockFetch(() => { calls += 1; return Response.json({}); });
  await assert.rejects(() => new HeyGenProvider(config({ generationEnabled: false })).createVideo(buildHeyGenTestRequest(selectHeyGenTalent([avatar()], [voice()]))), /disabled/);
  assert.equal(calls, 0);
});

test("duplicate-request prevention uses a stable idempotency key", () => {
  const first = createHeyGenTestIdempotencyKey();
  const second = createHeyGenTestIdempotencyKey();
  assert.equal(first, second);
  assert.match(first, /^easy-ai-heygen-test-/);
});

test("successful queued-to-completed polling downloads and manifests the clip", async () => {
  const dir = await mkdtemp(join(tmpdir(), "heygen-test-"));
  let pollCount = 0;
  let paidPosts = 0;
  mockFetch((url, init) => {
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: { remaining_quota: 3, unit: "credits" } });
    if (url.includes("/v3/avatars/looks")) return Response.json({ data: { avatar_looks: [avatar()] } });
    if (url.includes("/v3/voices")) return Response.json({ data: { voices: [voice()] } });
    if (url.endsWith("/v3/videos") && init.method === "POST") { paidPosts += 1; assert.equal((init.headers as Record<string, string>)["Idempotency-Key"], createHeyGenTestIdempotencyKey()); assert.deepEqual(JSON.parse(String(init.body)), { type: "avatar", avatar_id: "avatar-1", title: "Easy AI HeyGen Technical Test Clip", script: "Easy AI helps your business spend less time on repetitive work and more time serving customers.", voice_id: "voice-1", resolution: "720p", aspect_ratio: "16:9", output_format: "mp4" }); return Response.json({ data: { video_id: "video-1" } }); }
    if (url.endsWith("/v3/videos/video-1")) { pollCount += 1; return Response.json({ data: pollCount < 2 ? { video_id: "video-1", status: "queued" } : { video_id: "video-1", status: "completed", video_url: "https://cdn.example.test/video.mp4" } }); }
    if (url === "https://cdn.example.test/video.mp4") return new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]));
    throw new Error(`unexpected ${url}`);
  });
  const result = await generateHeyGenTestClip(new HeyGenProvider(config()), dir);
  assert.equal(result.manifest.status, "completed");
  assert.equal(paidPosts, 1);
  await rm(dir, { recursive: true, force: true });
});

test("failed generation does not create another paid video", async () => {
  let paidPosts = 0;
  mockFetch((url, init) => {
    if (url.endsWith("/v3/videos") && init.method === "POST") { paidPosts += 1; return Response.json({ data: { video_id: "video-1" } }); }
    if (url.endsWith("/v3/videos/video-1")) return Response.json({ data: { video_id: "video-1", status: "failed", error: "safe failure" } });
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: {} });
    if (url.includes("avatars")) return Response.json({ data: { avatar_looks: [avatar()] } });
    if (url.includes("voices")) return Response.json({ data: { voices: [voice()] } });
    throw new Error("unexpected");
  });
  await assert.rejects(() => generateHeyGenTestClip(new HeyGenProvider(config()), join(tmpdir(), "unused")), /safe failure/);
  assert.equal(paidPosts, 1);
});

test("HTTP 400 reports safe diagnostics, no video created, and does not retry", async () => {
  let paidPosts = 0;
  process.env.HEYGEN_API_KEY = "secret-test-key";
  mockFetch((url, init) => {
    if (url.endsWith("/v3/videos") && init.method === "POST") {
      paidPosts += 1;
      return Response.json({ code: "invalid_parameter", message: "bad resolution secret-test-key", field: "resolution" }, { status: 400 });
    }
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: {} });
    if (url.includes("avatars")) return Response.json({ data: { avatar_looks: [avatar()] } });
    if (url.includes("voices")) return Response.json({ data: { voices: [voice()] } });
    throw new Error("unexpected");
  });
  await assert.rejects(() => generateHeyGenTestClip(new HeyGenProvider(config({ retryCount: 3 })), join(tmpdir(), "unused")), (error) => {
    assert(error instanceof Error);
    assert.match(error.message, /HTTP 400/);
    assert.match(error.message, /invalid_parameter/);
    assert.match(error.message, /Safe invalid fields: resolution/);
    assert.match(error.message, /Video ID returned: no/);
    assert.match(error.message, /No HeyGen video was created/);
    assert.doesNotMatch(error.message, /secret-test-key/);
    return true;
  });
  assert.equal(paidPosts, 1);
});

test("parsing failure stops before POST /v3/videos", async () => {
  let paidPosts = 0;
  mockFetch((url, init) => {
    if (url.endsWith("/v3/videos") && init.method === "POST") paidPosts += 1;
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: {} });
    if (url.includes("avatars")) return Response.json({ data: { not_avatar_looks: [] } });
    if (url.includes("voices")) return Response.json({ data: [voice()] });
    return Response.json({});
  });
  await assert.rejects(() => generateHeyGenTestClip(new HeyGenProvider(config()), join(tmpdir(), "unused")), /Invalid HeyGen avatar looks response/);
  assert.equal(paidPosts, 0);
});

test("Generate HeyGen workflow fails generation and skips placeholder deploy", async () => {
  const workflow = await readFile(".github/workflows/generate-heygen-test.yml", "utf8");
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
  assert.match(workflow, /Record generation outcome[\s\S]*if: always\(\)/);
  assert.match(workflow, /Verify generated clip manifest before preview build/);
  assert.match(workflow, /manifest\.status !== 'completed'/);
  assert.match(workflow, /manifest\.videoRequestCount !== 1/);
  assert.match(workflow, /video\.size <= 0/);
  assert.match(workflow, /refusing to build or deploy placeholder preview/);
  assert.match(workflow, /needs: build-and-generate/);
});

test("timeout is surfaced", async () => {
  mockFetch((url, init) => {
    if (url.endsWith("/v3/videos") && init.method === "POST") return Response.json({ data: { video_id: "video-1" } });
    if (url.endsWith("/v3/videos/video-1")) return Response.json({ data: { video_id: "video-1", status: "processing" } });
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: {} });
    if (url.includes("avatars")) return Response.json({ data: { avatar_looks: [avatar()] } });
    if (url.includes("voices")) return Response.json({ data: { voices: [voice()] } });
    throw new Error("unexpected");
  });
  await assert.rejects(() => generateHeyGenTestClip(new HeyGenProvider(config({ maxPollDurationMs: 1 })), join(tmpdir(), "unused")), /Timed out/);
});

test("malformed completion response is rejected", async () => {
  mockFetch((url, init) => {
    if (url.endsWith("/v3/videos") && init.method === "POST") return Response.json({ data: { video_id: "video-1" } });
    if (url.endsWith("/v3/videos/video-1")) return Response.json({ data: { video_id: "video-1", status: "completed" } });
    if (url.endsWith("/v2/user/remaining_quota")) return Response.json({ data: {} });
    if (url.includes("avatars")) return Response.json({ data: { avatar_looks: [avatar()] } });
    if (url.includes("voices")) return Response.json({ data: { voices: [voice()] } });
    throw new Error("unexpected");
  });
  await assert.rejects(() => generateHeyGenTestClip(new HeyGenProvider(config()), join(tmpdir(), "unused")), /downloadable MP4 URL/);
});

test("safe secret redaction", () => { process.env.HEYGEN_API_KEY = "secret-test-key"; assert.equal(redactHeyGenSecrets("secret-test-key leaked"), "[REDACTED] leaked"); });

test("preview manifest generation and MP4 validation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "heygen-manifest-"));
  const file = join(dir, "clip.mp4");
  await writeFile(file, Buffer.from([1]));
  assert.equal(await validateDownloadedMp4(file), 1);
  const manifest = createPreviewManifest({ status: "completed", videoRequestCount: 1 });
  assert.equal(manifest.expectedPaidVideoRequests, 1);
  const manifestPath = join(dir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  assert.equal(JSON.parse(await readFile(manifestPath, "utf8")).status, "completed");
  await rm(dir, { recursive: true, force: true });
});
