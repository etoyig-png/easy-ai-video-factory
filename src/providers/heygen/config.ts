export interface HeyGenConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  retryCount: number;
  pollIntervalMs: number;
  maxPollDurationMs: number;
  generationEnabled: boolean;
}

const readInteger = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readBoolean = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  if (!value) return fallback;
  return value.toLowerCase() === "true";
};

export const getHeyGenConfig = (): HeyGenConfig => {
  const apiKey = process.env.HEYGEN_API_KEY;

  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is missing. Set it as a protected server-side environment variable.");
  }

  return {
    apiKey,
    baseUrl: process.env.HEYGEN_BASE_URL ?? "https://api.heygen.com",
    timeoutMs: readInteger("HEYGEN_TIMEOUT_MS", 15000),
    retryCount: readInteger("HEYGEN_RETRY_COUNT", 2),
    pollIntervalMs: readInteger("HEYGEN_POLL_INTERVAL_MS", 5000),
    maxPollDurationMs: readInteger("HEYGEN_MAX_POLL_DURATION_MS", 10 * 60 * 1000),
    generationEnabled: readBoolean("HEYGEN_GENERATION_ENABLED", false),
  };
};
