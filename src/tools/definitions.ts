import { TOOLS, type ToolDefinition } from '../types.js';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: TOOLS.LIST_TOOLS,
    description:
      'List all available tools and their schemas for client introspection.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.HELP,
    description:
      'Get Codex CLI help information. Returns the CLI help output for Codex.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.LIST_MODELS,
    description:
      'List Codex CLI models discovered from ~/.codex/config.(toml|yaml|json). Use this to see models your local CLI is configured for.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.CODEX,
    description:
      'Run the Codex CLI in non-interactive mode for code analysis, generation, or explanation. Supports conversational context (via sessionId), pagination, image input, and model control. If `model` is omitted, the server defaults to "gpt-5 medium". Use `listModels` to discover locally configured models.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description:
            'The coding task, question, or analysis request. If omitted, must provide pageToken.',
        },
        sessionId: {
          type: 'string',
          description:
            'Stable ID for conversational context. If omitted, each call is stateless.',
        },
        resetSession: {
          type: 'boolean',
          description:
            'If true, clears the session for the given sessionId before running.',
        },
        pageSize: {
          type: 'number',
          description:
            'Approximate characters per page (default 40000, min 1000, max 200000).',
        },
        pageToken: {
          type: 'string',
          description:
            'Token from a previous response to fetch the next page of output.',
        },
        model: {
          type: 'string',
          description:
            'Model id for Codex CLI, e.g. "gpt-5 minimal|low|medium|high".',
        },
        image: {
          // JSON Schema union
          type: ['string', 'array'] as any,
          description:
            'Path(s) to image file(s) to analyze or explain. Passed to Codex CLI as --image.',
        },
        approvalPolicy: {
          type: 'string',
          description:
            'Advanced: Codex CLI --approval-policy. Specify approval policy for code execution.',
        },
        sandbox: {
          type: 'boolean',
          description: 'Advanced: Codex CLI --sandbox. Run in sandbox mode.',
        },
        workingDirectory: {
          type: 'string',
          description:
            'Advanced: Codex CLI --working-directory. Set working directory for execution.',
        },
        baseInstructions: {
          type: 'string',
          description:
            'Advanced: Codex CLI --base-instructions. Set base instructions for the Codex model.',
        },
      },
      required: [],
    },
  },
  {
    name: TOOLS.LIST_SESSIONS,
    description:
      'List all active sessions with metadata (sessionId, turns, bytes, createdAt, lastUsedAt, expiresAt).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.PING,
    description:
      'Test MCP server connection. Echoes your message and includes server version in meta.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back',
        },
      },
      required: [],
    },
  },
  {
    name: TOOLS.DELETE_SESSION,
    description:
      'Delete or expire a session by sessionId. Use this to remove a session and free resources. Returns success or failure message.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The sessionId to delete.',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: TOOLS.SESSION_STATS,
    description:
      'Get statistics and metadata for a session, including creation time, last used, expiration, number of turns, and bytes used.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The sessionId to get statistics for.',
        },
      },
      required: ['sessionId'],
    },
  },
];
