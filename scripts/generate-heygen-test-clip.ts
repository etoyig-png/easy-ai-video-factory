import { mkdir } from "fs/promises";
import { join } from "path";
import { assertPaidGenerationConfirmation, buildHeyGenTestRequest, createPreviewManifest, generateHeyGenTestClip, safeFailure, selectHeyGenTalent, writePreviewManifest, HEYGEN_TEST_RESOLUTION, HEYGEN_TEST_SCRIPT, HEYGEN_TEST_TITLE } from "../src/providers/heygen";
import { HeyGenProvider } from "../src/providers/heygen";

const outputDir = process.env.HEYGEN_TEST_OUTPUT_DIR ?? "public/content/heygen-test-clip";
const confirmation = process.env.PAID_GENERATION_CONFIRMATION;

const appendSummary = async (lines: string[]) => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const { appendFile } = await import("fs/promises");
  await appendFile(summaryPath, `${lines.join("\n")}\n`);
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });
  assertPaidGenerationConfirmation(confirmation);
  if (!process.env.HEYGEN_API_KEY) throw new Error("HEYGEN_API_KEY repository secret is missing.");

  const provider = new HeyGenProvider();
  const quota = await provider.getRemainingQuota();
  const avatars = (await provider.listAvatarLooks({ ownership: "public", limit: 20 })).looks;
  const voices = (await provider.listVoices({ limit: 50 })).voices;
  const selection = selectHeyGenTalent(avatars, voices);
  const request = buildHeyGenTestRequest(selection);

  console.log(`Test title: ${HEYGEN_TEST_TITLE}`);
  console.log(`Script: ${HEYGEN_TEST_SCRIPT}`);
  console.log(`Selected avatar name: ${selection.avatar.name ?? "Unnamed compatible avatar"}`);
  console.log(`Selected voice name: ${selection.voice?.name ?? "Default/fallback voice"}`);
  console.log(`Requested resolution: ${HEYGEN_TEST_RESOLUTION}`);
  console.log("Expected number of paid video requests: one");
  console.log(`Remaining quota before generation: ${quota.remainingQuota ?? "unknown"} ${quota.rawUnit ?? ""}`.trim());

  const result = await generateHeyGenTestClip(provider, outputDir);
  await appendSummary([
    "## HeyGen Test Clip",
    "- Status: completed",
    `- Avatar: ${result.manifest.avatar.name ?? "Unnamed"}`,
    `- Voice: ${result.manifest.voice.name ?? "Unnamed"}`,
    "- Paid video requests submitted by this workflow: 1",
  ]);
  console.log(`Generated manifest at ${join(outputDir, "manifest.json")}`);
  void request;
};

main().catch(async (error) => {
  const message = safeFailure(error);
  const status = /timed out|timeout/i.test(message) ? "timeout" : "failed";
  await writePreviewManifest(createPreviewManifest({ status, failureReason: message, videoRequestCount: 0 }), join(outputDir, "manifest.json"));
  await appendSummary(["## HeyGen Test Clip", `- Status: ${status}`, `- Safe failure reason: ${message}`, "- Automatic paid retries: 0"]);
  console.error(message);
  process.exit(1);
});
