/**
 * Configuration file management for agent-oss CLI
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface AgentConfig {
  did?: string;
  privateKeyPath?: string;
  publicKeyPath?: string;
  registryUrl?: string;
  guardianGithubId?: string;
}

const CONFIG_DIR = join(homedir(), '.agent-oss');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const KEYS_DIR = join(CONFIG_DIR, 'keys');

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the keys directory path
 */
export function getKeysDir(): string {
  return KEYS_DIR;
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Ensure config directory exists
 */
export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await mkdir(KEYS_DIR, { recursive: true });
}

/**
 * Check if config file exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

/**
 * Load configuration from file
 */
export async function loadConfig(): Promise<AgentConfig> {
  try {
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new Error(`Failed to load config: ${(error as Error).message}`);
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: AgentConfig): Promise<void> {
  await ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_FILE, data, 'utf-8');
}

/**
 * Update configuration with partial data
 */
export async function updateConfig(partial: Partial<AgentConfig>): Promise<AgentConfig> {
  const current = await loadConfig();
  const updated = { ...current, ...partial };
  await saveConfig(updated);
  return updated;
}

/**
 * Resolve tilde (~) in paths
 */
export function resolvePath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * Get default private key path
 */
export function getDefaultPrivateKeyPath(): string {
  return join(KEYS_DIR, 'private.key');
}

/**
 * Get default public key path
 */
export function getDefaultPublicKeyPath(): string {
  return join(KEYS_DIR, 'public.key');
}
