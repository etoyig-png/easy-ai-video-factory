import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { EASY_AI_BRAND } from "../brand/easyAiBrand";

const OPENAI_SCRIPT_PLANNER_MODEL = "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = 900;

const SceneTimingSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
});

export const ScriptPlanningSceneSchema = z.object({
  sceneNumber: z.number().int().min(1),
  timing: SceneTimingSchema,
  visualDescription: z.string().min(1),
  onScreenText: z.string().min(1),
});

export const CaptionSegmentSchema = z.object({
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
  text: z.string().min(1),
});

export const ScriptPlanSchema = z.object({
  videoTitle: z.string().min(1),
  narration30Second: z.string().min(1),
  scenes: z.array(ScriptPlanningSceneSchema).min(3).max(6),
  captionSegments: z.array(CaptionSegmentSchema).min(3).max(8),
  cta: z.string().min(1),
  safetyNotes: z.array(z.string().min(1)).min(1).max(6),
  estimatedNarrationDurationSeconds: z.number().min(20).max(35),
});

export type ScriptPlan = z.infer<typeof ScriptPlanSchema>;

export interface ScriptPlanningInput {
  campaignTitle: string;
  topic: string;
  sourceText: string;
  audience: string;
  objective: string;
  cta: string;
  targetDurationSeconds: number;
  platformFormats: string[];
}

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Set it as a server-side environment variable.");
  }

  return new OpenAI({ apiKey });
};

const buildPlannerPrompt = (input: ScriptPlanningInput) => `Create a structured script plan only. Do not generate images, video, audio, music, or voice.

Approved Easy AI brand configuration:
- Company name: ${EASY_AI_BRAND.companyName}
- Slogan: ${EASY_AI_BRAND.slogan}
- Approved CTA: ${EASY_AI_BRAND.cta}
- Approved audience: ${EASY_AI_BRAND.audience}
- Brand message: ${EASY_AI_BRAND.message}
- Visual direction: practical small-business day, human outcomes, warm trustworthy colors; no robots, holograms, futuristic dashboards, or fake provider claims.

Campaign input:
- Campaign title: ${input.campaignTitle}
- Topic: ${input.topic}
- Source text: ${input.sourceText}
- Requested audience: ${input.audience}
- Objective: ${input.objective}
- Requested CTA: ${input.cta}
- Target duration seconds: ${input.targetDurationSeconds}
- Platform formats: ${input.platformFormats.join(", ")}

Requirements:
- Preserve the approved Easy AI name, slogan, CTA, audience, and visual direction.
- Use the approved CTA exactly: ${EASY_AI_BRAND.cta}
- Keep narration suitable for about 30 seconds.
- Return only the validated structured output requested by the schema.`;

export const createScriptPlan = async (input: ScriptPlanningInput): Promise<ScriptPlan> => {
  const client = getOpenAIClient();

  const response = await client.responses.parse({
    model: OPENAI_SCRIPT_PLANNER_MODEL,
    input: [
      {
        role: "system",
        content:
          "You are a careful brand-safe script planner. Return concise structured JSON only through the provided schema.",
      },
      { role: "user", content: buildPlannerPrompt(input) },
    ],
    max_output_tokens: MAX_OUTPUT_TOKENS,
    text: {
      format: zodTextFormat(ScriptPlanSchema, "easy_ai_script_plan"),
    },
  });

  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("OpenAI returned no parsed script plan.");
  }

  return ScriptPlanSchema.parse(parsed);
};
