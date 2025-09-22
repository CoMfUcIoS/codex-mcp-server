# FAQ

**Does it support intelligent model selection?**  
Yes—if you do not specify a model, the server will analyze your prompt and choose the best model for your task.

**Can I resume a previous Codex CLI session?**  
Yes—use the `resume` tool to invoke `codex resume` and continue a previous session.

**Is this server stateful?**  
Only if you pass `sessionId`. Otherwise, each call is stateless.

**Can I run this without exposing an HTTP port?**  
Yes—stdio transport only.

**Does it support tool discovery?**  
Yes—`ListTools` returns schemas for all tools.

**How do I clear a session?**  
Call `codex` with `{ "sessionId": "id", "resetSession": true, "prompt": "..." }`.

**How do I delete a session?**  
Use the `deleteSession` tool with `{ "sessionId": "your-session-id" }` to remove a session and free resources.

**How do I get statistics for a session?**  
Use the `sessionStats` tool with `{ "sessionId": "your-session-id" }` to get metadata and statistics for a session.

**How do I list all sessions with metadata?**  
Use the `listSessions` tool to get all active sessions, including sessionId, number of turns, bytes, and timestamps.
