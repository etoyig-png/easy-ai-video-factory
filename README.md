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
