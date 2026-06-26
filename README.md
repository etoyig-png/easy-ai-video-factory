# Easy AI Video Factory — Phase 1 Dry Run

This repository is based on Remotion's AI video template. The original template renders timeline-driven vertical videos from JSON plus generated image and audio assets, and includes a CLI that can create scripts, images, narration, and synchronized timelines with OpenAI and ElevenLabs.

Phase 1 keeps those useful original features intact, but adds a safe Easy AI dry-run commercial that uses only code-generated shapes, text, and captions. No paid provider is called by the preview compositions.

## Package manager and commands

The project uses npm scripts from `package.json`.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run gen
npx remotion render easy-ai-horizontal out/easy-ai-horizontal.mp4 --frames=0-89
```

`npm run gen` is the original provider-backed story generator. Do not run it with real provider keys during Phase 1 unless you intentionally want paid generation in a future phase.

## Phase 1 compositions

- `easy-ai-vertical` — 1080 × 1920, 30fps, 30 seconds
- `easy-ai-square` — 1080 × 1080, 30fps, 30 seconds
- `easy-ai-horizontal` — 1920 × 1080, 30fps, 30 seconds

Preview with:

```bash
npm run dev
```

Render a short dry-run segment with:

```bash
npx remotion render easy-ai-horizontal out/easy-ai-horizontal.mp4 --frames=0-89
```

## New Phase 1 structure

- `src/brand` — Easy AI brand settings
- `src/components/easy-ai` — reusable Easy AI visual components
- `src/scenes` — commercial scenes
- `src/compositions` — responsive Remotion compositions
- `src/captions` — timed caption data
- `src/audio` — audio notes/placeholders
- `src/providers` — provider connection placeholders
- `src/pipeline` — production manifest data
- `src/config` — video format configuration
- `src/utils` — layout utilities
- `public/content/easy-ai-brand-intro-dry-run` — browser-viewable manifest placeholder

## Safety

- No real API keys are committed.
- No paid OpenAI, Kling, ElevenLabs, voice, image, music, or video generation is invoked by the Easy AI dry run.
- AI remains visually invisible; outcomes are shown through human business activity, faster responses, timely follow-up, and owner control.

## Easy AI browser preview

Run the local Remotion Player preview with:

```bash
npm run preview:browser
```

Then open the local URL printed by Vite. The page lets you switch between the vertical, square, and horizontal Phase 1 Easy AI compositions without downloading a video file.

For a static browser build suitable for GitHub Pages, run:

```bash
npm run build:preview
```

The preview is configured for the GitHub Pages project path `/easy-ai-video-factory/`, so Vite emits asset URLs that work at `https://etoyig-png.github.io/easy-ai-video-factory/`. The published page uses the same safe local Remotion Player compositions and does not call paid generation providers.

Deployment instructions live in [`DEPLOY_PREVIEW.md`](DEPLOY_PREVIEW.md). After merging, enable **Settings** → **Pages** → **Build and deployment** → **Source: GitHub Actions**, then run the **Deploy browser preview to GitHub Pages** workflow from the **Actions** tab if you want to deploy manually.

## HeyGen provider preparation

Phase 2B adds a server-side HeyGen provider for safe account validation and future avatar-video generation. The read-only connection test uses `HEYGEN_API_KEY` from the server environment, keeps `HEYGEN_GENERATION_ENABLED=false` by default, and calls only quota, avatar-look, and voice-list endpoints.

```bash
npm run test:heygen:unit
HEYGEN_API_KEY=your_key npm run test:heygen:connection
```

Do not place the HeyGen key in browser code or commit it to the repository. Future paid video generation is guarded by `HEYGEN_GENERATION_ENABLED=true` and should be enabled only intentionally in a protected server-side environment. See [`HEYGEN_INTEGRATION.md`](HEYGEN_INTEGRATION.md) for setup, safety rules, troubleshooting, and the manual GitHub Actions connection test.

## HeyGen technical test clip

A manual workflow can generate one short, paid HeyGen technical test clip after an explicit `GENERATE` confirmation. See [HEYGEN_TEST_VIDEO.md](HEYGEN_TEST_VIDEO.md) for the safety gate, automatic avatar/voice selection, and review steps.
