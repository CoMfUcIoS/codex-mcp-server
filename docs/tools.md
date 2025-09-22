# Tools API

## codex

Runs the local **Codex CLI** using streamed execution. The server strips prompt/context echoes and returns clean output. Large responses are paginated automatically.

### Parameters

- `prompt` (string, optional): The coding task, question, or analysis request.
- `sessionId` (string, optional): Stable ID to enable conversational context across calls.
- `resetSession` (boolean, optional): If true, clears the session identified by sessionId.
- `pageSize` (number, optional): Approximate characters per page (default 40000).
- `pageToken` (string, optional): Opaque token returned by a previous call to fetch the next page.
- `model` (string, optional): Model name for Codex CLI. If omitted, the server will intelligently auto-select a model based on your prompt (e.g., code generation, explanation, etc.).

#### Intelligent Model Selection

If you do not specify a model, the server will analyze your prompt and choose the best model for your task (e.g., `o3` for TypeScript/React, `o2` for explanations, `o1` as fallback).

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
```

## ping

Simple echo; defaults to `pong`.

## help

Prints `codex --help` for quick reference.
