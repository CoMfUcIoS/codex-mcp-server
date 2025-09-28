import {
  TOOLS,
  type ToolResult,
  type CodexToolArgs,
  type PingToolArgs,
  CodexToolSchema,
  PingToolSchema,
  HelpToolSchema,
  ListSessionsToolSchema,
  IdSchema,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { executeCommand, executeCommandStreamed } from '../utils/command.js';

import { ZodError } from 'zod';
import { saveChunk, peekChunk, advanceChunk } from '../utils/cursorStore.js';
import {
  appendTurn,
  getTranscript,
  clearSession,
} from '../utils/sessionStore.js';
import { toolDefinitions } from './definitions.js';
import {
  makeRunId,
  buildPromptWithSentinels,
  stripEchoesAndMarkers,
} from '../utils/promptSanitizer.js';
import os from 'os';

let toml: typeof import('toml');
let yaml: typeof import('yaml');

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
      }

      // Subsequent page request
      if (pageToken) {
        const remaining = this.peekChunk(String(pageToken));
        if (!remaining) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No data found for pageToken (it may have expired).',
              },
            ],
          };
        }
        const head = remaining.slice(0, pageLen);
        const tail = remaining.slice(pageLen);
        this.advanceChunk(String(pageToken), head.length);
        const meta = tail.length
          ? { nextPageToken: String(pageToken) }
          : undefined;
        return {
          content: [{ type: 'text' as const, text: head }],
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

      // Model selection aligned to your Codex CLI build
      // Map UI-friendly labels like "gpt-5 medium" into base model + reasoning effort
      const requestedModel = model ?? 'gpt-5 medium';
      let baseModel = 'gpt-5';
      let reasoningEffort: string | undefined;

      const match = requestedModel.match(
        /^(gpt-5)(?:\s+(minimal|low|medium|high))?$/
      );
      if (match) {
        baseModel = match[1];
        reasoningEffort = match[2];
      }

      // Allowlist to avoid 400s from unsupported ids
      const allow = new Set([
        'gpt-5 minimal',
        'gpt-5 low',
        'gpt-5 medium',
        'gpt-5 high',
      ]);
      if (!allow.has(requestedModel)) {
        console.error(
          `[CodexTool] Model "${requestedModel}" not in allowlist, falling back to gpt-5 medium`
        );
        baseModel = 'gpt-5';
        reasoningEffort = 'medium';
      }
      const selectedModelMeta = requestedModel;

      // Build prompt with session context
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

      // CLI args (note: spaces in model id are OK; we pass as one arg)
      const cliArgs = ['exec'];
      cliArgs.push('-m', baseModel);
      if (reasoningEffort) {
        cliArgs.push('-c', `model_reasoning_effort=${reasoningEffort}`);
      }

      if (image) {
        const images = Array.isArray(image) ? image : [image];
        cliArgs.push('--image', images.join(','));
      }
      if (approvalPolicy) cliArgs.push('--approval-policy', approvalPolicy);
      if (sandbox) cliArgs.push('--sandbox');
      if (workingDirectory)
        cliArgs.push('--working-directory', workingDirectory);
      if (baseInstructions)
        cliArgs.push('--base-instructions', baseInstructions);

      cliArgs.push(effectivePrompt);

      const result = await this.executeCommandStreamed('codex', cliArgs);

      const outputRaw = result.stdout || 'No output from Codex';
      const output = this.stripEchoesAndMarkers(runId, stitched, outputRaw);

      if (output.length <= pageLen) {
        if (sessionId) {
          this.appendTurn(sessionId, 'user', cleanPrompt);
          this.appendTurn(sessionId, 'assistant', output);
        }
        return {
          content: [{ type: 'text' as const, text: output }],
          meta: { model: selectedModelMeta },
        };
      }

      const head = output.slice(0, pageLen);
      const tail = output.slice(pageLen);
      const meta = { nextPageToken: this.saveChunk(tail) };
      if (sessionId) {
        this.appendTurn(sessionId, 'user', cleanPrompt);
        this.appendTurn(sessionId, 'assistant', output);
      }
      const res: ToolResult = {
        content: [{ type: 'text' as const, text: head }],
        meta: { ...meta, model: selectedModelMeta },
      };
      return res;
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
        const mod = await import('../utils/sessionStore.js');
        return mod.listSessionMeta();
      });
  }
  async execute(args: unknown): Promise<ToolResult> {
    try {
      ListSessionsToolSchema.parse(args);
      const meta = await this.listSessionMeta();
      if (!meta.length) {
        return {
          content: [{ type: 'text' as const, text: 'No active sessions.' }],
        };
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
      return { content: [{ type: 'text' as const, text }] };
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
            type: 'text' as const,
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

export class ListModelsToolHandler {
  private injectedFs?: typeof import('fs/promises');
  constructor(deps?: Partial<{ fs: typeof import('fs/promises') }>) {
    if (deps?.fs) {
      this.injectedFs = deps.fs;
    }
  }

  async execute(_args: unknown): Promise<ToolResult> {
    const fs = this.injectedFs ?? (await import('fs/promises'));
    const configPaths = [
      `${os.homedir()}/.codex/config.toml`,
      `${os.homedir()}/.codex/config.yaml`,
      `${os.homedir()}/.codex/config.json`,
    ];
    let config: any = null;
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
          } else if (path.endsWith('.yaml')) {
            if (!yaml) yaml = await import('yaml');
            config = yaml.parse(data);
          } else if (path.endsWith('.json')) {
            config = JSON.parse(data);
          }
        } catch (err) {
          parseError = { path, error: err };
          continue;
        }
        break;
      } catch {
        // not found; continue
      }
    }
    if (!config) {
      if (parseError && foundConfigFile) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to parse Codex config file at ${parseError.path}: ${parseError.error?.message || parseError.error}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No Codex config file found in ~/.codex (config.toml, config.yaml, config.json). Please create one to enable dynamic model listing.',
          },
        ],
        isError: true,
      };
    }

    const models: { name: string; description?: string }[] = [];
    if (config.model) {
      models.push({
        name: config.model,
        description: config.model_provider
          ? `Provider: ${config.model_provider}`
          : undefined,
      });
    }
    const profiles = config.profiles;
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
            description: `Profile: ${profileName}${
              (profile as any).model_provider
                ? `, Provider: ${(profile as any).model_provider}`
                : ''
            }`,
          });
        }
      }
    }
    const uniqueModels = Array.from(
      new Map(models.map((m) => [m.name, m])).values()
    );
    if (uniqueModels.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'No models found in Codex config file.',
          },
        ],
        isError: true,
      };
    }
    const text = uniqueModels
      .map((m) => `- ${m.name}${m.description ? ': ' + m.description : ''}`)
      .join('\n');
    return { content: [{ type: 'text' as const, text }] };
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
            type: 'text' as const,
            text: result.stdout || 'No help information available',
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.HELP, error.message);
      }
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
      const { sessionId } = IdSchema.parse(args);
      if (!this.clearSession) {
        const { clearSession } = await import('../utils/sessionStore.js');
        this.clearSession = clearSession;
      }
      this.clearSession(sessionId);
      return {
        content: [
          { type: 'text' as const, text: `Session ${sessionId} deleted.` },
        ],
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
      const { sessionId } = IdSchema.parse(args);
      if (!this.getSessionMeta) {
        const { getSessionMeta } = await import('../utils/sessionStore.js');
        this.getSessionMeta = getSessionMeta;
      }
      const meta = this.getSessionMeta(sessionId);
      if (!meta) {
        return {
          content: [
            { type: 'text' as const, text: `Session ${sessionId} not found.` },
          ],
        };
      }
      const text = `Session ${sessionId}:\nturns=${meta.turns}\nbytes=${meta.bytes}\ncreatedAt=${new Date(meta.createdAt).toISOString()}\nlastUsedAt=${new Date(meta.lastUsedAt).toISOString()}\nexpiresAt=${new Date(meta.expiresAt).toISOString()}`;
      return { content: [{ type: 'text' as const, text }] };
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
          type: 'text' as const,
          text: JSON.stringify(toolDefinitions, null, 2),
        },
      ],
    };
  }
}

export const toolHandlers = {
  [TOOLS.CODEX]: new CodexToolHandler(),
  [TOOLS.LIST_SESSIONS]: new ListSessionsToolHandler(),
  [TOOLS.PING]: new PingToolHandler(),
  [TOOLS.LIST_TOOLS]: new ListToolsToolHandler(),
  [TOOLS.HELP]: new HelpToolHandler(),
  [TOOLS.LIST_MODELS]: new ListModelsToolHandler(),
  [TOOLS.DELETE_SESSION]: new DeleteSessionToolHandler(),
  [TOOLS.SESSION_STATS]: new SessionStatsToolHandler(),
} as const;
