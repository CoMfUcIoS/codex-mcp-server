# Codex MCP Server

MCP server wrapper for OpenAI Codex CLI that enables Claude Code to leverage Codex's AI capabilities directly.

```mermaid
graph LR
    A[Claude Code] --> B[Codex MCP Server]

    B --> C[codex tool]
    B --> H[listSessions tool]
    B --> D[ping tool]
    B --> E[help tool]

    C --> F[Codex CLI]
    F --> G[OpenAI API]

    style A fill:#FF6B35
    style B fill:#4A90E2
    style C fill:#00D4AA
    style D fill:#00D4AA
    style E fill:#00D4AA
    style F fill:#FFA500
    style G fill:#FF9500
    style H fill:#00D4AA

```

## Prerequisites

- **OpenAI Codex CLI** must be pre-installed and configured
  - Install: `npm i -g @openai/codex` or `brew install codex`
  - Setup: Run `codex login` or set `OPENAI_API_KEY` environment variable
- **Claude Code** installed

## Installation

### One-Click Installation

#### VS Code

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Codex_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=codex-cli&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40comfucios%2Fcodex-mcp-server%22%5D%7D)

#### VS Code Insiders

[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Codex_MCP_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=codex-cli&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40comfucios%2Fcodex-mcp-server%22%5D%7D)

#### Cursor

[![Install in Cursor](https://img.shields.io/badge/Cursor-Install_Codex_MCP_Server-00D8FF?style=flat-square&logo=cursor&logoColor=white)](https://cursor.com/en/install-mcp?name=codex&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IC15IEBjb21mdWNpb3MvY29kZXgtbWNwLXNlcnZlciIsImVudiI6e319)

### Manual Installation

#### Claude Code

```bash
claude mcp add codex-cli -- npx -y @comfucios/codex-mcp-server
```

#### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "npx",
      "args": ["-y", "@comfucios/codex-mcp-server"]
    }
  }
}
```

## Advanced Features & Tips

- **Graceful Shutdown:** The server handles SIGINT and SIGTERM for clean shutdowns, ensuring clients do not see abrupt disconnects.
- **Pagination:** Large outputs are split into pages, with `nextPageToken` and `pageToken` for navigation. Control default size with `CODEX_PAGE_SIZE`.
- **Session Management:** Use `sessionId` for conversational context, with automatic expiration (TTL configurable via `CODEX_SESSION_TTL_MS`).
- **Tool Discovery:** Call `listTools` to get a machine-readable list of all available tools and their schemas for client introspection.

## Environment Variables

You can configure the server using the following environment variables:

- `CODEX_PAGE_SIZE`: Default page size for paginated outputs (default: 40000, min: 1000, max: 200000).
- `CODEX_SESSION_TTL_MS`: Session time-to-live in milliseconds (default: 3600000, i.e., 1 hour).
- `OPENAI_API_KEY`: Your OpenAI API key (required for Codex CLI).

Set these in your shell or `.env` file as needed.

## Troubleshooting

**Common Issues:**

- **Codex CLI not found:**
  - Ensure `@openai/codex` is installed globally (`npm i -g @openai/codex` or `brew install codex`).
  - Check your `PATH` includes the directory where Codex CLI is installed.
- **Missing API key:**
  - Set the `OPENAI_API_KEY` environment variable or run `codex login`.
- **No config file found:**
  - Create a config file at `~/.codex/config.toml`, `~/.codex/config.yaml`, or `~/.codex/config.json`.
- **Session expired:**
  - Sessions expire after the configured TTL. Use a new `sessionId` or adjust `CODEX_SESSION_TTL_MS`.
- **Large output truncated:**
  - Use pagination (`nextPageToken`/`pageToken`) or increase `CODEX_PAGE_SIZE`.

If you encounter other issues, check logs or open an issue on the project repository.

### Error Handling

All tools return structured error messages for invalid arguments, tool names, or execution failures. Errors are always returned in a consistent format:

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "Error message here" }]
}
```

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

All errors include a clear message and the tool name for easier debugging.

### Tool Discovery & Introspection

You can discover all available tools and their schemas by calling the `listTools` tool. This returns a machine-readable list of all supported tools, their descriptions, and input schemas—ideal for client introspection and dynamic UI generation.

**Example:**

```json
{ "tool": "listTools" }
```

The response will be a JSON array describing each tool and its parameters.

## Usage in Claude Code

Once installed, Claude Code can use these tools:

### `codex` - AI Coding Assistant

Ask Codex to analyze code, generate solutions, or provide coding assistance. Now supports image input for code or diagram analysis.

**Usage:**

```
Use the codex tool to explain this function:
[paste your code here]
```

**Parameters:**

- `prompt` (optional): Your coding question or request. Required on the first call.
- `pageSize` (optional, number): Approximate characters per page (default 40,000).
- `pageToken` (optional, string): Opaque token returned from a previous call to fetch the next chunk of output.
- `sessionId` (optional, string): Stable ID to enable conversational context across calls.
- `resetSession` (optional, boolean): If true, clears the session identified by sessionId.
- `image` (optional, string or string[]): Path(s) to image file(s) to analyze or explain. Passed to Codex CLI as `--image`.
- `approvalPolicy` (optional, string): Advanced. Codex CLI `--approval-policy`. Specify approval policy for code execution.
- `sandbox` (optional, boolean): Advanced. Codex CLI `--sandbox`. Run in sandbox mode.
- `workingDirectory` (optional, string): Advanced. Codex CLI `--working-directory`. Set working directory for execution.

- `baseInstructions` (optional, string): Advanced. Codex CLI `--base-instructions`. Set base instructions for the Codex model.

**Examples:**

Basic prompt:

```json
{
  "prompt": "Explain this TypeScript function"
}
```

Image input:

```json
{
  "prompt": "Explain this diagram",
  "image": "diagram.png"
}
```

Multiple images:

```json
{
  "prompt": "Summarize these diagrams",
  "image": ["img1.png", "img2.jpg"]
}
```

Advanced options:

```json
{
  "prompt": "Run this code in a sandbox",
  "sandbox": true,
  "workingDirectory": "/tmp/safe",
  "baseInstructions": "Always comment code."
}

### `listSessions` - List Active Sessions

Useful for debugging or selecting a session to clear. If you want to clear the session you can use the `resetSession` parameter.

### `deleteSession` - Delete a Session

Delete or expire a session by sessionId.

**Usage:**

```json
{ "tool": "deleteSession", "sessionId": "abc123" }
```

### `sessionStats` - Session Statistics

Get statistics and metadata for a session.

**Usage:**

```json
{ "tool": "sessionStats", "sessionId": "abc123" }
```

### `ping` - Connection Test

Test if the MCP server is working properly.

### `help` - Codex CLI Help

Get information about Codex CLI capabilities and commands.

### Tool Discovery

Call `listTools` to get a machine-readable list of all available tools and their schemas for client introspection.

```json
{ "tool": "listTools" }
```

## Example Workflows

**Code Analysis:**

```
Please use the codex tool to review this TypeScript function and suggest improvements
```

**Bug Fixing:**

```
Use codex to help debug this error: [error message]
```

**Code Generation:**

```
Ask codex to create a React component that handles file uploads
```

**List all sessions with metadata:**

```json
{ "tool": "listSessions" }
```

**Delete a session:**

```json
{ "tool": "deleteSession", "sessionId": "abc123" }
```

**Get session statistics:**

```json
{ "tool": "sessionStats", "sessionId": "abc123" }
```

### `listModels` – Dynamic Model Listing

Lists all available Codex models and their descriptions by reading your Codex configuration files.

**How it works:**

- The server searches for a config file in your home directory:
  - `~/.codex/config.toml`
  - `~/.codex/config.yaml`
  - `~/.codex/config.json`
- It parses the config to extract all defined models, including those in profiles.
- The tool returns a unique list of model names and their descriptions.

**Example config (`~/.codex/config.toml`):**

```toml
model = "o4-mini"
model_provider = "openai"

[profiles]
gpt3 = { model = "gpt-3.5-turbo", model_provider = "openai-chat-completions" }
o3 = { model = "o3", model_provider = "openai" }
```

**Example Output:**

```
- o4-mini: Provider: openai
- gpt-3.5-turbo: Profile: gpt3, Provider: openai-chat-completions
- o3: Profile: o3, Provider: openai
```

**If no config file is found:**  
You’ll receive a helpful error message explaining how to add one.

> Supported config formats: TOML, YAML, JSON.

### Pagination Example

When Codex’s output is very large, the server automatically returns a `nextPageToken` in the result. You can use this token to fetch subsequent chunks:

1. First call:
   ```json
   { "tool": "codex", "prompt": "...", "pageSize": 10000 }
   ```
   (Response includes `nextPageToken` if more output is available)
2. Next page:
   ```json
   { "tool": "codex", "pageToken": "<nextPageToken>" }
   ```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Start built server
npm start
```

## Testing & Quality

This project uses **Jest** for unit and integration testing. Handlers, server logic, and tool integrations are covered with both unit and light integration tests (mocking external dependencies and CLI calls).

### Run All Tests

```bash
npm test
```

---

See [`docs/tools.md`](docs/tools.md) and [`docs/usage.md`](docs/usage.md) for full API and usage documentation.
