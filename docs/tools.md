# Tools API

## codex

Runs the local **Codex CLI** using streamed execution. The server strips prompt/context echoes and returns clean output. Large responses are paginated automatically. Supports image input for code or diagram analysis.

### Parameters

#### Example (image input):

```json
{
  "prompt": "Explain this diagram",
  "image": "diagram.png"
}
```

Or for multiple images:

```json
{
  "prompt": "Summarize these diagrams",
  "image": ["img1.png", "img2.jpg"]
}
```

- `prompt` (string, optional): The coding task, question, or analysis request.
- `sessionId` (string, optional): Stable ID to enable conversational context across calls.
- `resetSession` (boolean, optional): If true, clears the session identified by sessionId.
- `pageSize` (number, optional): Approximate characters per page (default 40000).
- `pageToken` (string, optional): Opaque token returned by a previous call to fetch the next page.
- `model` (string, optional): Model name for Codex CLI. If omitted, the server will intelligently auto-select a model based on your prompt.
- `image` (string or string[], optional): Path(s) to image file(s) to analyze or explain. Passed to Codex CLI as `--image`.
- `approvalPolicy` (string, optional): Advanced. Codex CLI `--approval-policy`. Specify approval policy for code execution.
- `sandbox` (boolean, optional): Advanced. Codex CLI `--sandbox`. Run in sandbox mode.
- `workingDirectory` (string, optional): Advanced. Codex CLI `--working-directory`. Set working directory for execution.

- `baseInstructions` (string, optional): Advanced. Codex CLI `--base-instructions`. Set base instructions for the Codex model.

#### Intelligent Model Selection

If you do not specify a model, the server will analyze your prompt and choose the best model for your task (e.g., `o3` for TypeScript/React, `o2` for explanations, `o1` as fallback).

## listTools

Returns all available tools, their input schemas, and descriptions for client/LLM introspection.

**Returns:**

- For each tool: name, description, input schema (with parameter types and descriptions).

**Example output:**

```json
[
  {
    "name": "codex",
    "description": "Run the Codex CLI in non-interactive mode for code analysis, generation, or explanation...",
    "inputSchema": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string", "description": "..." }
        // ...
      }
    }
  }
]
```

### Resume Tool

**resume** — Resume a previous Codex CLI interactive session using `codex resume`.

Parameters: none

Returns: Output from the resumed session.

## listModels

Lists all available Codex models and their descriptions. Use this tool to discover which models can be used with the `model` parameter in the codex tool.

**Parameters:** none

**How it works:**

- Searches for a config file in your home directory:
  - `~/.codex/config.toml`, `~/.codex/config.yaml`, or `~/.codex/config.json`
- Extracts all defined models, including those in profiles.
- Returns a unique list of model names and descriptions.

**Example config (`~/.codex/config.toml`):**

```toml
model = "o4-mini"
model_provider = "openai"

[profiles]
gpt3 = { model = "gpt-3.5-turbo", model_provider = "openai-chat-completions" }
o3 = { model = "o3", model_provider = "openai" }
```

**Returns:**

- A list of model names and descriptions.

**Example output:**

```
- o4-mini: Provider: openai
- gpt-3.5-turbo: Profile: gpt3, Provider: openai-chat-completions
- o3: Profile: o3, Provider: openai
```

**If no config file is found:**

```
No Codex config file found in ~/.codex (config.toml, config.yaml, config.json). Please create one to enable dynamic model listing.
```

- o1: General-purpose model for code and text.
- o2: Model optimized for code explanation and reasoning.
- o3: Model optimized for code generation, especially TypeScript/React.

```

## listSessions

Returns known session IDs. Sessions expire automatically after a configurable TTL (time-to-live). By default, sessions last for 1 hour. You can change this by setting the `CODEX_SESSION_TTL_MS` environment variable (milliseconds). Expired sessions are cleaned up automatically.

## listSessions

Returns all active sessions with metadata.

**Returns:**

- For each session: sessionId, number of turns, bytes used, creation time, last used, expiration time.

**Example output:**

```

- abc123: turns=5, bytes=2048, createdAt=2024-09-22T12:00:00.000Z, lastUsedAt=2024-09-22T12:05:00.000Z, expiresAt=2024-09-22T13:00:00.000Z

```

## deleteSession

Deletes or expires a session by sessionId. Use this to remove a session and free resources.

**Parameters:**

- `sessionId` (string, required): The sessionId to delete.

**Returns:**

- Success or failure message.

**Example:**

```

{ "sessionId": "abc123" }

```

## sessionStats

Get statistics and metadata for a session, including creation time, last used, expiration, number of turns, and bytes used.

**Parameters:**

- `sessionId` (string, required): The sessionId to get statistics for.

**Returns:**

- Session metadata and statistics.

**Example:**

```

{ "sessionId": "abc123" }

````

## codex-reply

Continue a conversation in an existing Codex session using the `codex reply` command. This tool allows you to send a new prompt in the context of a previous conversation (by `conversationId`).

**Parameters:**
- `conversationId` (string, required): The conversation/session ID to continue.
- `prompt` (string, required): The new prompt or message to send in the conversation.

**Returns:**
- The Codex CLI output for the reply.

**Example:**
```json
{ "tool": "codex-reply", "conversationId": "abc123", "prompt": "Add more tests for edge cases." }
````

## ping

Simple echo; defaults to `pong`.

## help

Prints `codex --help` for quick reference.

## Error Handling

All tools return errors in a consistent format. If a request is invalid or the underlying CLI fails, the response will include:

- `isError`: true
- `content`: Array with a single object `{ type: 'text', text: <error message> }`
- `meta`: (optional) Additional error details

**Common error types:**

- Validation errors (missing/invalid parameters)
- CLI execution errors (e.g., Codex CLI not found, permission denied)
- Session errors (invalid or expired sessionId/pageToken)

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
