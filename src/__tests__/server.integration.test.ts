import { jest } from '@jest/globals';
import { CodexMcpServer } from '../server';
import { toolHandlers } from '../tools/handlers';
import { TOOLS } from '../types';

describe('CodexMcpServer', () => {
  let server: CodexMcpServer;
  const config = { name: 'test-server', version: '1.0.0' };

  beforeEach(() => {
    server = new CodexMcpServer(config);
  });

  it('should instantiate with config', () => {
    expect(server).toBeInstanceOf(CodexMcpServer);
  });

  it('should validate tool names correctly', () => {
    // @ts-expect-error: access private method for test
    expect(server.isValidToolName(TOOLS.CODEX)).toBe(true);
    // @ts-expect-error: access private method for test
    expect(server.isValidToolName('not-a-tool')).toBe(false);
  });

  it('should handle CallTool errors gracefully', async () => {
    // Create a mock handler that throws an error
    const originalHandler = toolHandlers[TOOLS.PING];
    const mockHandler = {
      execute: jest.fn().mockRejectedValue(new Error('Test error')),
    };

    // Replace the handler temporarily
    Object.assign(toolHandlers, { [TOOLS.PING]: mockHandler });

    try {
      // @ts-expect-error: accessing private method for testing
      const callToolHandler = server.server._requestHandlers.get('tools/call');
      expect(callToolHandler).toBeDefined();

      const result = await callToolHandler(
        {
          method: 'tools/call',
          params: {
            name: TOOLS.PING,
            arguments: { message: 'test' },
          },
        },
        {}
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Test error'),
          },
        ],
        isError: true,
      });
    } finally {
      // Restore original handler
      Object.assign(toolHandlers, { [TOOLS.PING]: originalHandler });
    }
  });

  it('should handle unknown tool names', async () => {
    // @ts-expect-error: accessing private method for testing
    const callToolHandler = server.server._requestHandlers.get('tools/call');
    expect(callToolHandler).toBeDefined();

    const result = await callToolHandler(
      {
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {},
        },
      },
      {}
    );

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Unknown tool: unknown-tool'),
        },
      ],
      isError: true,
    });
  });

  // More integration tests would require mocking SDK Server/Transport
});
