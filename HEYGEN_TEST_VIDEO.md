# HeyGen Test Video Guide

This project includes a manual GitHub Actions workflow named **Generate HeyGen Test Clip** for one controlled, low-cost HeyGen quality test.

## 1. What the short test clip proves

The clip proves that the repository can safely select a compatible HeyGen avatar and voice, submit one v3 video-generation request, poll until completion, download the resulting MP4, and publish it to the existing browser review page.

## 2. Why this happens before the full commercial

The test is intentionally short, about 6 to 8 seconds, so the technical path and creative quality can be checked before spending more money on a full 30-second Easy AI commercial.

## 3. Paid request count

An approved run is designed to submit **one paid HeyGen video request**. It does not call OpenAI and does not use any additional paid service.

## 4. How the `GENERATE` confirmation gate works

The workflow has one required text input: `paid_generation_confirmation`. The paid generation step continues only when the value equals exactly:

```text
GENERATE
```

If the value is missing, misspelled, lowercase, or has extra text, the workflow stops safely before `POST /v3/videos` and reports that no paid generation occurred.

## 5. How avatar and voice are selected automatically

At runtime, the workflow asks HeyGen for a small list of public avatar looks and voices. It prefers a compatible professional adult female avatar with a default voice, support for the current v3 production path, and horizontal-friendly framing. It prefers a warm American English female voice. If that exact combination is not available, it chooses the safest compatible professional fallback and records the safe avatar and voice names and IDs in the generated manifest.

## 6. Where the finished clip appears

After a successful run, the MP4 appears in the GitHub Pages browser preview at the project path:

```text
/easy-ai-video-factory/
```

The page includes a **HeyGen Test Clip** section with a video player, script, avatar name, voice name, generation date, duration when available, and generation status.

## 7. Why the MP4 is not committed to GitHub

The generated MP4 is a build artifact for review, not source code. The workflow places it only in the temporary Pages build and deploys it from there, keeping the Git repository small and avoiding accidental commits of generated media.

## 8. What happens if generation fails

The workflow writes a safe manifest with the failed or timed-out status and a redacted failure reason. It does not print request headers, does not expose `HEYGEN_API_KEY`, and does not upload `.env` files.

## 9. Why paid failures are not retried automatically

A failed paid video request can still consume quota. To control cost, the workflow never automatically submits another paid video after a failure. The user must inspect the safe failure summary and manually decide whether to run the workflow again.

## 10. Exact GitHub buttons to click

After this branch is merged to `main`:

1. Open the GitHub repository.
2. Click **Actions**.
3. In the left workflow list, click **Generate HeyGen Test Clip**.
4. Click **Run workflow**.
5. Leave the branch set to **main**.
6. In `paid_generation_confirmation`, type exactly `GENERATE`.
7. Click the green **Run workflow** button.
8. When the run finishes, open the GitHub Pages deployment URL and review the **HeyGen Test Clip** section.
