import { TOOLS, type ToolDefinition } from '../types.js';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: TOOLS.LIST_TOOLS,
    description: 'List all available tools and their schemas for client introspection.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.LIST_MODELS,
    description:
      'List all available Codex models and their descriptions.\n\nCurrent OpenAI Codex CLI models supported:\n- gpt-4o: Best for complex reasoning, code review, and advanced tasks.\n- gpt-3.5-turbo: General coding, TypeScript, React, and most programming tasks.\n- o4-mini: Fast, lightweight, and quick tasks.\n\nYou can set the model explicitly with the `model` parameter, or let the server intelligently select the best model based on your prompt.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: TOOLS.CODEX,
    description:
      'Run the Codex CLI in non-interactive mode for code analysis, generation, or explanation. Supports conversational context (via sessionId), output pagination, and intelligent model selection. If the `model` parameter is omitted, the server will analyze the prompt and auto-select the best model for the task.\n\nCurrent OpenAI Codex CLI models supported:\n- gpt-4o: Best for complex reasoning, code review, and advanced tasks.\n- gpt-3.5-turbo: General coding, TypeScript, React, and most programming tasks.\n- o4-mini: Fast, lightweight, and quick tasks.\n\nParameters:\n- prompt (string, optional): The coding task, question, or analysis request.\n- sessionId (string, optional): Stable ID for conversational context.\n- resetSession (boolean, optional): If true, clears the session for the given sessionId.\n- pageSize (number, optional): Approximate characters per page (default 40000).\n- pageToken (string, optional): Token to fetch the next page of output.\n- model (string, optional): Model name for Codex CLI. If omitted, the server will auto-select based on the prompt.\n\nExample (explicit model):\n  { "prompt": "Write a Python script", "model": "gpt-3.5-turbo" }\nExample (auto-selection):\n  { "prompt": "Review this code for security issues" }',
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
            'Model name for Codex CLI. If omitted, the server will intelligently select a model based on the prompt.',
        },
      },
      required: [],
    },
  },
  {
    name: TOOLS.RESUME,
    description:
      'Resume a previous Codex CLI interactive session by invoking `codex resume`. No parameters required. Returns the output from the resumed session.\n\nExample:\n  { "tool": "resume" }',
    inputSchema: {
      type: 'object',
      properties: {},
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
    name: TOOLS.HELP,
    description: 'Get Codex CLI help information',
    inputSchema: {
      type: 'object',
      properties: {},
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
