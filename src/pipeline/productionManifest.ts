import { EASY_AI_BRAND } from "../brand/easyAiBrand";
import { EASY_AI_CAPTIONS } from "../captions/easyAiCaptions";
import { EASY_AI_FORMATS, EASY_AI_FPS } from "../config/videoFormats";

export const EASY_AI_PRODUCTION_MANIFEST = {
  projectId: "easy-ai-brand-intro-dry-run",
  phase: "phase-1-dry-run",
  status: "code-generated-preview-only",
  fps: EASY_AI_FPS,
  durationSeconds: 30,
  formats: EASY_AI_FORMATS,
  brand: EASY_AI_BRAND,
  narration: EASY_AI_BRAND.narration,
  captions: EASY_AI_CAPTIONS,
  providers: {
    openai: { configuredBy: "OPENAI_API_KEY", enabled: false },
    kling: { configuredBy: ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"], enabled: false },
    elevenLabs: { configuredBy: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"], enabled: false },
  },
  safeguards: [
    "No paid API calls in Phase 1.",
    "No generated voice, video, image, or music assets in Phase 1.",
    "AI is represented through human business outcomes, not dashboards, robots, holograms, or futuristic graphics.",
  ],
} as const;
