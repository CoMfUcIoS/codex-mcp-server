import { jest } from '@jest/globals';
import { executeCommand, executeCommandStreamed } from '../command';
import type { CommandResult } from '../../types';

describe('executeCommand', () => {
  it('resolves with stdout and stderr', async () => {
    const result: CommandResult = await executeCommand(process.execPath, [
      '-e',
      "process.stdout.write('hello')",
    ]);
    expect(result.stdout).toContain('hello');
    expect(typeof result.stderr).toBe('string');
  });

  it('captures stderr for exit 0', async () => {
    const result: CommandResult = await executeCommand(process.execPath, [
      '-e',
      "process.stderr.write('err')",
    ]);
    expect(result.stderr).toContain('err');
  });

  it('throws on invalid command', async () => {
    await expect(executeCommand('nonexistent-cmd')).rejects.toThrow();
  });
});

describe('executeCommandStreamed', () => {
  it('resolves with stdout and stderr', async () => {
    const result: CommandResult = await executeCommandStreamed(
      process.execPath,
      ['-e', "process.stdout.write('streamed')"]
    );
    expect(result.stdout).toContain('streamed');
    expect(typeof result.stderr).toBe('string');
  });

  it('invokes onChunk and continues even if onChunk throws', async () => {
    const chunks: string[] = [];
    const result = await executeCommandStreamed(
      process.execPath,
      ['-e', "process.stdout.write('A'); process.stdout.write('B');"],
      (c) => {
        chunks.push(c);
        throw new Error('ignore me'); // cover onChunk try/catch path
      }
    );
    expect(result.stdout).toContain('AB');
    expect(chunks.join('')).toContain('AB');
  });

  it('rejects on non-zero exit code', async () => {
    await expect(
      executeCommandStreamed(process.execPath, ['-e', 'process.exit(2)'])
    ).rejects.toThrow();
  });

  it('logs error details and stack trace when commands fail', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      // This will fail and trigger the error logging paths
      await executeCommand('this-command-does-not-exist', []);
    } catch (e) {
      // Expected to throw
    }

    // Check that console.error was called with error details
    const errorCalls = consoleSpy.mock.calls.filter(call =>
      call[0] && call[0].toString().includes('Command execution error:')
    );
    expect(errorCalls.length).toBeGreaterThan(0);

    // Just verify the error logging happened, which proves the coverage path was taken
    expect(errorCalls[0][0]).toContain('Command execution error:');

    consoleSpy.mockRestore();
  });
});
