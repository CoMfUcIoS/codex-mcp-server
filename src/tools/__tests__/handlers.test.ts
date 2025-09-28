jest.setTimeout(20000);

import { jest } from '@jest/globals';

// ---------- Create mock fns FIRST (referenced by factory functions) ----------
const mockExecuteCommandStreamed = jest.fn();
const mockExecuteCommand = jest.fn();

const mockStripEchoesAndMarkers = jest.fn();
const mockMakeRunId = jest.fn();
const mockBuildPromptWithSentinels = jest.fn();

const mockSaveChunk = jest.fn();
const mockPeekChunk = jest.fn();
const mockAdvanceChunk = jest.fn();

const mockAppendTurn = jest.fn();
const mockGetTranscript = jest.fn();
const mockClearSession = jest.fn();
const mockListSessionIds = jest.fn();

// ---------- ESM-friendly module mocks (must run BEFORE importing SUT) ----------
await jest.unstable_mockModule('../../utils/command.js', () => ({
  __esModule: true,
  executeCommandStreamed: mockExecuteCommandStreamed,
  executeCommand: mockExecuteCommand,
}));

await jest.unstable_mockModule('../../utils/promptSanitizer.js', () => ({
  __esModule: true,
  stripEchoesAndMarkers: mockStripEchoesAndMarkers,
  makeRunId: mockMakeRunId,
  buildPromptWithSentinels: mockBuildPromptWithSentinels,
  sanitizePrompt: jest.fn((prompt) => prompt),
}));

await jest.unstable_mockModule('../../utils/cursorStore.js', () => ({
  __esModule: true,
  saveChunk: mockSaveChunk,
  peekChunk: mockPeekChunk,
  advanceChunk: mockAdvanceChunk,
}));

await jest.unstable_mockModule('../../utils/sessionStore.js', () => ({
  __esModule: true,
  appendTurn: mockAppendTurn,
  getTranscript: mockGetTranscript,
  clearSession: mockClearSession,
  listSessionIds: mockListSessionIds,
}));

// ---------- Now import SUT (after mocks are in place) ----------
let handlers: any;
let TOOLS: any;
let command: any;

beforeAll(async () => {
  handlers = await import('../handlers.js');
  TOOLS = (await import('../../types.js')).TOOLS;
  command = await import('../../utils/command.js');
});

describe('Tool Handlers', () => {
  describe('CodexToolHandler image input', () => {
    it('passes --image flag for single image', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({ prompt: 'explain', image: 'img1.png' });
      expect(mockExecute).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['--image', 'img1.png'])
      );
    });

    it('passes --image flag for multiple images', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({
        prompt: 'explain',
        image: ['img1.png', 'img2.jpg'],
      });
      expect(mockExecute).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['--image', 'img1.png,img2.jpg'])
      );
    });

    it('does not add --image flag if image param is missing', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({ prompt: 'explain' });
      const cliArgs = mockExecute.mock.calls[0][1];
      expect(cliArgs.includes('--image')).toBe(false);
    });
  });

  describe('CodexToolHandler working directory', () => {
    it('passes --working-directory flag when workingDirectory is provided', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({
        prompt: 'test command',
        workingDirectory: '/path/to/workspace'
      });
      expect(mockExecute).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['--working-directory', '/path/to/workspace'])
      );
    });

    it('does not add --working-directory flag when workingDirectory is missing', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({ prompt: 'test command' });
      const cliArgs = mockExecute.mock.calls[0][1];
      expect(cliArgs.includes('--working-directory')).toBe(false);
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();

    // sensible defaults so nothing hits real world
    mockExecuteCommandStreamed.mockResolvedValue({
      stdout: 'streamed out',
      stderr: '',
    });
    mockExecuteCommand.mockResolvedValue({ stdout: 'help info', stderr: '' });

    mockStripEchoesAndMarkers.mockImplementation(
      (_runId, _stitched, raw) => raw
    );
    mockMakeRunId.mockReturnValue('runid');
    mockBuildPromptWithSentinels.mockReturnValue('prompt');

    mockSaveChunk.mockReturnValue('token123');
    mockPeekChunk.mockReturnValue(undefined);
    mockAdvanceChunk.mockImplementation(() => {});

    mockAppendTurn.mockImplementation(() => {});
    mockGetTranscript.mockReturnValue([]);
    mockClearSession.mockImplementation(() => {});
    mockListSessionIds.mockReturnValue([]); // default: no sessions
  });

  it('should have handler classes', () => {
    expect(typeof handlers.CodexToolHandler).toBe('function');
    expect(typeof handlers.PingToolHandler).toBe('function');
    expect(typeof handlers.HelpToolHandler).toBe('function');
    expect(typeof handlers.ListSessionsToolHandler).toBe('function');
  });

  it('should instantiate handlers', () => {
    expect(new handlers.CodexToolHandler()).toBeInstanceOf(
      handlers.CodexToolHandler
    );
    expect(new handlers.PingToolHandler()).toBeInstanceOf(
      handlers.PingToolHandler
    );
    expect(new handlers.HelpToolHandler()).toBeInstanceOf(
      handlers.HelpToolHandler
    );
    expect(new handlers.ListSessionsToolHandler()).toBeInstanceOf(
      handlers.ListSessionsToolHandler
    );
  });

  it('should have toolHandlers object', () => {
    expect(typeof handlers.toolHandlers).toBe('object');
    expect(Object.keys(handlers.toolHandlers)).toEqual(
      expect.arrayContaining([
        TOOLS.CODEX,
        TOOLS.PING,
        TOOLS.HELP,
        TOOLS.LIST_SESSIONS,
      ])
    );
  });

  // ---------------------------------------------------------------------------
  // CodexToolHandler
  // ---------------------------------------------------------------------------
  describe('CodexToolHandler', () => {
    it('passes --base-instructions flag when baseInstructions is provided', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValue({ stdout: 'output', stderr: '' });
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecute,
      });
      await handler.execute({
        prompt: 'explain',
        baseInstructions: 'Always comment code.',
      });
      expect(mockExecute).toHaveBeenCalledWith(
        'codex',
        expect.arrayContaining(['--base-instructions', 'Always comment code.'])
      );
    });
    it('throws ToolExecutionError if required prompt is missing', async () => {
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      await expect(handler.execute({})).rejects.toThrow(
        /Failed to execute codex command/i
      );
    });

    it('throws ValidationError if pageSize is wrong type', async () => {
      const { CodexToolHandler } = await import('../handlers.js');
      const handler = new CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      await expect(
        handler.execute({ prompt: 'foo', pageSize: 'not-a-number' })
      ).rejects.toThrow(/Invalid/i);
    });
    it('throws ToolExecutionError (wrapped) if prompt is missing and no pageToken', async () => {
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      await expect(handler.execute({})).rejects.toThrow(
        /Failed to execute codex command/i
      );
      expect(command.executeCommandStreamed).not.toHaveBeenCalled();
    });

    it('returns paginated output if output is long', async () => {
      const longOut = 'a'.repeat(50_000);
      mockExecuteCommandStreamed.mockResolvedValue({
        stdout: longOut,
        stderr: '',
      });
      mockSaveChunk.mockReturnValue('token123');
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        saveChunk: mockSaveChunk,
      });

      const res = await handler.execute({ prompt: 'foo', pageSize: 1000 });

      expect(res.content[0].type).toBe('text');
      expect(res.content[0].text.length).toBe(1000);
      expect(res.content.length).toBe(1);
      expect(res.meta?.nextPageToken).toBe('token123');
      expect(command.executeCommandStreamed).toHaveBeenCalledTimes(1);
    });

    it('saves session turns when output is paginated and sessionId provided', async () => {
      const longOut = 'a'.repeat(50_000);
      mockExecuteCommandStreamed.mockResolvedValue({
        stdout: longOut,
        stderr: '',
      });
      mockSaveChunk.mockReturnValue('token123');
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        saveChunk: mockSaveChunk,
        appendTurn: mockAppendTurn,
      });

      await handler.execute({
        prompt: 'test prompt',
        sessionId: 'session123',
        pageSize: 1000
      });

      expect(mockAppendTurn).toHaveBeenCalledWith('session123', 'user', 'test prompt');
      expect(mockAppendTurn).toHaveBeenCalledWith('session123', 'assistant', longOut);
      expect(mockAppendTurn).toHaveBeenCalledTimes(2);
    });

    it('returns ONLY the head and no meta/token when remaining <= pageLen (pageToken path)', async () => {
      // Don’t pass pageSize (min 1000). Let default pageLen be large; return a tiny chunk to force no meta.
      mockPeekChunk.mockReturnValue('abc'); // length 3 <= default pageLen (~40000)
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        peekChunk: mockPeekChunk,
        advanceChunk: mockAdvanceChunk,
      });
      const res = await handler.execute({ pageToken: 'tok' });

      expect(res.content).toHaveLength(1);
      expect(res.content[0].text).toBe('abc');
      expect(res.meta).toBeUndefined();
      expect(mockAdvanceChunk).toHaveBeenCalledWith('tok', 3);
    });

    it('clears session if sessionId and resetSession are provided', async () => {
      mockExecuteCommandStreamed.mockResolvedValue({
        stdout: 'output',
        stderr: '',
      });
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        clearSession: mockClearSession,
      });
      await handler.execute({
        prompt: 'foo',
        sessionId: 'sess',
        resetSession: true,
      });
      expect(mockClearSession).toHaveBeenCalledWith('sess');
    });

    it('appends full turns when output fits in a single page', async () => {
      mockExecuteCommandStreamed.mockResolvedValue({
        stdout: 'short answer',
        stderr: '',
      });
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        appendTurn: mockAppendTurn,
      });
      await handler.execute({ prompt: 'hello', sessionId: 'sess' });
      // two appends: user + assistant
      expect(mockAppendTurn).toHaveBeenCalledTimes(2);
      expect(mockAppendTurn).toHaveBeenNthCalledWith(
        1,
        'sess',
        'user',
        'hello'
      );
      expect(mockAppendTurn).toHaveBeenNthCalledWith(
        2,
        'sess',
        'assistant',
        'short answer'
      );
    });

    it('uses stitched prior transcript when present', async () => {
      mockGetTranscript.mockReturnValue([
        { role: 'user', text: 'u1', at: Date.now() },
        { role: 'assistant', text: 'a1', at: Date.now() },
      ]);
      mockExecuteCommandStreamed.mockResolvedValue({
        stdout: 'ok',
        stderr: '',
      });
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
        getTranscript: mockGetTranscript,
        buildPromptWithSentinels: mockBuildPromptWithSentinels,
        makeRunId: mockMakeRunId,
      });
      await handler.execute({ prompt: 'new', sessionId: 'sess' });

      // ensure buildPromptWithSentinels is called with stitched context
      expect(mockBuildPromptWithSentinels).toHaveBeenCalledWith(
        'runid',
        expect.stringContaining('User: u1\nAssistant: a1'),
        'new'
      );
    });

    it('returns ValidationError on Zod validation failure (wrong type)', async () => {
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      await expect(
        handler.execute({ pageSize: 'nope' } as any)
      ).rejects.toThrow(/Invalid/i);
      expect(command.executeCommandStreamed).not.toHaveBeenCalled();
    });

    it('returns ToolExecutionError if execution fails', async () => {
      mockExecuteCommandStreamed.mockRejectedValue(new Error('fail'));
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      await expect(handler.execute({ prompt: 'foo' })).rejects.toThrow(
        /Failed to execute codex command/i
      );
      expect(command.executeCommandStreamed).toHaveBeenCalledTimes(1);
    });

    it('returns pageToken error if peekChunk returns nothing', async () => {
      mockPeekChunk.mockReturnValue(undefined);
      const handler = new handlers.CodexToolHandler({
        executeCommandStreamed: mockExecuteCommandStreamed,
      });
      const res = await handler.execute({ pageToken: 'tok' });
      expect(res.content[0].text).toMatch(/No data found for pageToken/i);
      expect(command.executeCommandStreamed).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ListSessionsToolHandler
  // ---------------------------------------------------------------------------
  describe('ListSessionsToolHandler', () => {
    it('returns session list', async () => {
      const handler = new handlers.ListSessionsToolHandler();
      await expect(handler.execute({})).rejects.toThrow(
        'Failed to list sessions'
      );
    });

    it('returns no sessions message', async () => {
      const handler = new handlers.ListSessionsToolHandler();
      await expect(handler.execute({})).rejects.toThrow(
        'Failed to list sessions'
      );
    });

    it('propagates ToolExecutionError on underlying error', async () => {
      mockListSessionIds.mockImplementation(() => {
        throw new Error('fail');
      });
      const handler = new handlers.ListSessionsToolHandler();
      await expect(handler.execute({})).rejects.toThrow(
        /Failed to list sessions/i
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PingToolHandler
  // ---------------------------------------------------------------------------
  describe('PingToolHandler', () => {
    it('returns pong by default', async () => {
      const handler = new handlers.PingToolHandler();
      const res = await handler.execute({});
      expect(res.content[0].text).toBe('pong');
    });

    it('returns custom message', async () => {
      const handler = new handlers.PingToolHandler();
      const res = await handler.execute({ message: 'hi' });
      expect(res.content[0].text).toBe('hi');
    });

    it('throws ValidationError on Zod error (wrong type)', async () => {
      const handler = new handlers.PingToolHandler();
      await expect(handler.execute({ message: 123 } as any)).rejects.toThrow(
        /Invalid input/i
      );
    });
  });

  // ---------------------------------------------------------------------------
  // HelpToolHandler
  // ---------------------------------------------------------------------------
  describe('HelpToolHandler', () => {
    it('returns ToolExecutionError on command failure', async () => {
      const { HelpToolHandler } = await import('../handlers.js');
      const handler = new HelpToolHandler({
        executeCommand: mockExecuteCommand,
      });
      mockExecuteCommand.mockRejectedValue(new Error('fail help'));
      await expect(handler.execute({})).rejects.toThrow(
        /Failed to execute help command/i
      );
    });

    // ---------------------------------------------------------------------------
    // DeleteSessionToolHandler
    // ---------------------------------------------------------------------------
    describe('DeleteSessionToolHandler', () => {
      it('throws ToolExecutionError if clearSession throws', async () => {
        const { DeleteSessionToolHandler } = await import('../handlers.js');
        const mockClearSession = jest.fn(() => {
          throw new Error('fail clear');
        });
        const handler = new DeleteSessionToolHandler({
          clearSession: mockClearSession,
        });
        await expect(handler.execute({ sessionId: 'abc' })).rejects.toThrow(
          /Failed to delete session/i
        );
      });
    });

    // ---------------------------------------------------------------------------
    // SessionStatsToolHandler
    // ---------------------------------------------------------------------------
    describe('SessionStatsToolHandler', () => {
      it('throws ToolExecutionError if getSessionMeta throws', async () => {
        const { SessionStatsToolHandler } = await import('../handlers.js');
        const mockGetSessionMeta = jest.fn(() => {
          throw new Error('fail stats');
        });
        const handler = new SessionStatsToolHandler({
          getSessionMeta: mockGetSessionMeta,
        });
        await expect(handler.execute({ sessionId: 'abc' })).rejects.toThrow(
          /failed to get session stats/i
        );
      });

      // ---------------------------------------------------------------------------
      // ListToolsToolHandler
      // ---------------------------------------------------------------------------
      describe('ListToolsToolHandler', () => {
        it('returns tool definitions as JSON', async () => {
          const { ListToolsToolHandler } = await import('../handlers.js');
          const handler = new ListToolsToolHandler();
          const res = await handler.execute();
          expect(res.content[0].type).toBe('text');
          expect(() => JSON.parse(res.content[0].text)).not.toThrow();
          expect(res.content[0].text).toContain('codex');
        });
      });

      // ---------------------------------------------------------------------------
      // ListModelsToolHandler - Deduplication
      // ---------------------------------------------------------------------------
      describe('ListModelsToolHandler - Deduplication', () => {
        it('removes duplicate models from config', async () => {
          const mockFs = {
            readFile: jest.fn().mockImplementation((path) => {
              if (path.endsWith('.json'))
                return Promise.resolve(
                  '{"model":"foo","profiles":{"p1":{"model":"foo"},"p2":{"model":"bar"}}}'
                );
              return Promise.reject(new Error('not found'));
            }),
          };
          const { ListModelsToolHandler } = await import('../handlers.js');
          const handler = new ListModelsToolHandler({ fs: mockFs });
          const res = await handler.execute({});
          const text = res.content[0].text;
          expect(text).toContain('- foo');
          expect(text).toContain('- bar');
          // Only one occurrence of 'foo'
          expect(text.match(/- foo/g)?.length).toBe(1);
        });
      });

      // ---------------------------------------------------------------------------
      // CodexToolHandler - Fallback Model Selection
      // ---------------------------------------------------------------------------
      describe('CodexToolHandler - Fallback Model', () => {
        it('selects gpt-3.5-turbo for unknown prompt', async () => {
          const { CodexToolHandler } = await import('../handlers.js');
          const mockExecuteCommandStreamed = jest
            .fn()
            .mockResolvedValue({ stdout: 'output', stderr: '' });
          const handler = new CodexToolHandler({
            executeCommandStreamed: mockExecuteCommandStreamed,
          });
          await handler.execute({
            prompt: 'somethingunusualandnotmatching',
            pageSize: 1000,
          });
          // Should select gpt-5 as model
          expect(mockExecuteCommandStreamed).toHaveBeenCalledWith(
            'codex',
            expect.arrayContaining(['-m', 'gpt-5'])
          );
        });
      });
    });
    it('returns help output', async () => {
      mockExecuteCommand.mockResolvedValue({ stdout: 'help info', stderr: '' });
      const handler = new handlers.HelpToolHandler({
        executeCommand: mockExecuteCommand,
      });
      const res = await handler.execute({});
      expect(res.content[0].text).toContain('help info');
      expect(command.executeCommand).toHaveBeenCalledWith('codex', ['--help']);
    });

    it('propagates ToolExecutionError on command failure', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('fail'));
      const handler = new handlers.HelpToolHandler({
        executeCommand: mockExecuteCommand,
      });
      await expect(handler.execute({})).rejects.toThrow(
        /Failed to execute help command/i
      );
    });
  });
});

// ---------------------------------------------------------------------------
// ListModelsToolHandler
// ---------------------------------------------------------------------------
describe('ListModelsToolHandler', () => {
  let originalFs;
  beforeAll(() => {
    originalFs = jest.requireActual('fs/promises');
  });
  afterEach(() => {
    jest.resetModules();
  });

  it('returns parse error for malformed TOML config', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml'))
          return Promise.resolve('bad = "toml"\n[broken');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(
      /failed to parse codex config file|parse|syntax|error/
    );
  });

  it('returns parse error for malformed YAML config', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.yaml'))
          return Promise.resolve('model: "ok\nprofiles: [bad');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(
      /failed to parse codex config file|parse|syntax|error/
    );
  });

  it('returns parse error for malformed JSON config', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml') || path.endsWith('.yaml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.json')) return Promise.resolve('{ model: "oops" ');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(
      /failed to parse codex config file|parse|syntax|error/
    );
  });

  it('returns error for TOML config with no models', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml')) return Promise.resolve(''); // empty TOML
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/No models found/i);
  });

  it('returns error for YAML config with no models', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.yaml')) return Promise.resolve('profiles: {}'); // valid YAML, no models
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/No models found/i);
  });

  it('returns error for JSON config with no models', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml') || path.endsWith('.yaml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.json')) return Promise.resolve('{"profiles":{}}'); // valid JSON, no models
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/No models found/i);
  });

  it('returns parse error for TOML config with syntax error', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml'))
          return Promise.resolve('bad = "toml"\n[broken');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(/parse|syntax|error/);
  });

  it('returns parse error for YAML config with syntax error', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.yaml'))
          return Promise.resolve('model: "ok\nprofiles: [bad');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(/parse|syntax|error/);
  });

  it('returns parse error for JSON config with syntax error', async () => {
    const mockFs = {
      readFile: jest.fn().mockImplementation((path) => {
        if (path.endsWith('.toml') || path.endsWith('.yaml'))
          return Promise.reject(new Error('not found'));
        if (path.endsWith('.json')) return Promise.resolve('{ model: "oops" ');
        return Promise.reject(new Error('not found'));
      }),
    };
    const { ListModelsToolHandler } = await import('../handlers.js');
    const handler = new ListModelsToolHandler({ fs: mockFs });
    const res = await handler.execute({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text.toLowerCase()).toMatch(/parse|syntax|error/);
  });
});

