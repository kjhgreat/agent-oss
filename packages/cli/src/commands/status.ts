/**
 * Check agent status and credits
 */

import { RegistryClient } from '@antfarm/registry';
import { Command } from 'commander';
import ora from 'ora';
import { loadConfig } from '../config.js';
import {
  error,
  exitWithError,
  formatCredits,
  formatTimestamp,
  header,
  keyValue,
} from '../utils.js';

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Check agent status and credits')
    .argument('[did]', 'DID to check (default: configured agent)')
    .option('-l, --ledger', 'Show credit ledger entries')
    .option('-n, --limit <n>', 'Number of ledger entries to show', '10')
    .action(async (did: string | undefined, options) => {
      const spinner = ora('Loading configuration...').start();

      try {
        const config = await loadConfig();

        // Determine which DID to check
        const targetDid = did || config.did;
        if (!targetDid) {
          spinner.fail('No DID specified');
          exitWithError('Specify a DID or run "antfarm init" first');
        }

        if (!config.registryUrl) {
          spinner.fail('No registry URL configured');
          exitWithError('Run "antfarm init" first');
        }

        // Create registry client
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

        // Get agent info
        spinner.text = 'Fetching agent status...';
        const agent = await client.getAgent(targetDid);

        if (!agent) {
          spinner.fail('Agent not found');
          exitWithError(`No agent registered with DID: ${targetDid}`);
        }

        spinner.succeed('Status retrieved');

        // Display agent info
        console.log();
        header('Agent Status');
        keyValue('  DID', agent.did);
        keyValue('  Status', agent.status);
        keyValue('  Credits', agent.credits.toString());
        keyValue('  Registered', formatTimestamp(agent.createdAt));
        keyValue('  Updated', formatTimestamp(agent.updatedAt));

        // Show ledger if requested
        if (options.ledger) {
          spinner.start('Fetching credit ledger...');

          const ledger = await client.getCreditHistory(
            targetDid,
            Number.parseInt(options.limit, 10)
          );

          spinner.succeed(`Ledger retrieved (${ledger.length} entries)`);

          if (ledger.length > 0) {
            console.log();
            header('Recent Credit Events');
            console.log();

            for (const entry of ledger) {
              const amount = formatCredits(entry.amount);
              const timestamp = formatTimestamp(entry.createdAt);

              console.log(`  ${timestamp}`);
              keyValue('    Type', entry.type);
              keyValue('    Amount', amount);
              keyValue('    Balance', entry.balanceAfter.toString());
              if (entry.reason) {
                keyValue('    Note', entry.reason);
              }
              console.log();
            }
          } else {
            console.log();
            console.log('  No credit events yet');
          }
        }
      } catch (err) {
        spinner.fail('Failed to fetch status');
        error((err as Error).message);
        process.exit(1);
      }
    });
}
