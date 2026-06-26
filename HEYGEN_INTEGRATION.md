# HeyGen Integration

## What HeyGen will do

HeyGen is prepared as the future avatar-video provider for Easy AI Video Factory. The current integration only reads account quota, avatar looks, and voices so the project can validate connectivity without creating media.

## API key storage

Store the key only as the protected server-side environment variable `HEYGEN_API_KEY`. In GitHub Actions, store it as the repository secret `HEYGEN_API_KEY`. The provider sends it only in the server-side `x-api-key` header and never in browser JavaScript.

## Safe connection test

Run the local read-only test with:

```bash
HEYGEN_API_KEY=your_key npm run test:heygen:connection
```

The script calls only:

- `GET /v2/user/remaining_quota`
- `GET /v3/avatars/looks` with `limit=1`
- `GET /v3/voices` with `limit=1`

It prints a small summary containing authentication status, quota retrieval status, avatar count, voice count, and provider status. It does not print the API key, headers, or full raw responses.

## Why the test does not generate a video

The test exists only to prove that authentication and schema validation work. It intentionally avoids all paid media creation endpoints, including `POST /v3/videos`, Video Agent generation, speech generation, and asset upload.

## Actions that can consume HeyGen credits

Credit-consuming actions can include video generation, speech generation, asset processing, and any future media-creation endpoint. The current automated tests and manual workflow intentionally avoid those actions.

## Paid generation is disabled by default

`HEYGEN_GENERATION_ENABLED` defaults to `false`. The provider fails closed before making a paid creation request unless this variable is explicitly set to `true` in a protected server-side environment.

## Future video generation

The provider includes a guarded `createVideo` method for future use with avatar ID, title, script, voice ID, resolution, aspect ratio, background, captions, output format, voice settings, motion prompt, engine, callback URL, and idempotency key. It hashes requests for duplicate detection and uses idempotency keys to make safe retries possible.

## Future Remotion handoff

After a HeyGen video is generated intentionally, its completed video URL or downloaded asset path can be added to a production manifest. Remotion can then use that manifest as source media while preserving the existing browser preview and compositions.

## Common errors

- `401`: the API key is missing, invalid, revoked, or not sent as `x-api-key`.
- `403`: the account is authenticated but lacks access to the requested resource.
- `429`: HeyGen rate limits were reached; retry later or reduce request frequency.
- Quota errors: the account may not have enough credits for future paid generation.
- Avatar errors: the selected avatar look may be unavailable, private, unsupported by the selected engine, or not present in the account.
- Voice errors: the selected voice may be unavailable, unsupported for the selected avatar or engine, or not present in the account.

## Disable safely

Unset `HEYGEN_API_KEY` to disable all HeyGen access, or leave `HEYGEN_GENERATION_ENABLED=false` to allow only read-only checks while blocking paid generation.
