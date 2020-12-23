#!/usr/bin/env node

/*
This is the CLI tool to validate scripts against a schema.  It uses the API found
in the src/ directory to validate all the files in the file glob CLI parameter.
 */

import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as cli from './cli';
import { consoleLogger } from './logger';
import { printSchemaDefault, printSchemaWithDirectives } from './printers';
// @ts-ignore
const packageJson = require('../package.json');
program
  .version(packageJson.version)
  .usage(`[options] (<glob.graphql>)`)
  .option('-o, --output [pattern]',
   'The file path where the merged schema will be outputted to.')
  .option('-s, --schema [pattern]',
   'Use a glob path that would define all of your schema files to merge them into a valid schema.', '')
  .option('-r, --rules [pattern]',
   'The file path for your custom rules to validate your operations, and your merged schema.', '')
  .option('-p, --operations [pattern]',
    'Use a glob that that contains your graphql operation files to test against the merged schema file.', '')
  .option('-d, --includeDirectives',
    'By default will NOT merge the directives, unless you added this flag.', false)
  .parse(process.argv);

if (!program.schema) {
  program.outputHelp();
} else {
  cli.mergeGQLSchemas(program.schema)
    .then((schema) => {
      let data = '';
      if (program.includeDirectives) {
        data = printSchemaWithDirectives(schema);
      } else {
        data = printSchemaDefault(schema);
      }
      if (schema.getQueryType().toString() === 'Query' && (!schema.getMutationType()
        || schema.getMutationType().toString() === 'Mutation')
        && (!schema.getSubscriptionType()
          || schema.getSubscriptionType().toString() === 'Subscription')) {
        const typeDefs =
          `schema { \n  query: Query ${schema.getMutationType()
            ? '\n  mutation: Mutation' : ''} ${schema.getSubscriptionType()
              ? '\n  subscription: Subscription' : ''}  \n}\n\n`;
        data = typeDefs + data;
      }
      process.stdout.write(data);
      if (program.output) {
        ensureDirectoryExistence(program.output);
        fs.writeFile(program.output, data, (err) => {
          if (err) {
            consoleLogger.error('Error while copying the merged schema into the file. ', program.output, err);
            process.exit(1);
          } else {
            consoleLogger.log('Successfully written merged schema into a file.');
          }
        });
      }
      if (program.operations) {
        if (!program.rules) {
          cli.validateOperations(program.operations, schema).catch((error) => {
            consoleLogger.error('Operation files are not valid!');
            process.exit(1);
          });
        } else {
          try {
            const setOfRules = require(`${program.rules}`);
            cli.validateOperations(program.operations, schema, setOfRules.specifiedRules).catch((error) => {
              consoleLogger.error('Operation files are not valid!\n');
              process.exit(1);
            });
          } catch (err) {
            consoleLogger.error(`Could not read ${(program.rules)} for the custom validation rules. Exiting...`, err);
            process.exit(1);
          }
        }
      }
    },
    )
    .catch((err) => {
      consoleLogger.error('Could not merge Schema files!\n', err);
      process.exit(1);
    });
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
