# Changelog

## 1.0.1
- Initial public release (comfucios fork)
- Added tools: `listModels`, `deleteSession`, `sessionStats`, `listTools`
- Pagination with expiring `nextPageToken` (~10 min)
- Session memory with TTL (`CODEX_SESSION_TTL_MS`) and size cap (`CODEX_SESSION_MAX_BYTES`)
- Image input support for `codex`
- Model control for `gpt-5` with reasoning effort (`minimal|low|medium|high`)
