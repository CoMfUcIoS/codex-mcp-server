# Usage

## Tools overview

- **codex** — run the Codex CLI non‑interactively. Optional conversational context via `sessionId`.
- **listSessions** — list all active sessions with metadata (sessionId, turns, bytes, timestamps).
- **deleteSession** — delete/expire a session by sessionId.
- **sessionStats** — get statistics and metadata for a session.
- **listModels** — list models discovered from local `~/.codex` config.
- **listTools** — machine‑readable tool & schema list.
- **ping**, **help** — utilities.

## Codex parameters

| Name               | Type              | Default         | Notes                                                                                  |
| ------------------ | ----------------- | --------------- | -------------------------------------------------------------------------------------- |
| `prompt`           | string            | —               | Required on first call (unless paging).                                                |
| `pageSize`         | number            | 40000           | 1,000–200,000 chars.                                                                   |
| `pageToken`        | string            | —               | Use token from previous paged response.                                                |
| `sessionId`        | string            | —               | Enables conversation memory within size limits.                                        |
| `resetSession`     | boolean           | false           | Clears given `sessionId` before running.                                               |
| `model`            | string            | gpt-5 medium    | One of: `gpt-5 minimal`, `gpt-5 low`, `gpt-5 medium`, `gpt-5 high`.                    |
| `image`            | string or string[]| —               | Path(s) to image files for code/diagram analysis.                                      |
| `approvalPolicy`   | string            | —               | Advanced—passed to Codex CLI `--approval-policy`.                                      |
| `sandbox`          | boolean           | false           | Advanced—Codex CLI `--sandbox`.                                                        |
| `workingDirectory` | string            | —               | Advanced—Codex CLI `--working-directory`.                                              |
| `baseInstructions` | string            | —               | Advanced—Codex CLI `--base-instructions`.                                              |

### Examples

**Single‑shot**

```json
{ "prompt": "Explain this TypeScript function" }
```

**Paging through large output**

```json
{ "prompt": "Summarize this repository in depth", "pageSize": 10000 }
```

_Response includes_ `{ "meta": { "nextPageToken": "abc..." } }` → call again:

```json
{ "pageToken": "abc..." }
```

**Conversational**

```json
{ "sessionId": "issue-123", "prompt": "Draft tests for utils/sessionStore.ts" }
```

**Explicit model**

```json
{ "prompt": "Write a Python script", "model": "gpt-5 high" }
```

### Notes

- Page tokens expire ~10 minutes after the last use.
- Sessions expire after `CODEX_SESSION_TTL_MS` and trim once transcripts exceed `CODEX_SESSION_MAX_BYTES`.

## Error format

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "Missing required 'prompt' (or provide a 'pageToken')." }]
}
```

