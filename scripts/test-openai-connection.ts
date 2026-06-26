import { createScriptPlan } from "../src/server/openaiScriptPlanner";
import { EASY_AI_BRAND } from "../src/brand/easyAiBrand";
import { EASY_AI_FORMATS } from "../src/config/videoFormats";

const run = async () => {
  const plan = await createScriptPlan({
    campaignTitle: "Connection test",
    topic: "AI follow-up support for small businesses",
    sourceText: "A tiny connection test for script planning only.",
    audience: EASY_AI_BRAND.audience,
    objective: "Confirm structured script planning works.",
    cta: EASY_AI_BRAND.cta,
    targetDurationSeconds: 30,
    platformFormats: Object.values(EASY_AI_FORMATS).map((format) => format.label),
  });

  const summary = {
    ok: true,
    videoTitlePresent: plan.videoTitle.length > 0,
    sceneCount: plan.scenes.length,
    captionSegmentCount: plan.captionSegments.length,
    ctaMatchesApprovedBrand: plan.cta === EASY_AI_BRAND.cta,
    estimatedNarrationDurationSeconds: plan.estimatedNarrationDurationSeconds,
  };

  console.log(JSON.stringify(summary, null, 2));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown OpenAI connection test error";
  console.error(`OpenAI connection test failed: ${message}`);
  process.exit(1);
});
