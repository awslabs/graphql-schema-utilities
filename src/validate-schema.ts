import chalk from 'chalk';
import * as fs from 'fs';
import { GraphQLError, GraphQLSchema } from 'graphql';
import {
  makeExecutableSchema,
} from 'graphql-tools';
import * as validator from './index';
import { consoleLogger } from './logger';

/**
 * Validates the schema against Syntax and Semantics errors.
 * If an error is found then will log the file path that is causing the schema error and the error message itself.
 * @param map that contains filename as key and the file content as the value.
 */
export const validateSchemaWithSourceMap = (
  map: Map<string, string>,
): GraphQLSchema => {
  let errorCounter = 0;
  const listOfErrors: string[] = [];
  const errorsSeparator = '\n\n';
  const listOfSchemas: string[] = Array.from(map.values());
  const fileNames: string[] = Array.from(map.keys());
  try {
    const mergedSchema = makeExecutableSchema({ typeDefs: listOfSchemas });
    return mergedSchema;
  } catch (allErrors) {
    const allErrorsMessages: string = allErrors.message;
    const allErrorsList: string[] = allErrorsMessages.split(errorsSeparator);
    const errorListClone: string[] = allErrorsList.slice();
    let listOfUnMappedErrors: string[] = allErrorsList.slice();
    for (let i = 0; i < listOfSchemas.length; i++) {
      try {
        const fileSchema = makeExecutableSchema({ typeDefs: listOfSchemas[i] });
      } catch (error) {
        const errorsMessages: string = error.message;
        const errorsList = errorsMessages.split(errorsSeparator);
        errorsList.forEach((errorItem) => {
          allErrorsList.forEach((allErrorsItem, x) => {
            const locations = error.locations;
            // If the Error exists in both the mergedschema and in the file X, then file X is the reason.
            // Special case for the locations here.
            // It is because the location in the merged file will be different from the file itself.
            if (allErrorsItem.includes(errorItem) || error.locations) {
              listOfErrors.push(
                constructErrorMessage(++errorCounter, errorItem, fileNames[i]),
              );
              listOfUnMappedErrors = popError(listOfUnMappedErrors, errorItem);
              if (locations) {
                // Syntax error found. locations are only availble for syntax errors.
                consoleLogger.error('Location of errors: ', locations);
              }
              const index = errorListClone.indexOf(allErrorsItem);
              if (index > -1) {
                errorListClone.splice(index, 1);
              }
            }
          });
        });
      }
    }

    // The loop below detects if there is an error in mergedschema but not in mergedschema without file X,
    // then file X is the reason for that error.
    for (let i = 0; i < listOfSchemas.length; i++) {
      try {
        const schemaWithoutFilei = listOfSchemas.slice();
        const index = schemaWithoutFilei.indexOf(listOfSchemas[i]);
        if (index > -1) {
          schemaWithoutFilei.splice(index, 1);
        }
        const mergedSchemaWithoutFile = makeExecutableSchema({
          typeDefs: schemaWithoutFilei,
        });
        errorListClone.forEach((errorItem) => {
          listOfErrors.push(
            constructErrorMessage(++errorCounter, errorItem, fileNames[i]),
          );
          listOfUnMappedErrors = popError(listOfUnMappedErrors, errorItem);
        });
      } catch (error) {
        const errorsMessages: string = error.message;
        const errorsList = errorsMessages.split(errorsSeparator);
        errorListClone.forEach((errorItem) => {
          if (errorsList.indexOf(errorItem) < 0) {
            listOfErrors.push(
              constructErrorMessage(++errorCounter, errorItem, fileNames[i]),
            );
            listOfUnMappedErrors = popError(listOfUnMappedErrors, errorItem);
          }
        });
      }
    }

    if (errorCounter) {
      // Go over the list of unmapped errors if it is not empty then add new errors that source map could detect.
      listOfUnMappedErrors.forEach((errorItem) => {
        consoleLogger.error(`>> Error(${++errorCounter}): ${errorItem}.`);
      });
      consoleLogger.log(
        `>> Total numbers of errors found: ${errorCounter +
          listOfUnMappedErrors.length}.`,
      );
      throw new Error(`${listOfErrors}`);
    }
  }
};

/**
 * Returns the full path for a specific schema file.
 * @param fileName
 */
function getFullPath(fileName: string): string {
  return encodeURI(`file://${process.cwd() + '/' + fileName}`);
}

/**
 * Construct the error message.
 * @param errorCounter
 * @param errorItem
 * @param fileName
 */
function constructErrorMessage(
  errorCounter: number,
  errorItem: string,
  fileName: string,
): string {
  const errorMessage = `>> Error(${errorCounter}): ${errorItem} check the file:\n${chalk.blue.
    underline(getFullPath(
    fileName,
  ))}`;
  consoleLogger.error(`${errorMessage}\n`);
  return errorMessage;
}

/**
 * Popout/Removes a specific error from the list of errors when one of the error items in the list is identical.
 * @param errorList
 * @param errorItem
 */
function popError(errorList: string[], errorItem: string) {
  return errorList.filter((item) => item !== errorItem);
}
