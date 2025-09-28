#!/usr/bin/env node

import chalk from 'chalk';
import { CodexMcpServer } from './server.js';
import { createRequire } from 'module';

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    // Works in dev and when packaged
    const pkg = require('../package.json');
    return pkg?.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const SERVER_CONFIG = {
  name: 'codex-mcp-server',
  version: getVersion(),
} as const;

async function main(): Promise<void> {
  try {
    // Surface version for other parts (e.g., ping meta)
    process.env.CODEX_MCP_SERVER_VERSION = SERVER_CONFIG.version;

    const server = new CodexMcpServer(SERVER_CONFIG);
    await server.start();
  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();

// Export main for testing purposes
export { main };
