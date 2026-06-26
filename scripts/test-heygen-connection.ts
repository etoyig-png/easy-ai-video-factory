import { HeyGenProvider } from "../src/providers/heygen";

const run = async () => {
  if (!process.env.HEYGEN_API_KEY) {
    throw new Error("HEYGEN_API_KEY repository secret or environment variable is missing.");
  }

  const provider = new HeyGenProvider();
  const quota = await provider.getRemainingQuota();
  const avatars = await provider.listAvatarLooks({ ownership: "public", limit: 1 });
  const voices = await provider.listVoices({ limit: 1 });

  const summary = {
    authenticated: true,
    quotaRetrieved: quota.remainingQuota !== null || quota.rawUnit !== null,
    avatarCountReturned: avatars.looks.length,
    voiceCountReturned: voices.voices.length,
    providerStatus: "safe-read-only-ok",
  };

  console.log(JSON.stringify(summary, null, 2));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown HeyGen connection test error";
  console.error(`HeyGen connection test failed: ${message}`);
  process.exit(1);
});
