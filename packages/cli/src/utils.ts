/**
 * Shared utilities for CLI commands
 */

import { readFile } from 'node:fs/promises';
import chalk from 'chalk';

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print section header
 */
export function header(message: string): void {
  console.log(chalk.bold.cyan(`\n${message}`));
}

/**
 * Print key-value pair
 */
export function keyValue(key: string, value: string): void {
  console.log(chalk.gray(`${key}:`), value);
}

/**
 * Format DID for display (truncate middle if too long)
 */
export function formatDID(did: string, maxLength = 60): string {
  if (did.length <= maxLength) {
    return did;
  }
  const start = Math.floor((maxLength - 3) / 2);
  const end = Math.ceil((maxLength - 3) / 2);
  return `${did.slice(0, start)}...${did.slice(-end)}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format credits with sign and color
 */
export function formatCredits(amount: number): string {
  if (amount > 0) {
    return chalk.green(`+${amount}`);
  }
  if (amount < 0) {
    return chalk.red(amount.toString());
  }
  return amount.toString();
}

/**
 * Read file content as string
 */
export async function readFileContent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
  }
}

/**
 * Read file content as bytes
 */
export async function readFileBytes(path: string): Promise<Uint8Array> {
  try {
    const buffer = await readFile(path);
    return new Uint8Array(buffer);
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
  }
}

/**
 * Validate DID format
 */
export function isValidDIDFormat(did: string): boolean {
  return /^did:[a-z]+:[a-zA-Z0-9._:-]+$/.test(did);
}

/**
 * Exit with error
 */
export function exitWithError(message: string, code = 1): never {
  error(message);
  process.exit(code);
}
