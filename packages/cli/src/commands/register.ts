/**
 * Register agent with registry
 */

import { readFile } from 'node:fs/promises';
import { RegistryClient } from '@agent-oss/registry';
import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, resolvePath } from '../config.js';
import { error, exitWithError, keyValue, success } from '../utils.js';

export function createRegisterCommand(): Command {
  return new Command('register')
    .description('Register agent with the registry')
    .action(async () => {
      const spinner = ora('Loading configuration...').start();

      try {
        const config = await loadConfig();

        // Validate config
        if (!config.did) {
          spinner.fail('No DID configured');
          exitWithError('Run "agent-oss init" first');
        }

        if (!config.guardianGithubId) {
          spinner.fail('No guardian configured');
          exitWithError('Run "agent-oss init" first');
        }

        if (!config.privateKeyPath || !config.publicKeyPath) {
          spinner.fail('No keys configured');
          exitWithError('Run "agent-oss init" first');
        }

        if (!config.registryUrl) {
          spinner.fail('No registry URL configured');
          exitWithError('Run "agent-oss init" first');
        }

        // Load public key
        spinner.text = 'Loading keys...';
        const publicKeyPath = resolvePath(config.publicKeyPath);
        const publicKeyBase64 = await readFile(publicKeyPath, 'utf-8');
        const publicKeyExported = publicKeyBase64.trim();

        // Create registry client (requires Supabase URL and key from env)
        spinner.text = 'Connecting to registry...';
        const supabaseUrl = process.env.SUPABASE_URL || config.registryUrl;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseKey) {
          spinner.fail('Missing credentials');
          exitWithError('Set SUPABASE_KEY environment variable');
        }

        const client = new RegistryClient({
          supabaseUrl,
          supabaseKey,
        });

        // Create DID document
        spinner.text = 'Creating DID document...';
        const { createDIDDocument } = await import('@agent-oss/did');
        const didParts = config.did.split(':');
        const domain = didParts[2];
        const path = didParts.slice(3).join(':');

        const didDocument = createDIDDocument({
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

        // Register agent
        spinner.text = 'Registering agent...';
        const agent = await client.registerAgent({
          did: config.did,
          publicKey: publicKeyExported,
          name: config.did.split(':').pop() || 'agent',
          guardianGithubId: config.guardianGithubId,
          didDocument,
        });

        spinner.succeed('Agent registered successfully');

        console.log();
        success('Registration complete!');
        console.log();
        keyValue('  DID', agent.did);
        keyValue('  Status', agent.status);
        keyValue('  Credits', agent.credits.toString());
        keyValue('  Guardian', config.guardianGithubId);
      } catch (err) {
        spinner.fail('Registration failed');
        error((err as Error).message);
        process.exit(1);
      }
    });
}
