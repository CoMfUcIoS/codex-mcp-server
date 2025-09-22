import {
  TOOLS,
  type ToolResult,
  type CodexToolArgs,
  type PingToolArgs,
  CodexToolSchema,
  PingToolSchema,
  HelpToolSchema,
  ListSessionsToolSchema,
  CodexReplyToolSchema,
  CodexReplyToolArgs,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { executeCommand, executeCommandStreamed } from '../utils/command.js';

import { ZodError } from 'zod';
import { saveChunk, peekChunk, advanceChunk } from '../utils/cursorStore.js';
import {
  appendTurn,
  getTranscript,
  clearSession,
  listSessionIds,
} from '../utils/sessionStore.js';
import { toolDefinitions } from './definitions.js';
import {
  makeRunId,
  buildPromptWithSentinels,
  stripEchoesAndMarkers,
} from '../utils/promptSanitizer.js';

export class CodexToolHandler {
  private executeCommandStreamed: typeof executeCommandStreamed;
  private clearSession: typeof clearSession;
  private appendTurn: typeof appendTurn;
  private getTranscript: typeof getTranscript;
  private saveChunk: typeof saveChunk;
  private peekChunk: typeof peekChunk;
  private advanceChunk: typeof advanceChunk;
  private makeRunId: typeof makeRunId;
  private buildPromptWithSentinels: typeof buildPromptWithSentinels;
  private stripEchoesAndMarkers: typeof stripEchoesAndMarkers;

  constructor(
    deps?: Partial<{
      executeCommandStreamed: typeof executeCommandStreamed;
      clearSession: typeof clearSession;
      appendTurn: typeof appendTurn;
      getTranscript: typeof getTranscript;
      saveChunk: typeof saveChunk;
      peekChunk: typeof peekChunk;
      advanceChunk: typeof advanceChunk;
      makeRunId: typeof makeRunId;
      buildPromptWithSentinels: typeof buildPromptWithSentinels;
      stripEchoesAndMarkers: typeof stripEchoesAndMarkers;
    }>
  ) {
    this.executeCommandStreamed =
      deps?.executeCommandStreamed ?? executeCommandStreamed;
    this.clearSession = deps?.clearSession ?? clearSession;
    this.appendTurn = deps?.appendTurn ?? appendTurn;
    this.getTranscript = deps?.getTranscript ?? getTranscript;
    this.saveChunk = deps?.saveChunk ?? saveChunk;
    this.peekChunk = deps?.peekChunk ?? peekChunk;
    this.advanceChunk = deps?.advanceChunk ?? advanceChunk;
    this.makeRunId = deps?.makeRunId ?? makeRunId;
    this.buildPromptWithSentinels =
      deps?.buildPromptWithSentinels ?? buildPromptWithSentinels;
    this.stripEchoesAndMarkers =
      deps?.stripEchoesAndMarkers ?? stripEchoesAndMarkers;
  }

  async execute(args: unknown): Promise<ToolResult> {
    try {
      const {
        prompt,
        pageSize,
        pageToken,
        sessionId,
        resetSession,
        model,
        image,
        approvalPolicy,
        sandbox,
        workingDirectory,
        baseInstructions,
      }: CodexToolArgs & {
        model?: string;
        image?: string | string[];
        approvalPolicy?: string;
        sandbox?: boolean;
        workingDirectory?: string;
        baseInstructions?: string;
      } = CodexToolSchema.parse(args);

      const DEFAULT_PAGE = Number(process.env.CODEX_PAGE_SIZE ?? 40000);
      const pageLen = Math.max(
        1000,
        Math.min(Number(pageSize ?? DEFAULT_PAGE), 200000)
      );

      if (sessionId && resetSession) {
        this.clearSession(sessionId);
        // do not return here; user may supply a fresh prompt in the same call
      }

      // Subsequent page request
      if (pageToken) {
        const remaining = this.peekChunk(String(pageToken));
        if (!remaining) {
          return {
            content: [
              {
                type: 'text',
                text: 'No data found for pageToken (it may have expired).',
              },
            ],
          };
        }
        const head = remaining.slice(0, pageLen);
        const tail = remaining.slice(pageLen);
        // advance in-place; keep token stable for idempotent retries
        this.advanceChunk(String(pageToken), head.length);
        const meta = tail.length
          ? { nextPageToken: String(pageToken) }
          : undefined;
        return {
          content: [
            { type: 'text', text: head },
            ...(meta?.nextPageToken
              ? [
                  {
                    type: 'text' as const,
                    text: `{"nextPageToken":"${meta.nextPageToken}"}`,
                  },
                ]
              : []),
          ],
          ...(meta ? { meta } : {}),
        };
      }

      // First page request must have a prompt
      const cleanPrompt = String(prompt ?? '').trim();
      if (!cleanPrompt) {
        throw new ValidationError(
          TOOLS.CODEX,
          "Missing required 'prompt' (or provide a 'pageToken')."
        );
      }

      // Intelligent model selection
      let selectedModel = model;
      if (!selectedModel) {
        const p = cleanPrompt.toLowerCase();
        // Use gpt-4o for complex reasoning, code review, or advanced tasks
        if (
          /reason|review|analyze|explain|refactor|why|how|describe|architecture|security|test|coverage/.test(
            p
          )
        ) {
          selectedModel = 'gpt-4o';
          // Use o4-mini for fast, lightweight, or quick tasks
        } else if (/quick|fast|mini|lightweight|small|snippet/.test(p)) {
          selectedModel = 'o4-mini';
          // Use gpt-3.5-turbo for general coding, TypeScript, React, or frontend
        } else if (
          /typescript|react|frontend|ui|component|jsx|tsx|javascript|python|generate|write|implement|create|function|class|api|endpoint/.test(
            p
          )
        ) {
          selectedModel = 'gpt-3.5-turbo';
        } else {
          // Fallback to gpt-3.5-turbo as a safe default
          selectedModel = 'gpt-3.5-turbo';
        }
      }

      // Build an effective prompt with session context if provided, fenced by sentinels
      const prior = sessionId ? (this.getTranscript(sessionId) ?? []) : [];
      const stitched =
        prior.length > 0
          ? prior
              .map(
                (t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`
              )
              .join('\n')
          : null;
      const runId = this.makeRunId();
      const effectivePrompt = this.buildPromptWithSentinels(
        runId,
        stitched,
        cleanPrompt
      );

      // Build CLI args
      const cliArgs = ['exec'];
      if (selectedModel) {
        cliArgs.push('-m', selectedModel);
      }

      // Add image input if provided
      if (image) {
        const images = Array.isArray(image) ? image : [image];
        cliArgs.push('--image', images.join(','));
      }

      // Add advanced CLI options if provided
      if (approvalPolicy) {
        cliArgs.push('--approval-policy', approvalPolicy);
      }
      if (sandbox) {
        cliArgs.push('--sandbox');
      }
      if (workingDirectory) {
        cliArgs.push('--working-directory', workingDirectory);
      }
      if (baseInstructions) {
        cliArgs.push('--base-instructions', baseInstructions);
      }

      cliArgs.push(effectivePrompt);

      // Use streamed execution to avoid maxBuffer and handle very large outputs.
      const result = await this.executeCommandStreamed('codex', cliArgs);

      // Strip any echoed context/prompt and sentinels to return only the new answer
      const outputRaw = result.stdout || 'No output from Codex';
      const output = this.stripEchoesAndMarkers(runId, stitched, outputRaw);

      if (output.length <= pageLen) {
        // Append turns to session after successful run (if enabled)
        if (sessionId) {
          this.appendTurn(sessionId, 'user', cleanPrompt);
          this.appendTurn(sessionId, 'assistant', output);
        }
        return { content: [{ type: 'text', text: output }] };
      }

      const head = output.slice(0, pageLen);
      const tail = output.slice(pageLen);
      const meta = { nextPageToken: this.saveChunk(tail) };
      // Append full output to session (not only the head), so future context is complete
      if (sessionId) {
        this.appendTurn(sessionId, 'user', cleanPrompt);
        this.appendTurn(sessionId, 'assistant', output);
      }
      return {
        content: [
          { type: 'text', text: head },
          { type: 'text', text: `{"nextPageToken":"${meta.nextPageToken}"}` },
        ],
        meta,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.CODEX, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.CODEX,
        'Failed to execute codex command',
        error
      );
    }
  }
}

export class ListSessionsToolHandler {
  private listSessionMeta: () => Promise<any>;
  constructor(deps?: Partial<{ listSessionMeta: () => Promise<any> }>) {
    this.listSessionMeta =
      deps?.listSessionMeta ??
      (async () => {
        // fallback to dynamic import for prod
        const mod = await import('../utils/sessionStore.js');
        return mod.listSessionMeta();
      });
  }
  async execute(args: unknown): Promise<ToolResult> {
    try {
      ListSessionsToolSchema.parse(args);
      const meta = await this.listSessionMeta();
      if (!meta.length) {
        return { content: [{ type: 'text', text: 'No active sessions.' }] };
      }
      const text = meta
        .map(
          (s: {
            sessionId: string;
            turns: number;
            bytes: number;
            createdAt: number;
            lastUsedAt: number;
            expiresAt: number;
          }) =>
            s
              ? `- ${s.sessionId}: turns=${s.turns}, bytes=${s.bytes}, createdAt=${new Date(s.createdAt).toISOString()}, lastUsedAt=${new Date(s.lastUsedAt).toISOString()}, expiresAt=${new Date(s.expiresAt).toISOString()}`
              : ''
        )
        .filter(Boolean)
        .join('\n');
      return { content: [{ type: 'text', text }] };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.LIST_SESSIONS, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.LIST_SESSIONS,
        'Failed to list sessions',
        error
      );
    }
  }
}

export class PingToolHandler {
  private pingSchema: typeof PingToolSchema;
  constructor(deps?: Partial<{ pingSchema: typeof PingToolSchema }>) {
    this.pingSchema = deps?.pingSchema ?? PingToolSchema;
  }
  async execute(args: unknown): Promise<ToolResult> {
    try {
      const { message = 'pong' }: PingToolArgs = this.pingSchema.parse(args);

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.PING, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.PING,
        'Failed to execute ping command',
        error
      );
    }
  }
}

export class ResumeToolHandler {
  async execute(_args: unknown): Promise<ToolResult> {
    try {
      // Call 'codex resume' and return output
      const result = await executeCommand('codex', ['resume']);
      return {
        content: [
          {
            type: 'text',
            text: result.stdout || 'No output from codex resume',
          },
        ],
      };
    } catch (error) {
      throw new ToolExecutionError(
        'resume',
        'Failed to execute codex resume',
        error
      );
    }
  }
}

import fs from 'fs/promises';
import os from 'os';
let toml: typeof import('toml');
let yaml: typeof import('yaml');

export class ListModelsToolHandler {
  private injectedFs?: typeof import('fs/promises');
  constructor(deps?: Partial<{ fs: typeof import('fs/promises') }>) {
    if (deps?.fs) {
      this.injectedFs = deps.fs;
    }
  }

  async execute(_args: unknown): Promise<ToolResult> {
    const fs = this.injectedFs ?? (await import('fs/promises'));
    // Search for config files in order: TOML, YAML, JSON
    const configPaths = [
      `${os.homedir()}/.codex/config.toml`,
      `${os.homedir()}/.codex/config.yaml`,
      `${os.homedir()}/.codex/config.json`,
    ];
    let config: any = null;
    let format: 'toml' | 'yaml' | 'json' | null = null;
    let parseError: { path: string; error: any } | null = null;
    let foundConfigFile = false;
    for (const path of configPaths) {
      try {
        const data = await fs.readFile(path, 'utf8');
        foundConfigFile = true;
        try {
          if (path.endsWith('.toml')) {
            if (!toml) toml = await import('toml');
            config = toml.parse(data);
            format = 'toml';
          } else if (path.endsWith('.yaml')) {
            if (!yaml) yaml = await import('yaml');
            config = yaml.parse(data);
            format = 'yaml';
          } else if (path.endsWith('.json')) {
            config = JSON.parse(data);
            format = 'json';
          }
        } catch (err) {
          parseError = { path, error: err };
          continue; // Try next config file
        }
        break; // Successfully parsed
      } catch (err) {
        // File not found, try next
      }
    }
    if (!config) {
      if (parseError && foundConfigFile) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to parse Codex config file at ${parseError.path}: ${parseError.error?.message || parseError.error}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: 'No Codex config file found in ~/.codex (config.toml, config.yaml, config.json). Please create one to enable dynamic model listing.',
          },
        ],
        isError: true,
      };
    }

    // Extract models from config
    const models: { name: string; description?: string }[] = [];
    // 1. Top-level model
    if (config.model) {
      models.push({
        name: config.model,
        description: config.model_provider
          ? `Provider: ${config.model_provider}`
          : undefined,
      });
    }
    // 2. Profiles (TOML: [profiles], YAML/JSON: profiles)
    const profiles =
      config.profiles ||
      (config.profiles === undefined && config['[profiles]']);
    if (profiles && typeof profiles === 'object') {
      for (const [profileName, profile] of Object.entries(profiles)) {
        if (
          profile &&
          typeof profile === 'object' &&
          'model' in profile &&
          typeof (profile as any).model === 'string'
        ) {
          models.push({
            name: (profile as any).model,
            description: `Profile: ${profileName}${(profile as any).model_provider ? `, Provider: ${(profile as any).model_provider}` : ''}`,
          });
        }
      }
    }
    // 3. Providers (optional, for extra info)
    // 4. Remove duplicates
    const uniqueModels = Array.from(
      new Map(models.map((m) => [m.name, m])).values()
    );
    if (uniqueModels.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No models found in Codex config file.',
          },
        ],
        isError: true,
      };
    }
    const text = uniqueModels
      .map((m) => `- ${m.name}${m.description ? ': ' + m.description : ''}`)
      .join('\n');
    return { content: [{ type: 'text', text }] };
  }
}

export class HelpToolHandler {
  private executeCommand: typeof executeCommand;
  constructor(deps?: Partial<{ executeCommand: typeof executeCommand }>) {
    this.executeCommand = deps?.executeCommand ?? executeCommand;
  }
  async execute(args: unknown): Promise<ToolResult> {
    try {
      HelpToolSchema.parse(args);

      const result = await this.executeCommand('codex', ['--help']);

      return {
        content: [
          {
            type: 'text',
            text: result.stdout || 'No help information available',
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.HELP, error.message);
      }
      // Log the error details for debugging
      console.error('[HelpToolHandler] Error executing help command:', error);
      if (error instanceof Error && error.stack) {
        console.error('[HelpToolHandler] Stack trace:', error.stack);
      }
      throw new ToolExecutionError(
        TOOLS.HELP,
        error instanceof Error
          ? `Failed to execute help command: ${error.message}`
          : 'Failed to execute help command',
        error
      );
    }
  }
}

export class DeleteSessionToolHandler {
  private clearSession: (sessionId: string) => void;
  constructor(deps?: Partial<{ clearSession: (sessionId: string) => void }>) {
    this.clearSession = deps?.clearSession ?? (() => {});
  }
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { sessionId } = args as { sessionId: string };
      if (!this.clearSession) {
        const { clearSession } = await import('../utils/sessionStore.js');
        this.clearSession = clearSession;
      }
      this.clearSession(sessionId);
      return {
        content: [{ type: 'text', text: `Session ${sessionId} deleted.` }],
      };
    } catch (error) {
      throw new ToolExecutionError(
        TOOLS.DELETE_SESSION,
        'Failed to delete session',
        error
      );
    }
  }
}

export class SessionStatsToolHandler {
  private getSessionMeta?: (sessionId: string) => any;
  constructor(deps?: Partial<{ getSessionMeta: (sessionId: string) => any }>) {
    this.getSessionMeta = deps?.getSessionMeta;
  }
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { sessionId } = args as { sessionId: string };
      if (!this.getSessionMeta) {
        const { getSessionMeta } = await import('../utils/sessionStore.js');
        this.getSessionMeta = getSessionMeta;
      }
      const meta = this.getSessionMeta(sessionId);
      if (!meta) {
        return {
          content: [{ type: 'text', text: `Session ${sessionId} not found.` }],
        };
      }
      const text = `Session ${sessionId}:\nturns=${meta.turns}\nbytes=${meta.bytes}\ncreatedAt=${new Date(meta.createdAt).toISOString()}\nlastUsedAt=${new Date(meta.lastUsedAt).toISOString()}\nexpiresAt=${new Date(meta.expiresAt).toISOString()}`;
      return { content: [{ type: 'text', text }] };
    } catch (error) {
      throw new ToolExecutionError(
        TOOLS.SESSION_STATS,
        'failed to get session stats',
        error
      );
    }
  }
}

// Tool handler registry
export class ListToolsToolHandler {
  async execute(): Promise<ToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(toolDefinitions, null, 2),
        },
      ],
    };
  }
}

export class CodexReplyToolHandler {
  private executeCommandStreamed: typeof executeCommandStreamed;
  constructor(
    deps?: Partial<{ executeCommandStreamed: typeof executeCommandStreamed }>
  ) {
    this.executeCommandStreamed =
      deps?.executeCommandStreamed ?? executeCommandStreamed;
  }
  async execute(args: unknown): Promise<ToolResult> {
    try {
      const { conversationId, prompt }: CodexReplyToolArgs =
        CodexReplyToolSchema.parse(args);
      const cliArgs = ['reply', '-c', conversationId, prompt];
      const result = await this.executeCommandStreamed('codex', cliArgs);
      return {
        content: [
          { type: 'text', text: result.stdout || 'No output from Codex reply' },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.CODEX_REPLY, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.CODEX_REPLY,
        'Failed to execute codex-reply command',
        error
      );
    }
  }
}

export const toolHandlers = {
  [TOOLS.CODEX]: new CodexToolHandler(),
  [TOOLS.LIST_SESSIONS]: new ListSessionsToolHandler(),
  [TOOLS.PING]: new PingToolHandler(),
  [TOOLS.LIST_TOOLS]: new ListToolsToolHandler(),
  [TOOLS.HELP]: new HelpToolHandler(),
  resume: new ResumeToolHandler(),
  [TOOLS.LIST_MODELS]: new ListModelsToolHandler(),
  [TOOLS.DELETE_SESSION]: new DeleteSessionToolHandler(),
  [TOOLS.SESSION_STATS]: new SessionStatsToolHandler(),
  [TOOLS.CODEX_REPLY]: new CodexReplyToolHandler(),
} as const;
