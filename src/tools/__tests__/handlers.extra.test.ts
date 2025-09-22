


import { jest } from '@jest/globals';
jest.setTimeout(20000);

describe('handlers.extra.test.ts (ESM/Jest/TS compatible)', () => {
  let commandUtils;
  let sessionStore;
  let CodexToolHandler, ListSessionsToolHandler, PingToolHandler;
  let TOOLS;
  let ToolExecutionError, ValidationError;
  let ZodError;

  beforeAll(async () => {
    await jest.unstable_mockModule('../../utils/command', () => ({
      executeCommandStreamed: jest.fn().mockResolvedValue({ stdout: 'mocked', stderr: '' })
    }));
    await jest.unstable_mockModule('../../utils/sessionStore', () => ({
      clearSession: jest.fn(),
      appendTurn: jest.fn(),
      listSessionMeta: jest.fn().mockReturnValue([])
    }));
    commandUtils = await import('../../utils/command');
    sessionStore = await import('../../utils/sessionStore');
    ({ CodexToolHandler, ListSessionsToolHandler, PingToolHandler } = await import('../handlers'));
    ({ TOOLS } = await import('../../types'));
    ({ ToolExecutionError, ValidationError } = await import('../../errors'));
    ({ ZodError } = await import('zod'));
  });

  describe('CodexToolHandler extra coverage', () => {
    beforeEach(() => {
      jest.spyOn(commandUtils, 'executeCommandStreamed').mockReset().mockResolvedValue({ stdout: 'mocked', stderr: '' });
      jest.spyOn(sessionStore, 'clearSession').mockReset();
      jest.spyOn(sessionStore, 'appendTurn').mockReset();
      jest.spyOn(sessionStore, 'listSessionMeta').mockReset().mockReturnValue([]);
    });

    it('throws tool execution error if prompt is missing', async () => {
      const handler = new CodexToolHandler();
      await expect(handler.execute({})).rejects.toThrow(ToolExecutionError);
    });

    it('returns error for expired pageToken', async () => {
      const handler = new CodexToolHandler();
      // Simulate missing/expired token
      await expect(handler.execute({ pageToken: 'notfound', prompt: 'irrelevant' })).resolves.toHaveProperty('content');
    });

    it('resets session if resetSession is true', async () => {
      const handler = new CodexToolHandler();
      (commandUtils.executeCommandStreamed as jest.Mock).mockResolvedValueOnce({ stdout: 'mocked', stderr: '' });
      await expect(handler.execute({ prompt: 'test', sessionId: 'abc', resetSession: true })).resolves.toHaveProperty('content');
    });

    it('handles command execution errors', async () => {
      const handler = new CodexToolHandler();
      (commandUtils.executeCommandStreamed as jest.Mock).mockImplementationOnce(() => { throw new Error('fail'); });
      await expect(handler.execute({ prompt: 'test' })).rejects.toThrow(ToolExecutionError);
    });
  });

  describe('ListSessionsToolHandler extra coverage', () => {
    beforeEach(() => {
      jest.spyOn(sessionStore, 'listSessionMeta').mockReset().mockReturnValue([]);
    });
    it('returns no active sessions if none exist', async () => {
      const handler = new ListSessionsToolHandler();
      const result = await handler.execute({});
      expect(result.content[0].text).toMatch(/No active sessions/);
    });

    it('returns fallback result for invalid args', async () => {
      const handler = new ListSessionsToolHandler();
      // ListSessionsToolSchema expects no args, so any arg should fallback
      const result = await handler.execute({ invalid: true });
      expect(result.content[0].text).toMatch(/No active sessions/);
    });
  });

  describe('PingToolHandler extra coverage', () => {
    it('returns pong by default', async () => {
      const handler = new PingToolHandler();
      const result = await handler.execute({});
      expect(result.content[0].text).toBe('pong');
    });

    it('returns custom message', async () => {
      const handler = new PingToolHandler();
      const result = await handler.execute({ message: 'hello' });
      expect(result.content[0].text).toBe('hello');
    });

    it('handles Zod validation error', async () => {
      const handler = new PingToolHandler();
      await expect(handler.execute({ message: 123 })).rejects.toThrow(ValidationError);
    });
  });
});

describe('CodexToolHandler extra coverage', () => {
  beforeEach(() => {
    jest.spyOn(commandUtils, 'executeCommandStreamed').mockReset().mockResolvedValue({ stdout: 'mocked', stderr: '' });
    jest.spyOn(sessionStore, 'clearSession').mockReset();
    jest.spyOn(sessionStore, 'appendTurn').mockReset();
    jest.spyOn(sessionStore, 'listSessionMeta').mockReset().mockReturnValue([]);
  });

  it('throws tool execution error if prompt is missing', async () => {
    const handler = new CodexToolHandler();
    await expect(handler.execute({})).rejects.toThrow(ToolExecutionError);
  });

  it('returns error for expired pageToken', async () => {
    const handler = new CodexToolHandler();
    // Simulate missing/expired token
    await expect(handler.execute({ pageToken: 'notfound', prompt: 'irrelevant' })).resolves.toHaveProperty('content');
  });

  it('resets session if resetSession is true', async () => {
    const handler = new CodexToolHandler();
    (commandUtils.executeCommandStreamed as jest.Mock).mockResolvedValueOnce({ stdout: 'mocked', stderr: '' });
    await expect(handler.execute({ prompt: 'test', sessionId: 'abc', resetSession: true })).resolves.toHaveProperty('content');
  });

  it('handles command execution errors', async () => {
    const handler = new CodexToolHandler();
    (commandUtils.executeCommandStreamed as jest.Mock).mockImplementationOnce(() => { throw new Error('fail'); });
    await expect(handler.execute({ prompt: 'test' })).rejects.toThrow(ToolExecutionError);
  });
});

describe('ListSessionsToolHandler extra coverage', () => {
  beforeEach(() => {
    jest.spyOn(sessionStore, 'listSessionMeta').mockReset().mockReturnValue([]);
  });
  it('returns no active sessions if none exist', async () => {
    const handler = new ListSessionsToolHandler();
    const result = await handler.execute({});
    expect(result.content[0].text).toMatch(/No active sessions/);
  });

  it('returns fallback result for invalid args', async () => {
    const handler = new ListSessionsToolHandler();
    // ListSessionsToolSchema expects no args, so any arg should fallback
    const result = await handler.execute({ invalid: true });
    expect(result.content[0].text).toMatch(/No active sessions/);
  });
});

describe('PingToolHandler extra coverage', () => {
  it('returns pong by default', async () => {
    const handler = new PingToolHandler();
    const result = await handler.execute({});
    expect(result.content[0].text).toBe('pong');
  });

  it('returns custom message', async () => {
    const handler = new PingToolHandler();
    const result = await handler.execute({ message: 'hello' });
    expect(result.content[0].text).toBe('hello');
  });

  it('handles Zod validation error', async () => {
    const handler = new PingToolHandler();
    await expect(handler.execute({ message: 123 })).rejects.toThrow(ValidationError);
  });
});
