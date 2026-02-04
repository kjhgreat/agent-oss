/**
 * DID commands (create, resolve)
 */

import { readFile } from 'node:fs/promises';
import { exportPublicKey, importPublicKey } from '@agent-oss/crypto';
import { createDIDDocument, getWellKnownUrl, resolveDID } from '@agent-oss/did';
import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, resolvePath } from '../config.js';
import { error, exitWithError, formatDID, header, info } from '../utils.js';

export function createDidCommand(): Command {
  const didCommand = new Command('did').description('DID operations (create, resolve)');

  // did create
  didCommand
    .command('create')
    .description('Create DID document from config')
    .action(async () => {
      const spinner = ora('Loading configuration...').start();

      try {
        const config = await loadConfig();

        if (!config.did) {
          spinner.fail('No DID configured');
          exitWithError('Run "agent-oss init" first');
        }

        if (!config.publicKeyPath) {
          spinner.fail('No public key configured');
          exitWithError('Run "agent-oss init" first');
        }

        spinner.text = 'Reading public key...';
        const publicKeyPath = resolvePath(config.publicKeyPath);
        const publicKeyBase64 = await readFile(publicKeyPath, 'utf-8');
        const publicKey = await importPublicKey(publicKeyBase64.trim());
        const publicKeyExported = await exportPublicKey(publicKey);

        spinner.text = 'Creating DID document...';
        // Extract domain and path from DID (did:web:domain:path1:path2)
        const didParts = config.did.split(':');
        const domain = didParts[2];
        const path = didParts.slice(3).join(':');

        const document = createDIDDocument({
          domain,
          path: path || '',
          publicKey: publicKeyExported,
          serviceEndpoints: config.registryUrl
            ? [
                {
                  id: `${config.did}#registry`,
                  type: 'AgentRegistry',
                  serviceEndpoint: config.registryUrl,
                },
              ]
            : undefined,
        });

        spinner.succeed('DID document created');

        console.log();
        header('DID Document');
        console.log(JSON.stringify(document, null, 2));
        console.log();

        const wellKnownUrl = getWellKnownUrl(config.did);
        info('Deploy this document to:');
        console.log(`  ${wellKnownUrl}`);
      } catch (err) {
        spinner.fail('Failed to create DID document');
        error((err as Error).message);
        process.exit(1);
      }
    });

  // did resolve
  didCommand
    .command('resolve <did>')
    .description('Resolve and display a DID document')
    .action(async (did: string) => {
      const spinner = ora(`Resolving ${formatDID(did)}...`).start();

      try {
        const result = await resolveDID(did);

        if (!result.didDocument) {
          spinner.fail('DID not found');
          if (result.didResolutionMetadata.error) {
            error(result.didResolutionMetadata.error);
          }
          process.exit(1);
        }

        spinner.succeed('DID resolved');

        console.log();
        header('DID Document');
        console.log(JSON.stringify(result.didDocument, null, 2));

        if (result.didDocumentMetadata) {
          console.log();
          header('Metadata');
          console.log(JSON.stringify(result.didDocumentMetadata, null, 2));
        }
      } catch (err) {
        spinner.fail('Failed to resolve DID');
        error((err as Error).message);
        process.exit(1);
      }
    });

  return didCommand;
}
