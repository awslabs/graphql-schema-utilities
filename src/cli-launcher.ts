#!/usr/bin/env node

/*
This is the CLI tool to validate scripts against a schema.  It uses the API found
in the src/ directory to validate all the files in the file glob CLI parameter.
 */

'use strict';

'use strict';

import chalk from 'chalk';
import * as program from 'commander';
import * as fs from 'fs';
import * as graphql from 'graphql';
import * as path from 'path';
import * as cli from './cli';

const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
program
  .version(json.version)
  .usage(`[options] (<glob.graphql>)`)
  .option('-o, --output [pattern]',
   'The file path where the merged schema will be outputted to.')
  .option('-s, --schema [pattern]',
   'Use a glob path that would define all of your schema files to merge them into a valid schema.', '')
  .option('-r, --rules [pattern]',
   'The file path for your custom rules to validate your operations, and your merged schema.', '')
  .option('-p, --operations [pattern]',
   'Use a glob that that contains your graphql operation files to test against the merged schema file.', '')
  .parse(process.argv);

if (!program.schema) {
  program.outputHelp();
} else {
  cli.mergeGQLSchemas(program.schema)
    .then((schema) => {
      let data = graphql.printSchema(schema);
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
            console.error(chalk.red('Error while copying the merged schema into the file. '), program.output, err);
            process.exit(1);
          } else {
            console.log('Successfully written merged schema into a file.');
          }
        });
      }
      if (program.operations) {
        if (!program.rules) {
          cli.validateOperations(program.operations, schema).catch((error) => {
            console.error(chalk.red('Operation files are not valid!'));
            process.exit(1);
          });
        } else {
          try {
            const setOfRules = require(`${program.rules}`);
            cli.validateOperations(program.operations, schema, setOfRules.specifiedRules).catch((error) => {
              console.error(chalk.red('Operation files are not valid!\n'));
              process.exit(1);
            });
          } catch (err) {
            console.error(chalk.
              red(`Could not read ${chalk.yellow(program.rules)} for the custom validation rules. Exiting...`), err);
            process.exit(1);
          }
        }
      }
    },
    )
    .catch((err) => {
      console.error(chalk.red.bold('Could not merge Schema files!\n'));
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