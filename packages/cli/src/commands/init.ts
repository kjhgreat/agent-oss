/**
 * Interactive initialization command
 */

import { chmod, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { exportPrivateKey, exportPublicKey, generateKeyPair } from '@agent-oss/crypto';
import { generateDID } from '@agent-oss/did';
import { Command } from 'commander';
import ora from 'ora';
import {
  configExists,
  ensureConfigDir,
  getDefaultPrivateKeyPath,
  getDefaultPublicKeyPath,
  saveConfig,
} from '../config.js';
import { error, header, info, keyValue, success, warning } from '../utils.js';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Interactive setup - creates config and keys')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        // Check if config already exists
        if (configExists() && !options.force) {
          warning('Configuration already exists at ~/.agent-oss/config.json');
          info('Use --force to overwrite or edit the file manually');
          process.exit(1);
        }

        header('Agent OSS Initialization');
        console.log('This will create your agent identity and configuration.\n');

        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        // Gather information
        const domain = await rl.question('Domain (e.g., example.com): ');
        if (!domain) {
          rl.close();
          error('Domain is required');
          process.exit(1);
        }

        const agentId = await rl.question('Agent ID (e.g., my-agent): ');
        if (!agentId) {
          rl.close();
          error('Agent ID is required');
          process.exit(1);
        }

        const githubId = await rl.question('Guardian GitHub username: ');
        if (!githubId) {
          rl.close();
          error('GitHub username is required');
          process.exit(1);
        }

        const registryUrl = await rl.question(
          'Registry URL (default: https://api.agent-oss.dev): '
        );

        rl.close();

        // Generate keypair
        let spinner = ora('Generating Ed25519 keypair...').start();
        await ensureConfigDir();

        const keyPair = await generateKeyPair();
        const publicKey = await exportPublicKey(keyPair.publicKey);
        const privateKey = await exportPrivateKey(keyPair.privateKey);

        const privateKeyPath = getDefaultPrivateKeyPath();
        const publicKeyPath = getDefaultPublicKeyPath();

        await writeFile(publicKeyPath, publicKey, 'utf-8');
        await writeFile(privateKeyPath, privateKey, 'utf-8');

        // Set secure permissions on private key (owner read/write only)
        await chmod(privateKeyPath, 0o600);

        spinner.succeed('Keypair generated');

        // Generate DID
        spinner = ora('Generating DID...').start();
        const did = generateDID(domain, agentId);
        spinner.succeed('DID created');

        // Save configuration
        spinner = ora('Saving configuration...').start();
        await saveConfig({
          did,
          privateKeyPath,
          publicKeyPath,
          registryUrl: registryUrl || 'https://api.agent-oss.dev',
          guardianGithubId: githubId,
        });
        spinner.succeed('Configuration saved');

        // Summary
        console.log();
        success('Agent initialized successfully!');
        console.log();
        keyValue('  DID', did);
        keyValue('  Public Key', publicKeyPath);
        keyValue('  Private Key', privateKeyPath);
        keyValue('  Registry', registryUrl || 'https://api.agent-oss.dev');
        keyValue('  Guardian', githubId);
        console.log();
        info('Next steps:');
        console.log('  1. Deploy DID document to your domain');
        console.log('  2. Run: agent-oss register');
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });
}
