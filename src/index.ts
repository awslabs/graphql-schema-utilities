import * as fs from 'fs';
import * as globUtil from 'glob';
import {
  DocumentNode,
  GraphQLError,
  GraphQLSchema,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import {
  ValidationRule,
} from './types';
import * as utils from './utilities';
export { mergeGQLSchemas, validateOperations} from './cli';

export interface IQueryFileError {
  file: string;
  errors: string[];
}

export interface ILoadQueryCallback {
  (err, docs?: DocumentNode[]);
}

export interface IValidateCallback {
  (errors?: IQueryFileError[], results?: DocumentNode[]);
}

export function validateQuery(
  schema: GraphQLSchema,
  document: DocumentNode,
  rules?: ReadonlyArray<ValidationRule>,
): ReadonlyArray<GraphQLError> {
  if (!rules) {
    return validate(schema, document);
  } else {
    return validate(schema, document, rules);
  }
}

export function loadQueryFiles(
  glob: string | string[],
  callback?: ILoadQueryCallback,
): Promise<DocumentNode[]> {
  return new Promise((resolve, reject) => {
    function loadAll(files) {
      const promises = files.map(utils.readFile);
      return Promise.all(promises)
        .then((fileResults) => {
          const docs = fileResults.map((text: string, index) => parse(text));
          callback ? callback(null, docs) : resolve(docs);
        })
        .catch((err) => (callback ? callback(err) : reject(err)));
    }
    if (glob instanceof Array) {
      loadAll(glob);
    } else {
      utils
        .readGlob(glob)
        .then(loadAll)
        .catch((err) => (callback ? callback(err) : reject(err)));
    }
  });
}

export function validateQueryFiles(
  glob: string,
  schema: GraphQLSchema,
  rules?: ReadonlyArray<ValidationRule>,
  callback?: IValidateCallback,
): Promise<IQueryFileError[]> {
  return new Promise((resolve, reject) => {
    let queries;
    utils
      .readGlob(glob)
      .then((files) => {
        queries = files;
        return loadQueryFiles(files);
      })
      .then((docs) => {
        const errors = validateQueries(docs, schema, rules, queries);
        if (errors.length) {
          callback ? callback(errors) : reject(errors);
        } else {
          callback ? callback(null, queries) : resolve(queries);
        }
      })
      .catch((err) => {
        const errs = [
          {
            errors: [err.toString()],
            file: '',
          },
        ];
        callback ? callback(errs) : reject(errs);
      });
  });
}

export function validateQueries(
  docs: DocumentNode[],
  schema: GraphQLSchema,
  rules?: ReadonlyArray<ValidationRule>,
  files?: string[],
): IQueryFileError[] {
  const results = [];

  docs.forEach((doc, index) => {
    const errs = validateQuery(schema, doc, rules);

    if (errs.length) {
      results.push({
        errors: errs.map((err) => err.toString()),
        file: files ? files[index] : '',
      });
    }
  });

  return results;
}
