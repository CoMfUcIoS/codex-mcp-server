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
    name: TOOLS.LIST_MODELS,
    description:
      'List Codex CLI models and their descriptions.\n\nCurrent Codex CLI model ids (as your build reports):\n- gpt-5 minimal — fastest, limited reasoning\n- gpt-5 low — some reasoning, still quick\n- gpt-5 medium — balanced default\n- gpt-5 high — deepest reasoning\n\nYou can set the model via the `model` parameter, or let the server auto-select.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.CODEX,
    description:
      'Run the Codex CLI in non-interactive mode for code analysis, generation, or explanation. Supports conversational context (via sessionId), pagination, and intelligent model selection. If `model` is omitted, the server uses a Codex-compatible default.\n\nModels supported by your Codex CLI:\n- gpt-5 minimal (fast)\n- gpt-5 low (balanced speed)\n- gpt-5 medium (default)\n- gpt-5 high (deeper reasoning)\n\nParameters:\n- prompt (string, optional): The coding task or question.\n- sessionId (string, optional): Stable ID for conversational context.\n- resetSession (boolean, optional): Clear the session.\n- pageSize (number, optional): Approx chars per page (default 40000).\n- pageToken (string, optional): Next page cursor.\n- model (string, optional): One of the Codex CLI model ids above.\n- image (string|string[], optional): Paths to images.\n- approvalPolicy / sandbox / workingDirectory / baseInstructions: Advanced CLI options.',
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
            'Model id for Codex CLI. Examples: "gpt-5 medium", "gpt-5 high".',
        },
        image: {
          type: ['string', 'array'],
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
      'List all currently active sessionIds managed by the server (subject to TTL).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.PING,
    description: 'Test MCP server connection',
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
