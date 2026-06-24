export const EASY_AI_FPS = 30;
export const EASY_AI_DURATION_FRAMES = 30 * EASY_AI_FPS;

export const EASY_AI_FORMATS = {
  vertical: { id: "easy-ai-vertical", width: 1080, height: 1920, label: "Vertical 9:16" },
  square: { id: "easy-ai-square", width: 1080, height: 1080, label: "Square 1:1" },
  horizontal: { id: "easy-ai-horizontal", width: 1920, height: 1080, label: "Horizontal 16:9" },
} as const;

export type EasyAiFormatName = keyof typeof EASY_AI_FORMATS;
