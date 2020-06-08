# graphql-schema-utilities


A CLI tool to merge schema files, and validate operations against a GraphQL Schema. 

## Installation


```sh
npm install -g graphql-schema-utilities
```

# Usage

## Using the CLI tool

```sh
>> graphql-schema-utilities
```

The tool will first merge schema files and then validate the merged schema, throwing errors if the schema isn't valid and exit with exit code 1.  If Schema is valid it will check each operation in the file glob by parsing the operation and validating it against the schema.  If errors are found, they will be displayed by file name and exit with exit code 1.

### Merging schema files
You can merge your schema files across different modules and directories. In this example, you have three different set of files in three different directories:

```
~/moduleMain/schemas/Root.graphql:
type Query;

~/module1/schemas/Book.graphql:
extend type Query {
  bookById(id: ID!): Book
}
    
type Book {
  id: ID!
  authorId: ID!
}
 
~/module2/schemas/User.graphql:
extend type Query {
  userById(id: ID!): User
}
    
type User {
  id: ID!
  name: String!
}

```

Running the CLI utility generates the merged schema file, Merged_schema.graphQL:

```

type Query {
   userById(id: ID!): User
   bookById(id: ID!): Book
 }
 
 type User {
   id: ID!
   name: String!
 }
 
 type Book {
   id: ID!
   authorId: ID!
 }

```


### The CLI options:

```
Options:
  -V, --version               output the version number.
  -o, --output [pattern]      The file path where the merged schema will be outputted to.
  -s, --schema [pattern]      Use a glob path that would define all of your schema files to merge them into a valid schema. (default: "").
  -r, --rules [pattern]       The file path for your custom rules to validate your operations, and your merged schema. To learn abot how to write your custom rules: check the README.md file  (default: "").
  -p, --operations [pattern]  Use a glob that that contains your graphql operation files to test against the merged schema file. (default: "").
  -d, --includeDirectives     By default will NOT merge the directives, unless you added this flag.
  -h, --help                  output usage information.
```

### How to merge the schema files:
```sh
>> graphql-schema-utilities -s "{./First_Directory/**/*.graphql,./Second_Directory/users/**/
*.graphql}"
```
That will merge all the schema files in both directories. Note that we are passing the directories as [Glob](https://github.com/isaacs/node-glob#readme). 

### How to validate your operations against your merged schema:
```sh
>> graphql-schema-utilities -s "{./First_Directory/**/*.graphql,./Second_Directory/users/**/
*.graphql}" -p "./path_to_directory/operations/*.graphql"
```
Note that the "./path_to_directory/operations/*.graphql" **operations path** is also using [Glob](https://github.com/isaacs/node-glob#readme). 

### How to add your custom validation rules:
These tools will use the validation rules as defined in graphql-js [validation rules](https://github.com/graphql/graphql-js/tree/master/src/validation/rules). But you can create your own validation rule. Here is an example for custom validation rule against your operation which validates that your operation name must be prefixed with **Hawaii_** .

```js
### file name: custom_rule.ts

import { GraphQLError } from 'graphql';

export function doesNotStartWithHawaii(operationName: string): string {
  return `"${operationName}" operation does not start with Hawaii_.`;
}

/**
 * Valid only if it starts with Hawaii_.
 * A GraphQL document is only valid if all defined operations starts with Hawaii_.
 */
export function OperationNameStartsWithHawaii(
  context: any,
): any {
  const knownOperationNames = Object.create(null);  
  return {
    OperationDefinition(node) {
      const operationName = node.name;
      if (operationName) {
        if (!operationName.value.startsWith('Hawaii_')) {
          
          context.reportError(
            new GraphQLError(
              doesNotStartWithHawaii(operationName.value)
            ),
          );
        } else {
          knownOperationNames[operationName.value] = operationName;
        }
      }
      return false;
    },
    FragmentDefinition: () => false,
  };
}
```

Then run the CLI with the rules option: 

```sh
>> graphql-schema-utilities -s "{./First_Directory/**/*.graphql,./Second_Directory/users/**/
*.graphql}" -p "./path_to_directory/operations/*.graphql" -r "path/to/custom_rule.js"
```
**Note:**

1- We are referencing the .js file not the .ts.

2- The path here is **NOT** Glob, You can use either relative or absolute path.


To learn more about how to write your own custom validation rules against graphql schema or operation files:
[Validate method in graphql-js](https://github.com/graphql/graphql-js/blob/master/src/validation/validate.js).




## Merge and Validate programmatically

This tool can be used as a library for a JS app as well. you can call the mergeSchemas async using Promise.

```js
const tools = require('graphql-schema-utilities');

const glob = "{./First_Directory/**/*.graphql,./Second_Directory/users/**/
  *.graphql}"
tools.mergeGQLSchemas(glob).then((schema) => {
  console.log('schema files were merged, and the valid schema is: ', schema)
})
  .catch((error) => {
    console.error(error)
  })
```



Validate operations using promises:

```js

tools.mergeGQLSchemas('./schema/*.graphql').then((schema) => {
  tools.validateOperations('./queries/*.graphql', schema).then((results) => {
    console.log(results)
  })
})
```


*Note:* you must use quotes around each file glob or the utility will not work properly.

## Development

Install dependencies with

```sh
npm install
```

### Build

```sh
npm run build
```


### Run test in watch mode

```sh
npm run test:watch
```

## Contributing

Please help make this tool better. For more information take a look at [CONTRIBUTING.md](CONTRIBUTING.md)

## License
[Apache 2.0](LICENSE)

## Notes
This package was created based on a fork from [graphql-validator](https://github.com/creditkarma/graphql-validator) that was developed by credit-karma.
