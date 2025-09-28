# Tools API

This server exposes MCP tools that wrap the local **Codex CLI**. Outputs are cleaned (prompt/context echoes removed) and paginated when large.

## Available tools

- `codex`
- `listSessions`
- `deleteSession`
- `sessionStats`
- `listModels`
- `listTools`
- `ping`
- `help`

---

## codex

Run the Codex CLI non‑interactively for code analysis, generation, or explanation. Supports conversational context (`sessionId`), pagination, **image input**, and **model control**.

### Parameters

- `prompt` (string, optional): Coding task or question. Required on the first call unless you provide `pageToken`.
- `sessionId` (string, optional): Stable ID to enable conversational context across calls.
- `resetSession` (boolean, optional): If `true`, clears the session identified by `sessionId` before running.
- `pageSize` (number, optional): Approximate characters per page (default `40000`, min `1000`, max `200000`).
- `pageToken` (string, optional): Opaque token returned from a previous call to fetch the next chunk.
- `model` (string, optional): Choose **gpt‑5** with reasoning effort, e.g. `"gpt-5 minimal" | "gpt-5 low" | "gpt-5 medium" | "gpt-5 high"`. Defaults to `"gpt-5 medium"`.
- `image` (string or string[], optional): Path(s) to image file(s) for code/diagram analysis (passed to CLI as `--image`).
- `approvalPolicy` (string, optional): Advanced. Codex CLI `--approval-policy`.
- `sandbox` (boolean, optional): Advanced. Codex CLI `--sandbox`.
- `workingDirectory` (string, optional): Advanced. Codex CLI `--working-directory`.
- `baseInstructions` (string, optional): Advanced. Codex CLI `--base-instructions`.

#### Examples

Single image:

```json
{ "prompt": "Explain this diagram", "image": "diagram.png" }
```

Multiple images:

```json
{ "prompt": "Summarize these diagrams", "image": ["img1.png", "img2.jpg"] }
```

### Notes on model selection

If you omit `model`, the server defaults to `"gpt-5 medium"`. Values are validated against an allowlist to avoid CLI errors; unsupported values fall back to `"gpt-5 medium"` while logging a warning.

---

## listTools

Return a machine‑readable list of all tools with input schemas and descriptions (useful for client/LLM introspection).

**Example output (abridged):**

```json
[ { "name": "codex", "description": "...", "inputSchema": { "type": "object", "properties": { "prompt": { "type": "string" } } } } ]
```

---

## listModels

List Codex models discovered from your local config files:

- `~/.codex/config.toml`
- `~/.codex/config.yaml`
- `~/.codex/config.json`

Outputs a unique list of model names and optional descriptions (e.g., provider or profile). If no config is found or parsing fails, a clear error is returned.

---

## listSessions

Return all active sessions with metadata. Sessions expire automatically after `CODEX_SESSION_TTL_MS`.

**Returns per session:**

- `sessionId`
- `turns`
- `bytes`
- `createdAt` (ISO)
- `lastUsedAt` (ISO)
- `expiresAt` (ISO)

---

## deleteSession

Delete/expire a session by ID.

**Parameters:**

- `sessionId` (string, required)

**Returns:** success/failure text

---

## sessionStats

Detailed statistics for a single session.

**Parameters:**

- `sessionId` (string, required)

**Returns:** formatted text with turns/bytes/timestamps

---

## ping

Echo test (defaults to `"pong"`).

---

## help

Passthrough of `codex --help`.

---

## Error handling

All tools use a consistent error shape. Validation issues, CLI errors, and session/pagination errors produce:

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "..." }]
}
```

