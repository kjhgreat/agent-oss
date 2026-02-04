#!/usr/bin/env node

/**
 * @antfarm/cli
 *
 * Command-line interface for Antfarm identity and verification system.
 */

import { Command } from 'commander';
import { createDidCommand } from './commands/did.js';
import { createInitCommand } from './commands/init.js';
import { createKeygenCommand } from './commands/keygen.js';
import { createRegisterCommand } from './commands/register.js';
import { createSignCommand } from './commands/sign.js';
import { createStatusCommand } from './commands/status.js';
import { createVerifyCommand } from './commands/verify.js';

const program = new Command();

program
  .name('antfarm')
  .description('Antfarm - Decentralized agent identity and verification')
  .version('0.1.0');

// Add commands
program.addCommand(createInitCommand());
program.addCommand(createKeygenCommand());
program.addCommand(createDidCommand());
program.addCommand(createRegisterCommand());
program.addCommand(createSignCommand());
program.addCommand(createVerifyCommand());
program.addCommand(createStatusCommand());

// Parse arguments
program.parse();
