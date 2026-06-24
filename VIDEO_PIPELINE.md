# Video Pipeline

## Phase 1: dry-run preview

1. Store approved brand settings in `src/brand/easyAiBrand.ts`.
2. Store timed caption text in `src/captions/easyAiCaptions.ts`.
3. Render responsive Remotion compositions from `src/compositions/EasyAiBrandIntro.tsx`.
4. Use provider placeholders only; no paid API calls.
5. Keep a production manifest in `src/pipeline/productionManifest.ts` and `public/content/easy-ai-brand-intro-dry-run/manifest.json`.

## Future Phase 2 provider plan

Provider integrations should remain explicit and testable. Environment variable names are reserved in `.env.example`:

- `OPENAI_API_KEY`
- `KLING_ACCESS_KEY`
- `KLING_SECRET_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Do not claim a provider integration works until it has been implemented and tested. Do not commit secrets. Do not use deprecated Sora APIs.

## Required formats

- Vertical 1080 × 1920
- Square 1080 × 1080
- Horizontal 1920 × 1080
- 30 frames per second
- Approximately 30 seconds
