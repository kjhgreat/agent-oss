/**
 * Sign command (file or message)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { importPrivateKey, signMessage } from '@antfarm/crypto';
import { bytesToBase64url } from '@antfarm/did';
import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, resolvePath } from '../config.js';
import { error, exitWithError, keyValue, readFileBytes } from '../utils.js';

export function createSignCommand(): Command {
  return new Command('sign')
    .description('Sign a file or message')
    .argument('[file]', 'File to sign')
    .option('-m, --message <text>', 'Sign a message string instead of a file')
    .option('-o, --output <file>', 'Output file for signature (default: <file>.sig)')
    .action(async (file: string | undefined, options) => {
      // Validate arguments
      if (!file && !options.message) {
        exitWithError('Specify either a file or use --message <text>');
      }

      if (file && options.message) {
        exitWithError('Cannot specify both file and --message');
      }

      const spinner = ora('Loading configuration...').start();

      try {
        const config = await loadConfig();

        if (!config.privateKeyPath) {
          spinner.fail('No private key configured');
          exitWithError('Run "antfarm init" first');
        }

        // Load private key
        spinner.text = 'Loading private key...';
        const privateKeyPath = resolvePath(config.privateKeyPath);
        const privateKeyBase64 = await readFile(privateKeyPath, 'utf-8');
        const privateKey = await importPrivateKey(privateKeyBase64.trim());

        // Get data to sign
        let data: Uint8Array;

        if (options.message) {
          spinner.text = 'Signing message...';
          data = new TextEncoder().encode(options.message);
        } else {
          if (!file) {
            spinner.fail('No file specified');
            exitWithError('Provide a file to sign');
          }
          spinner.text = `Signing ${file}...`;
          data = await readFileBytes(file);
        }

        // Sign and encode signature
        const signatureBytes = await signMessage(data, privateKey);
        const signature = bytesToBase64url(signatureBytes);

        // Output signature
        if (options.output) {
          await writeFile(options.output, signature, 'utf-8');
          spinner.succeed(`Signature saved to ${options.output}`);
        } else if (file) {
          const outputPath = `${file}.sig`;
          await writeFile(outputPath, signature, 'utf-8');
          spinner.succeed(`Signature saved to ${outputPath}`);
        } else {
          spinner.succeed('Signature created');
          console.log();
          keyValue('Signature', signature);
        }

        if (config.did) {
          console.log();
          keyValue('Signed by', config.did);
        }
      } catch (err) {
        spinner.fail('Signing failed');
        error((err as Error).message);
        process.exit(1);
      }
    });
}
