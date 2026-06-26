# OpenAI Integration: Script Planning Only

Phase 2A connects Easy AI Video Factory to OpenAI for **script planning only**.

## Safety boundaries

- `OPENAI_API_KEY` is read only from a server-side environment variable.
- The key must never be printed, logged, placed in browser code, or committed.
- This phase does not call Kling, ElevenLabs, or any other provider.
- This phase does not generate images, video, voice, music, or other media assets.
- The script planner preserves the approved Easy AI name, slogan, CTA, audience, and visual direction.

## Local setup

1. Copy `.env.example` to `.env` if needed.
2. Set `OPENAI_API_KEY` locally without committing the value.
3. Run local checks that do not require the key:

```bash
npm run typecheck
npm run lint
```

4. Optional tiny live connection test, only when you intentionally want to spend a very small amount:

```bash
OPENAI_API_KEY=your_server_side_key npm run test:openai:connection
```

The connection test prints only a small redacted validity summary. It does not print the key, authorization headers, or the full model response.

## Manual GitHub Actions test

After merging this branch and adding the repository secret:

1. Open the GitHub repository.
2. Click **Actions**.
3. Click **Test OpenAI Connection**.
4. Click **Run workflow**.
5. Select the branch you want to test.
6. Click the green **Run workflow** button.

The workflow runs only when manually started with `workflow_dispatch`. It installs dependencies, runs type checking and linting, executes the tiny OpenAI connection test, and uploads only `openai-connection-summary.json` as a safe redacted artifact.

## Expected cost category

Expected cost category: **tiny / minimal**. The test sends one small structured-output request with a low output-token cap and does not request media generation.

## Troubleshooting

### Missing API key

If the workflow says the secret is missing, add `OPENAI_API_KEY` in GitHub under **Settings > Secrets and variables > Actions > Repository secrets**, then rerun the manual workflow.

### Invalid API key

If the request fails with an authentication error, replace the repository secret with a valid OpenAI API key. Do not paste the key into issues, logs, comments, or browser-side files.

### Unfunded or unavailable key

If the request fails with billing, quota, or project access errors, confirm that the OpenAI account/project has billing enabled, available quota, and access to the configured script-planning model.

### Sensitive output concerns

The test intentionally writes only a summary with booleans and counts. If troubleshooting requires deeper inspection, do it locally with a non-production prompt and continue to avoid printing secrets or authorization headers.
