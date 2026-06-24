# Deploy the Easy AI browser preview with GitHub Pages

GitHub Pages serves the static Vite build of the Easy AI Remotion Player preview. The deployed site contains the safe dry-run browser preview only; it does not run the provider-backed CLI, call paid generation APIs, or require API keys.

## Enable GitHub Pages with GitHub Actions

After this pull request is merged into `main`:

1. Open the repository on GitHub.
2. Click **Settings**.
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Save the setting if GitHub prompts you to save.

The workflow in `.github/workflows/deploy-pages.yml` builds the preview from `main`, uploads the `dist/` folder as the Pages artifact, and deploys that artifact to GitHub Pages.

## Run a deployment manually

1. Open the repository on GitHub.
2. Click **Actions**.
3. Select **Deploy browser preview to GitHub Pages**.
4. Click **Run workflow**.
5. Choose the `main` branch.
6. Click the green **Run workflow** button.

## Find the final website address

When a deployment completes, open the workflow run and look for the **deploy** job summary. The GitHub Pages URL appears there. It should use the project path:

```text
https://etoyig-png.github.io/easy-ai-video-factory/
```

Do not treat the site as live until the deploy job has completed successfully and GitHub shows the published URL.

## Troubleshooting a failed deployment

- Confirm GitHub Pages is configured to use **GitHub Actions** as the source.
- Open the failed workflow run and expand the first red step.
- If `npm ci` fails, make sure `package.json` and `package-lock.json` are committed together.
- If type checking, linting, or composition checks fail, reproduce locally with `npm run typecheck`, `npm run lint`, and `npm run check:compositions`.
- If the build succeeds but assets do not load, confirm the Vite base path remains `/easy-ai-video-factory/`.
- Re-run the workflow from the **Actions** tab after fixing the problem.
