/**
 * Key generation command
 */

import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exportPrivateKey, exportPublicKey, generateKeyPair } from '@antfarm/crypto';
import { Command } from 'commander';
import ora from 'ora';
import { ensureConfigDir, getKeysDir } from '../config.js';
import { error, info, keyValue, success } from '../utils.js';

export function createKeygenCommand(): Command {
  return new Command('keygen')
    .description('Generate a new Ed25519 keypair')
    .option('-o, --output <dir>', 'Output directory for keys', getKeysDir())
    .action(async (options) => {
      const spinner = ora('Generating Ed25519 keypair...').start();

      try {
        // Ensure output directory exists
        await ensureConfigDir();

        // Generate keypair
        const keyPair = await generateKeyPair();

        // Export keys
        const publicKey = await exportPublicKey(keyPair.publicKey);
        const privateKey = await exportPrivateKey(keyPair.privateKey);

        // Save to files
        const publicKeyPath = join(options.output, 'public.key');
        const privateKeyPath = join(options.output, 'private.key');

        await writeFile(publicKeyPath, publicKey, 'utf-8');
        await writeFile(privateKeyPath, privateKey, 'utf-8');

        // Set secure permissions on private key (owner read/write only)
        await chmod(privateKeyPath, 0o600);

        spinner.succeed('Keypair generated successfully');

        console.log();
        success('Keys saved:');
        keyValue('  Public key', publicKeyPath);
        keyValue('  Private key', privateKeyPath);

        console.log();
        info('Keep your private key secure and never share it!');
      } catch (err) {
        spinner.fail('Failed to generate keypair');
        error((err as Error).message);
        process.exit(1);
      }
    });
}
