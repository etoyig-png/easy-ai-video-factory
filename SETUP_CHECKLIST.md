# Setup Checklist

## Local setup

- [ ] Install dependencies with `npm install`.
- [ ] Copy `.env.example` to `.env` only when a future phase needs providers.
- [ ] Keep all real secrets out of Git.
- [ ] Start Remotion Studio with `npm run dev`.
- [ ] Open `easy-ai-vertical`, `easy-ai-square`, or `easy-ai-horizontal`.

## Phase 1 validation

- [ ] Confirm the dry-run preview uses generated shapes and text only.
- [ ] Confirm captions remain inside safe areas in all three formats.
- [ ] Confirm the end card includes EASY AI, the official slogan, and the official CTA.
- [ ] Run `npm run lint`.
- [ ] Optionally render a short preview segment with `npx remotion render easy-ai-horizontal out/easy-ai-horizontal.mp4 --frames=0-89`.

## Provider safety

- [ ] Do not add real API keys to `.env.example` or committed files.
- [ ] Do not run the original `npm run gen` workflow unless Phase 2 explicitly enables paid providers.
