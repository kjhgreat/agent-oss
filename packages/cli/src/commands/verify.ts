/**
 * Verify signature command
 */

import { readFile } from 'node:fs/promises';
import { verifySignature } from '@antfarm/crypto';
import { extractPublicKey } from '@antfarm/did';
import { resolveDID } from '@antfarm/did';
import { Command } from 'commander';
import ora from 'ora';
import { error, exitWithError, keyValue, readFileBytes, success, warning } from '../utils.js';

export function createVerifyCommand(): Command {
  return new Command('verify')
    .description('Verify a signature')
    .argument('<file>', 'File that was signed')
    .argument('<signature>', 'Signature file or string')
    .requiredOption('-d, --did <did>', 'DID of the signer')
    .action(async (file: string, signatureArg: string, options) => {
      const spinner = ora('Reading file...').start();

      try {
        // Read the file data
        const data = await readFileBytes(file);

        // Read signature (try as file first, then as direct string)
        spinner.text = 'Reading signature...';
        let signature: string;
        try {
          signature = (await readFile(signatureArg, 'utf-8')).trim();
        } catch {
          // Not a file, treat as direct signature string
          signature = signatureArg;
        }

        // Resolve DID to get public key
        spinner.text = `Resolving DID ${options.did}...`;
        const result = await resolveDID(options.did);

        if (!result.didDocument) {
          spinner.fail('DID not found');
          exitWithError('Could not resolve DID');
        }

        spinner.text = 'Extracting public key...';
        const publicKey = extractPublicKey(result.didDocument);

        if (!publicKey) {
          spinner.fail('No public key found in DID document');
          exitWithError('DID document does not contain a verification key');
        }

        // Verify signature (need to convert signature from base64url to bytes)
        spinner.text = 'Verifying signature...';
        const { base64urlToBytes } = await import('@antfarm/did');
        const signatureBytes = base64urlToBytes(signature);
        const isValid = await verifySignature(data, signatureBytes, publicKey);

        if (isValid) {
          spinner.succeed('Signature is valid');
          console.log();
          success('Verification passed');
          keyValue('  File', file);
          keyValue('  Signed by', options.did);
        } else {
          spinner.fail('Signature is invalid');
          console.log();
          warning('Verification failed');
          console.log('  The signature does not match the file or was not signed by this DID');
          process.exit(1);
        }
      } catch (err) {
        spinner.fail('Verification failed');
        error((err as Error).message);
        process.exit(1);
      }
    });
}
