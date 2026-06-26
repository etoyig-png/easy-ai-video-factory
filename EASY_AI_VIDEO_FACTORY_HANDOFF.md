# Easy AI Video Factory
## Marketing System Summary & Implementation Handoff

**Status:** Phase 2C complete | End-to-end test working | Current public URL is temporary | Next: Phase B

## Executive decision

The video factory works end to end. Keep the current GitHub Pages address as a temporary beta review portal only. It is **not required** for production. Use the existing Easy AI website as the public front door, and move the review portal to a branded subdomain or the existing website after its platform is confirmed.

## Executive summary

A working automated video-production prototype has been built for Easy AI. It can plan content with OpenAI, generate a human-presenter video with HeyGen, assemble and preview branded Remotion content, run the process through GitHub Actions, and publish the result to a browser review page. The successful HeyGen test clip proved the full automated path without manual uploading, downloading, or timeline editing.

- Current state: working prototype; Phase 2C is complete.
- Primary value: repeatable branded marketing video production with human approval before paid generation.
- Current limit: the reusable campaign intake, full 30-second commercial, real multi-format output, and channel publishing are not built yet.
- Recommended next build: Phase B, a reusable campaign intake and approval system tied to the Easy AI marketing workflow.

## Business-model fit

**Yes, this fits the Easy AI business model.** Use it as:

1. Easy AI's internal marketing engine.
2. A live demonstration of Easy AI's automation capability.
3. A future managed marketing-automation service for selected clients.

Do not turn it into a separate general video SaaS product yet. First use it to create demand, case studies, and proof for Easy AI.

## Current architecture

1. **Campaign brief** - future form or fixed test input.
2. **OpenAI planning** - narration, scenes, captions, and CTA.
3. **HeyGen generation** - avatar, voice, and paid video request.
4. **Remotion production** - branding, captions, layouts, and timing.
5. **GitHub Actions** - secure automation and approval gates.
6. **Browser review** - watch the output without downloading.
7. **Publish/distribute** - future phase; not connected yet.

## Verified working components

| Component | Status | Notes |
|---|---|---|
| Remotion browser preview | Working | Vertical, square, and horizontal dry-run compositions play in browser. |
| GitHub Pages deployment | Working | Review site deploys automatically through GitHub Actions. |
| OpenAI API connection | Working | Protected key and structured planning connection passed. |
| HeyGen API connection | Working | Quota, avatars, and voices were retrieved securely. |
| HeyGen paid test clip | Working | Short human-presenter clip generated, deployed, and played successfully. |
| Security gates | Working | Paid generation requires the exact word `GENERATE`. |
| Full 30-second commercial | Not built | Approved plan exists; real production is next. |
| Reusable campaign form | Not built | This is Phase B. |
| Automatic social publishing | Not built | Channel approvals and permissions remain future work. |

## Technical assets

- Repository: https://github.com/etoyig-png/easy-ai-video-factory
- Temporary review site: https://etoyig-png.github.io/easy-ai-video-factory/
- GitHub Secrets: `OPENAI_API_KEY`, `HEYGEN_API_KEY`
- Workflows:
  - Deploy browser preview to GitHub Pages
  - Test OpenAI Connection
  - Test HeyGen Connection
  - Generate HeyGen Test Clip

## Website and domain decision

You do **not** have to use the current GitHub Pages URL. It is only the beta review host.

### Recommended path

- **During beta:** keep GitHub Pages but attach a branded subdomain such as `review.[your-domain]` or `studio.[your-domain]`.
- **Public front end:** use the existing Easy AI website for campaign intake, lead generation, approved videos, and customer-facing pages.
- **Later:** migrate the review portal to the existing website host only if it improves control and does not slow development.

The customer-facing address should not contain the owner's personal GitHub username.

## Phase B - reusable marketing video factory

1. Build a branded browser campaign form.
2. Collect campaign title, source URL/text, target customer, objective, message, CTA, duration, formats, and brand notes.
3. Generate and review the script/scene plan before paid generation.
4. Show an estimated provider cost and require explicit confirmation.
5. Generate the primary HeyGen video.
6. Use Remotion to create 16:9, 1:1, and 9:16 outputs.
7. Provide browser review, revision notes, approval status, and campaign history.
8. Save a manifest containing status, cost, providers, prompts, outputs, and errors.
9. Add controlled publishing only after review and permissions are defined.

## Phase B guardrails

- No manual upload/download in the normal workflow.
- No paid generation before cost summary and confirmation.
- No automatic paid retry unless idempotency is guaranteed.
- No API keys in browser code, source code, logs, or deployed pages.
- No customer-facing URL containing a personal GitHub username.
- No dashboard-heavy Easy AI commercial; focus on owners and customers.
- Do not build automatic social posting until approval and account permissions are defined.

## Handoff instructions

Use the latest `main` branch of `etoyig-png/easy-ai-video-factory`.

Preserve:

- Working OpenAI and HeyGen connection tests.
- Exact paid-generation confirmation gate.
- No automatic paid retry.
- Browser review page.
- GitHub Pages workflow.
- Secret handling.

Build next:

1. Website/hosting decision.
2. Campaign data model and intake form.
3. OpenAI plan review and approval.
4. HeyGen generation from approved plan.
5. Real Remotion multi-format rendering.
6. Revision, approval, campaign history, and manifests.

## Definition of done for Phase B

1. A user enters one campaign brief in a browser.
2. The system creates a structured script and scene plan.
3. The user can edit or approve the plan.
4. The system shows a paid-generation estimate and requires confirmation.
5. One approved run produces a real video and every platform version.
6. The user watches every version in browser without moving files.
7. The user can submit revision notes or approve the campaign.
8. Every campaign has a manifest, status, cost record, and output location.
9. Public URLs use Easy AI branding.
10. No secret values appear in code, logs, or browser pages.

## Decision needed before Phase B

Provide the other website URL and identify its platform or builder. This determines whether Phase B should be embedded into the existing site, deployed to the same host, or kept on GitHub Pages behind a branded subdomain.

## Official references

- GitHub Pages custom domains: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- Managing a custom domain: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- Custom GitHub Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Domain verification: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
