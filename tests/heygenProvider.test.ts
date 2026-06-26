import assert from "node:assert/strict";
import test from "node:test";
import { HeyGenProvider, HeyGenProviderError, redactHeyGenSecrets } from "../src/providers/heygen";
import type { HeyGenConfig } from "../src/providers/heygen";

const config = (overrides: Partial<HeyGenConfig> = {}): HeyGenConfig => ({
  apiKey: "test-secret-key",
  baseUrl: "https://mock.heygen.test",
  timeoutMs: 100,
  retryCount: 0,
  pollIntervalMs: 10,
  maxPollDurationMs: 50,
  generationEnabled: false,
  ...overrides,
});

const mockFetch = (handler: (url: string, init: RequestInit) => Promise<Response> | Response) => {
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => handler(String(input), init ?? {})) as typeof fetch;
};

test("successful authentication sends only x-api-key and normalizes quota", async () => {
  mockFetch((url, init) => {
    assert.equal(url, "https://mock.heygen.test/v2/user/remaining_quota");
    assert.equal((init.headers as Record<string, string>)["x-api-key"], "test-secret-key");
    return Response.json({ data: { remaining_quota: 12, unit: "credits" } });
  });
  const quota = await new HeyGenProvider(config()).getRemainingQuota();
  assert.deepEqual(quota, { remainingQuota: 12, rawUnit: "credits" });
});

test("missing HEYGEN_API_KEY fails closed", async () => {
  const previous = process.env.HEYGEN_API_KEY;
  delete process.env.HEYGEN_API_KEY;
  const { getHeyGenConfig } = await import("../src/providers/heygen/config");
  assert.throws(() => getHeyGenConfig(), /HEYGEN_API_KEY is missing/);
  process.env.HEYGEN_API_KEY = previous;
});

test("invalid key returns a safe unauthorized error", async () => {
  mockFetch(() => new Response(JSON.stringify({ message: "bad" }), { status: 401 }));
  await assert.rejects(() => new HeyGenProvider(config()).getRemainingQuota(), (error) => {
    assert(error instanceof HeyGenProviderError);
    assert.equal(error.status, 401);
    assert.match(error.message, /HTTP 401/);
    return true;
  });
});

test("normalizes avatar-list response", async () => {
  mockFetch((url) => {
    assert.match(url, /ownership=public/);
    assert.match(url, /limit=1/);
    return Response.json({ data: { avatar_looks: [{ id: "avatar-1", name: "Ava", group_id: "group", preview_image_url: "https://example.test/a.png", preview_video_url: "https://example.test/a.mp4", gender: "female", default_voice_id: "voice-1", supported_api_engines: ["v3"], dimensions: { width: 1080, height: 1920 }, status: "active" }], next_pagination_token: "next" } });
  });
  const result = await new HeyGenProvider(config()).listAvatarLooks({ ownership: "public", limit: 1 });
  assert.equal(result.looks[0]?.id, "avatar-1");
  assert.equal(result.looks[0]?.dimensions?.height, 1920);
  assert.equal(result.nextPaginationToken, "next");
});

test("normalizes voice-list response", async () => {
  mockFetch(() => Response.json({ data: { voices: [{ voice_id: "voice-1", name: "Voice", language_code: "en-US", gender: "female", preview_audio_url: "https://example.test/v.mp3", support_interactive_avatar: true }] } }));
  const result = await new HeyGenProvider(config()).listVoices({ limit: 1 });
  assert.equal(result.voices[0]?.id, "voice-1");
  assert.equal(result.voices[0]?.language, "en-US");
});

test("normalizes official v3 avatar response envelope with data array", async () => {
  mockFetch(() => Response.json({ data: [{ id: "avatar-official", name: "Official Ava", default_voice_id: "voice-1", supported_api_engines: [] }], has_more: false, next_token: null }));
  const result = await new HeyGenProvider(config()).listAvatarLooks();
  assert.equal(result.looks[0]?.id, "avatar-official");
  assert.deepEqual(result.looks[0]?.supportedApiEngines, []);
});

test("normalizes official v3 voice response envelope with data array", async () => {
  mockFetch(() => Response.json({ data: [{ voice_id: "voice-official", name: "Official Voice", language: "en-US", gender: "female" }], has_more: false, next_token: null }));
  const result = await new HeyGenProvider(config()).listVoices();
  assert.equal(result.voices[0]?.id, "voice-official");
});

test("normalizes already-unwrapped avatar arrays", async () => {
  mockFetch(() => Response.json([{ id: "avatar-array", name: "Array Ava", supported_api_engines: ["v3"] }]));
  const result = await new HeyGenProvider(config()).listAvatarLooks();
  assert.equal(result.looks[0]?.id, "avatar-array");
});

test("normalizes already-unwrapped voice arrays", async () => {
  mockFetch(() => Response.json([{ voice_id: "voice-array", name: "Array Voice", language: "en-US", gender: "male" }]));
  const result = await new HeyGenProvider(config()).listVoices();
  assert.equal(result.voices[0]?.id, "voice-array");
});

test("malformed list response reports safe diagnostics only", async () => {
  process.env.HEYGEN_API_KEY = "test-secret-key";
  mockFetch(() => Response.json({ data: { private_url: "https://secret.example.test/file", api_key: "test-secret-key" } }));
  await assert.rejects(() => new HeyGenProvider(config()).listVoices(), (error) => {
    assert(error instanceof HeyGenProviderError);
    assert.match(error.message, /Invalid HeyGen voices response/);
    assert.match(error.message, /Top-level type: object/);
    assert.match(error.message, /safe top-level keys: data/);
    assert.doesNotMatch(error.message, /secret\.example/);
    assert.doesNotMatch(error.message, /test-secret-key/);
    return true;
  });
});

test("empty official avatar array is accepted", async () => {
  mockFetch(() => Response.json({ data: [], has_more: false, next_token: null }));
  const result = await new HeyGenProvider(config()).listAvatarLooks();
  assert.deepEqual(result.looks, []);
});

test("empty official voice array is accepted", async () => {
  mockFetch(() => Response.json({ data: [], has_more: false, next_token: null }));
  const result = await new HeyGenProvider(config()).listVoices();
  assert.deepEqual(result.voices, []);
});

test("rate limiting reports 429 safely", async () => {
  mockFetch(() => new Response("{}", { status: 429 }));
  await assert.rejects(() => new HeyGenProvider(config()).listVoices(), /HTTP 429/);
});

test("timeout is surfaced as a provider error", async () => {
  mockFetch(() => { throw new Error("signal timed out"); });
  await assert.rejects(() => new HeyGenProvider(config()).listVoices(), /signal timed out/);
});

test("malformed response fails schema validation", async () => {
  mockFetch(() => Response.json({ data: { avatar_looks: [{ name: "missing id" }] } }));
  await assert.rejects(() => new HeyGenProvider(config()).listAvatarLooks(), /Invalid input/);
});

test("generation is blocked when HEYGEN_GENERATION_ENABLED is false", async () => {
  let called = false;
  mockFetch(() => { called = true; return Response.json({}); });
  await assert.rejects(() => new HeyGenProvider(config({ generationEnabled: false })).createVideo({ type: "avatar", avatar_id: "a", title: "t", script: "hello", resolution: "720p", aspect_ratio: "16:9", output_format: "mp4" }), /disabled/);
  assert.equal(called, false);
});

test("secret redaction removes API keys from messages", () => {
  process.env.HEYGEN_API_KEY = "test-secret-key";
  assert.equal(redactHeyGenSecrets("do not show test-secret-key"), "do not show [REDACTED]");
});
