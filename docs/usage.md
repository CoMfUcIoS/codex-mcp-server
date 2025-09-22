# Usage

## Tools overview

- **codex** — run the Codex CLI non‑interactively. Optional conversational context via `sessionId`.
- **listSessions** — list all active sessions with metadata (sessionId, turns, bytes, timestamps).
- **deleteSession** — delete or expire a session by sessionId.
- **sessionStats** — get statistics and metadata for a session.
- **ping** — echo test.
- **help** — `codex --help` output passthrough.

## Codex tool parameters

| Name               | Type    | Default | Notes                                                                                |
| ------------------ | ------- | ------- | ------------------------------------------------------------------------------------ |
| `prompt`           | string  | —       | Required on first call (unless paging).                                              |
| `pageSize`         | number  | 40000   | 1,000–200,000 chars.                                                                 |
| `pageToken`        | string  | —       | From previous paged response.                                                        |
| `sessionId`        | string  | —       | Enables conversation memory within size limits.                                      |
| `resetSession`     | boolean | false   | Clears given `sessionId` before running.                                             |
| `approvalPolicy`   | string  | —       | Advanced. Codex CLI `--approval-policy`. Specify approval policy for code execution. |
| `sandbox`          | boolean | false   | Advanced. Codex CLI `--sandbox`. Run in sandbox mode.                                |
| `workingDirectory` | string  | —       | Advanced. Codex CLI `--working-directory`. Set working directory for execution.      |

### Examples

**Single‑shot**

```json
{ "prompt": "Explain this TypeScript function" }
```

**Paging through large output**

```json
{ "prompt": "Summarize this repository in depth" }
```

_Response includes_ `{ "nextPageToken": "abc..." }` → call again:

```json
{ "pageToken": "abc...", "pageSize": 40000 }
```

**Reply in an existing conversation**

```json
{
  "tool": "codex-reply",
  "conversationId": "abc123",
  "prompt": "Add more tests for edge cases."
}
```

_This will invoke `codex reply` and return the output in the context of the given conversation._

**Model Selection (explicit)**

```json
{ "prompt": "Write a Python script", "model": "o2" }
```

**Intelligent Model Selection (auto)**

```json
{ "prompt": "Create a React TypeScript component" }
```

_The server will auto-select the best model for your prompt._

**Resume a previous session**

```json
{ "tool": "resume" }
```

_This will invoke `codex resume` and return the output._

**Delete a session**

```json
{ "tool": "deleteSession", "sessionId": "abc123" }
```

_Deletes the session with the given ID._

**Get session statistics**

```json
{ "tool": "sessionStats", "sessionId": "abc123" }
```

_Returns metadata and statistics for the session._

**List all sessions with metadata**

```json
{ "tool": "listSessions" }
```

_The response will include sessionId, number of turns, bytes, and timestamps for each session._

**Conversational**

```json
{ "sessionId": "issue-123", "prompt": "Draft tests for utils/sessionStore.ts" }
```

## Error Handling

All tools return errors in a consistent format. If a request is invalid or the underlying CLI fails, the response will include:

- `isError`: true
- `content`: Array with a single object `{ type: 'text', text: <error message> }`
- `meta`: (optional) Additional error details

**Example error response:**

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Missing required 'prompt' (or provide a 'pageToken')."
    }
  ]
}
```
