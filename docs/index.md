# Codex MCP Server

**MCP server wrapper for the OpenAI Codex CLI. Enable Claude Code (and other MCP clients) to use Codex locally via stdio.**

```mermaid
graph LR
    A[Claude Code / MCP Client] --> B[Codex MCP Server]
    B --> C[codex]
    B --> L[listTools]
    B --> S[listSessions]
    B --> X[deleteSession]
    B --> T[sessionStats]
    B --> P[ping]
    B --> H[help]
    B --> M[listModels]
    C --> F[Codex CLI]
    F --> G[OpenAI API]
    style A fill:#FF6B35
    style B fill:#4A90E2
    style C fill:#00D4AA
    style L fill:#00D4AA
    style S fill:#00D4AA
    style X fill:#00D4AA
    style T fill:#00D4AA
    style P fill:#00D4AA
    style H fill:#00D4AA
    style M fill:#00D4AA
    style F fill:#FFA500
    style G fill:#FF9500
```

<div class="grid cards" markdown>

-   :rocket: **One‑click install**
    ---
    [VS Code](https://vscode.dev/redirect/mcp/install?name=codex-cli&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40comfucios%2Fcodex-mcp-server%22%5D%7D) ·
    [VS Code Insiders](https://insiders.vscode.dev/redirect/mcp/install?name=codex-cli&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40comfucios%2Fcodex-mcp-server%22%5D%7D) ·
    [Cursor](https://cursor.com/en/install-mcp?name=codex&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IC15IEBjb21mdWNpb3MvY29kZXgtbWNwLXNlcnZlciIsImVudiI6e319)

-   :gear: **MCP tools**
    ---
    `codex`, `listTools`, `listSessions`, `deleteSession`, `sessionStats`, `listModels`, `ping`, `help`

-   :shield: **Requirements**
    ---
    - Codex CLI (`npm i -g @openai/codex` or `brew install codex`)
    - `codex login` or `OPENAI_API_KEY`
    - Node ≥ 18.18

</div>
