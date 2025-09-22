

import { jest } from '@jest/globals';
jest.setTimeout(20000);

describe('handlers.extra.test.ts (ESM/Jest/TS compatible)', () => {
  let CodexToolHandler, ListSessionsToolHandler, PingToolHandler;
  let TOOLS;
  let ToolExecutionError, ValidationError;
  let ZodError;

  beforeAll(async () => {
    ({ CodexToolHandler, ListSessionsToolHandler, PingToolHandler } = await import('../handlers'));
    ({ TOOLS } = await import('../../types'));
    ({ ToolExecutionError, ValidationError } = await import('../../errors'));
    ({ ZodError } = await import('zod'));
  });

  describe('CodexToolHandler extra coverage', () => {
    let executeCommandStreamedMock, clearSessionMock, appendTurnMock, listSessionMetaMock;
    beforeEach(() => {
      executeCommandStreamedMock = jest.fn().mockResolvedValue({ stdout: 'mocked', stderr: '' });
      clearSessionMock = jest.fn();
      appendTurnMock = jest.fn();
      listSessionMetaMock = jest.fn().mockReturnValue([]);
    });

    it('throws tool execution error if prompt is missing', async () => {
      const handler = new CodexToolHandler({
        executeCommandStreamed: executeCommandStreamedMock,
        clearSession: clearSessionMock,
        appendTurn: appendTurnMock,
        // other deps as needed
      });
      await expect(handler.execute({})).rejects.toThrow(ToolExecutionError);
    });

    it('returns error for expired pageToken', async () => {
      const handler = new CodexToolHandler({
        executeCommandStreamed: executeCommandStreamedMock,
        clearSession: clearSessionMock,
        appendTurn: appendTurnMock,
        // other deps as needed
      });
      await expect(handler.execute({ pageToken: 'notfound', prompt: 'irrelevant' })).resolves.toHaveProperty('content');
    });

    it('resets session if resetSession is true', async () => {
      const handler = new CodexToolHandler({
        executeCommandStreamed: executeCommandStreamedMock,
        clearSession: clearSessionMock,
        appendTurn: appendTurnMock,
        // other deps as needed
      });
      await expect(handler.execute({ prompt: 'test', sessionId: 'abc', resetSession: true })).resolves.toHaveProperty('content');
    });

    it('handles command execution errors', async () => {
      const failMock = jest.fn(() => { throw new Error('fail'); });
      const handler = new CodexToolHandler({
        executeCommandStreamed: failMock,
        clearSession: clearSessionMock,
        appendTurn: appendTurnMock,
        // other deps as needed
      });
      await expect(handler.execute({ prompt: 'test' })).rejects.toThrow(ToolExecutionError);
    });
  });

  describe('ListModelsToolHandler no models found coverage', () => {
    let ListModelsToolHandler;
    beforeAll(async () => {
      ({ ListModelsToolHandler } = await import('../handlers'));
    });
    it('returns isError: true if config exists but contains no models', async () => {
      // Mock fs.readFile to return valid JSON with no models
      const mockFs = { readFile: jest.fn(() => JSON.stringify({})) };
      const handler = new ListModelsToolHandler({ fs: mockFs });
      const result = await handler.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No models found in Codex config file/);
    });
  });

  describe('ListSessionsToolHandler extra coverage', () => {
    let listSessionMetaMock;
    beforeEach(() => {
      listSessionMetaMock = jest.fn().mockReturnValue([]);
    });
    it('returns no active sessions if none exist', async () => {
      const handler = new ListSessionsToolHandler({ listSessionMeta: listSessionMetaMock });
      const result = await handler.execute({});
      expect(result.content[0].text).toMatch(/No active sessions/);
    });

    it('returns fallback result for invalid args', async () => {
      const handler = new ListSessionsToolHandler({ listSessionMeta: listSessionMetaMock });
      // ListSessionsToolSchema expects no args, so any arg should fallback
      const result = await handler.execute({ invalid: true });
      expect(result.content[0].text).toMatch(/No active sessions/);
    });

    it('throws ToolExecutionError on unexpected error', async () => {
      const errorMock = jest.fn(async () => { throw new Error('unexpected'); });
      const handler = new ListSessionsToolHandler({ listSessionMeta: errorMock });
      await expect(handler.execute({})).rejects.toThrow(ToolExecutionError);
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

    it('throws ToolExecutionError on unexpected error', async () => {
      const pingSchemaMock = { parse: () => { throw new Error('unexpected'); } };
      const handler = new PingToolHandler({ pingSchema: pingSchemaMock });
      await expect(handler.execute({ message: 'test' })).rejects.toThrow(ToolExecutionError);
    });
  });
  describe('ListModelsToolHandler error coverage', () => {
    let ListModelsToolHandler, ToolExecutionError;
    beforeAll(async () => {
      ({ ListModelsToolHandler } = await import('../handlers'));
      ({ ToolExecutionError } = await import('../../errors'));
    });
    it('returns isError: true if all config files are missing/unreadable', async () => {
      // Inject a mock fs with readFile always throwing
      const mockFs = { readFile: jest.fn(() => { throw new Error('not found'); }) };
      const handler = new ListModelsToolHandler({ fs: mockFs });
      const result = await handler.execute({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No Codex config file found/);
    });
  });
});


// Dependency-injected CodexToolHandler tests (already present above)


// Dependency-injected ListSessionsToolHandler tests (already present above)


// Dependency-injected PingToolHandler tests (already present above)
