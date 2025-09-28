import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { CommandExecutionError } from '../errors.js';
import { type CommandResult } from '../types.js';

import { withTimeout } from './timeout.js';

const execFileAsync = promisify(execFile);

function getTimeoutMs(): number {
  const v = Number(process.env.CODEX_CMD_TIMEOUT_MS);
  if (Number.isFinite(v) && v > 0) return v;
  return 180_000; // default 3 minutes
}

function maybeLog(...args: any[]) {
  if (process.env.DEBUG) {
    // keep logs on stderr when explicitly debugging
    console.error(...args);
  }
}

function resolveExecutable(file: string): string {
  if (process.platform === 'win32' && file === 'codex') {
    return 'codex.cmd';
  }
  return file;
}

export async function executeCommand(
  file: string,
  args: string[] = []
): Promise<CommandResult> {
  try {
    const exe = resolveExecutable(file);
    maybeLog(chalk.blue('Executing:'), exe, args.join(' '));

    const result = await withTimeout(
      execFileAsync(exe, args, {
        shell: false,
        maxBuffer: 64 * 1024 * 1024, // 64MB
      }),
      getTimeoutMs(),
      [exe, ...args].join(' ')
    );

    if (result.stderr) {
      maybeLog(chalk.yellow('Command stderr:'), result.stderr);
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    // Log full error details only in debug
    maybeLog(chalk.red('Command execution error:'), error);
    if (error instanceof Error && (error as any).stack) {
      maybeLog(chalk.red('Stack trace:'), (error as any).stack);
    }
    throw new CommandExecutionError(
      [file, ...args].join(' '),
      error instanceof Error ? error.message : 'Command execution failed',
      error
    );
  }
}

/**
 * Streamed execution to avoid maxBuffer limits and begin processing output as it arrives.
 * Accumulates stdout into a single string by default; callers may hook into onChunk
 * to implement custom chunking if desired.
 */
export async function executeCommandStreamed(
  file: string,
  args: string[] = [],
  onChunk?: (chunk: string) => void
): Promise<CommandResult> {
  const exe = resolveExecutable(file);
  maybeLog(chalk.blue('Executing (streamed):'), exe, args.join(' '));

  return await withTimeout(
    new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(exe, args, { shell: false });
      let stdout = '';
      let stderr = '';

      // Ensure strings
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');

      child.stdout.on('data', (d: string) => {
        stdout += d;
        try {
          onChunk?.(d);
        } catch (e) {
          // Non-fatal: continue running even if onChunk throws.
          maybeLog(chalk.yellow('onChunk error:'), e);
        }
      });

      child.stderr.on('data', (d: string) => {
        stderr += d;
      });

      child.on('error', (err) => {
        reject(
          new CommandExecutionError(
            [exe, ...args].join(' '),
            'Spawn failed',
            err
          )
        );
      });

      child.on('close', (code) => {
        if (stderr) {
          maybeLog(chalk.yellow('Command stderr:'), stderr);
        }
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(
            new CommandExecutionError(
              [exe, ...args].join(' '),
              `Exited with code ${code}`,
              stderr || code
            )
          );
        }
      });
    }),
    getTimeoutMs(),
    [exe, ...args].join(' ')
  );
}
