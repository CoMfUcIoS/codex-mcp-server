# FAQ

**Does it auto‑select a model?**  
If you don’t specify `model`, the server uses `"gpt-5 medium"`. You can override with `"gpt-5 minimal|low|medium|high"`.

**Can I resume an interactive Codex CLI session?**  
This server runs Codex non‑interactively per request (with optional `sessionId` memory). There is **no separate `resume` tool**.

**Is the server stateful?**  
Only when you pass `sessionId`. Otherwise, each call is stateless.

**Do I need to open a port?**  
No. The server uses **stdio** (MCP).

**Tool discovery?**  
Yes—`listTools` returns all tools and their JSON schemas.

**How do I clear a session?**  
Use `deleteSession` with `{ "sessionId": "..." }` or call `codex` with `{ "sessionId": "id", "resetSession": true, "prompt": "..." }`.

**How do I get session statistics?**  
Use `sessionStats` with `{ "sessionId": "..." }`.

**How do I list all sessions with metadata?**  
Use `listSessions`.
