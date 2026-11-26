#!/usr/bin/env node

import { main } from '../logo-ai-remover-main/src/lib/gwr-engine/cli/gwrCli.js';

const exitCode = await main(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr
});

process.exitCode = exitCode;
