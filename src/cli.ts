import * as fs from 'fs';
import * as Glob from 'glob';
import {
  DocumentNode,
  graphql,
  GraphQLError,
  GraphQLSchema,
  parse,
  printSchema,
} from 'graphql';
import {
  buildSchemaFromTypeDefinitions,
  makeExecutableSchema,
} from 'graphql-tools';
import * as validator from './index';
import { consoleLogger } from './logger';
import { ValidationRule } from './types';
import * as utils from './utilities';
import { validateSchemaWithSourceMap } from './validate-schema';

/**
 * Returns GraphQLSchema after merging the set of files from the Glob pattern.
 * @returns Promise<GraphQLSchema>
 * @param schemaPattern
 */
export function mergeGQLSchemas(schemaPattern: string): Promise<GraphQLSchema> {
  return new Promise((resolve, reject) => {
    consoleLogger.log(`\nLoading schema from ${schemaPattern}`);
    utils.readGlob(schemaPattern).then((files) => {
      if (!files.length) {
        const noFilesMatching = `No matching files were found with Glob: ${schemaPattern}.`;
        consoleLogger.error(noFilesMatching);
        reject(new Error(noFilesMatching));
      }
      Promise.all(
        files.map((file) =>
          utils
            .readFile(file)
            .then((subSchema: string) => subSchema)
            .catch((error) => {
              consoleLogger.error(
                `An error occurred while trying to read your graphql schemas in ${schemaPattern}. \n`,
                error,
              );
              reject(error);
            }),
        ),
      ).then((listOfSchemas: string[]) => {
        try {
          const map = new Map();
          files.forEach((fileName, index) => {
            map.set(fileName, listOfSchemas[index]);
          });
          const mergedSchema = validateSchemaWithSourceMap(map);
          resolve(mergedSchema);
        } catch (errs) {
          reject(errs);
        }
      });
    });
  });
}

/**
 * Validates your operations against your valid schema object.
 * @param queriesPattern
 * @param validSchema
 */
export function validateOperations(
  queriesPattern: string,
  validSchema: GraphQLSchema,
  rules?: ReadonlyArray<ValidationRule>,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    consoleLogger.log(
      `\nValidating queries for ${queriesPattern} using loaded schema`,
    );

    function outputErrors(errs) {
      consoleLogger.log('\nErrors found:');
      errs.forEach((err) => {
        consoleLogger.log(`\nFile: ${err.file}`);
        err.errors.forEach((errStr) => {
          consoleLogger.log(`\t${errStr}`);
        });
      });
      consoleLogger.log('\n');
    }

    validator
      .validateQueryFiles(queriesPattern, validSchema, rules)
      .then(() => {
        consoleLogger.log('All queries are valid\n');
        resolve();
      })
      .catch((errs) => {
        outputErrors(errs);
        reject(errs);
      });
  });
}
