import * as fs from 'fs';
import * as globUtil from 'glob';
import { GraphQLSchema, isSpecifiedDirective, isSpecifiedScalarType, print } from 'graphql';

export function readGlob(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    globUtil(pattern, { silent: false }, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

export function readFile(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) =>
      err ? reject(err) : resolve(data),
    );
  });
}

/**
 * This method is a workaround for the issue of not being able to print the
 * directives fields for the merged schema when using printSchema method
 * @param schema
 */
export function printSchemaWithDirectives(schema: GraphQLSchema): string {
  const str = Object
    .keys(schema.getTypeMap())
    .filter((k) => !k.match(/^__/))
    .reduce((accum, name) => {
      const type = schema.getType(name);
      return !isSpecifiedScalarType(type)
        ? accum += `${print(type.astNode)}\n`
        : accum;
    }, '');

  return schema
    .getDirectives()
    .reduce((accum, d) => {
      return !isSpecifiedDirective(d)
        ? accum += `${print(d.astNode)}\n`
        : accum;
    }, str + `${print(schema.astNode)}\n`);
}
