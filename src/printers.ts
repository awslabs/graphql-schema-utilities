import {
    ArgumentNode,
    astFromValue,
    BooleanValueNode,
    EnumValueNode,
    FloatValueNode,
    GraphQLDirective,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLInterfaceType,
    GraphQLNamedType,
    GraphQLObjectType,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLUnionType,
    IntValueNode,
    isEnumType,
    isInputObjectType,
    isInterfaceType,
    isIntrospectionType,
    isObjectType,
    isScalarType,
    isSpecifiedDirective,
    isSpecifiedScalarType,
    isUnionType,
    ListValueNode,
    NullValueNode,
    ObjectValueNode,
    print,
    printSchema,
    StringValueNode,
    ValueNode,
} from 'graphql';
import { printBlockString } from 'graphql/language/blockString';
import objectValues from 'graphql/polyfills/objectValues';

/**
 * This method is a workaround for the issue of not being able to print the
 * directives fields for the merged schema when using printSchema method
 *
 * This is mostly copied from GQL v14, but we differ from the reference
 * implementation in how we handle printing directives.
 *
 * The existing implementation will not print directives declared on various
 * parts of the AST instead relying on the actual application to handle those at evaluation time.
 *
 * However, our build system is used to re-present schemas. We need to preserve the directive information
 * until the upstream systems can decided what to do with them.
 *
 * @param schema
 */
export function printSchemaWithDirectives(schema: GraphQLSchema): string {
    return printFilteredSchema(
        schema,
        (n) => !isSpecifiedDirective(n),
        isDefinedType,
    );
}

export function printSchemaDefault(schema: GraphQLSchema): string {
    return printSchema(schema);
}

function printFilteredSchema(
    schema: GraphQLSchema,
    directiveFilter: (type: GraphQLDirective) => boolean,
    typeFilter: (type: GraphQLNamedType) => boolean,
): string {
    const directives = schema.getDirectives().filter(directiveFilter);
    const typeMap = schema.getTypeMap();
    const types = objectValues(typeMap)
        .sort((type1, type2) => type1.name.localeCompare(type2.name))
        .filter(typeFilter);

    return (
        [printSchemaDefinition(schema)]
            .concat(
                directives.map((directive) => printDirective(directive)),
                types.map((type) => printType(type)),
            )
            .filter(Boolean)
            .join('\n\n') + '\n'
    );

}

function printType(type: GraphQLNamedType): string {
    if (isScalarType(type)) {
        return printScalar(type);
    } else if (isObjectType(type)) {
        return printObject(type);
    } else if (isInterfaceType(type)) {
        return printInterface(type);
    } else if (isUnionType(type)) {
        return printUnion(type);
    } else if (isEnumType(type)) {
        return printEnum(type);
    } else if (isInputObjectType(type)) {
        return printInputObject(type);
    }

    // Not reachable. All possible types have been considered.
    throw Error('Unexpected type: ' +  type);
}

function printScalar(type: GraphQLScalarType): string {
    return printDescription(type) + `scalar ${type.name}`;
}


function getImplementedInterfaces(type: GraphQLObjectType | GraphQLInterfaceType): string {
    const interfaces = type.getInterfaces();
    const implementedInterfaces = interfaces.length
        ? ' implements ' + interfaces.map((i) => i.name).join(' & ')
        : '';
    return implementedInterfaces;
}

function printInterface(type: GraphQLInterfaceType): string {
    const implementedInterfaces = getImplementedInterfaces(type);
    return (
        printDescription(type) +
        `interface ${type.name}${implementedInterfaces}` +
        printFields(type)
    );
}
function printObject(type: GraphQLObjectType): string {
    const implementedInterfaces = getImplementedInterfaces(type);
    return (
        printDescription(type) +
        `type ${type.name}${implementedInterfaces}` +
        printFields(type)
    );
}

function printUnion(type: GraphQLUnionType): string {
    const types = type.getTypes();
    const possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
    return printDescription(type) + 'union ' + type.name + printDirectiveNode(type.astNode) + possibleTypes;
}

function printEnum(type: GraphQLEnumType): string {
    const values = type
        .getValues()
        .map(
            (value, i) =>
                printDescription(value, '  ', !i) +
                '  ' +
                value.name +
                printDirectiveField(value),
        );

    return (
        printDescription(type) + `enum ${type.name}` + printBlock(type, values)
    );
}

function printInputObject(type: GraphQLInputObjectType): string {
    const fields = printInputFields(type);
    return (
        printDescription(type) +
        `input ${type.name}` +
        printBlock(type, fields)
    );
}

function printInputFields(type) {
    return objectValues(type.getFields()).map(
        (f, i) =>
            printDescription(f, '  ', !i) +
            '  ' +
            printInputValue(f),
    );
}

function printFields(type) {
    const fields = objectValues(type.getFields()).map(
        (f, i) =>
            printDescription(f, '  ', !i) +
            '  ' +
            f.name +
            printArgs(f.args, '  ') +
            ': ' +
            String(f.type) +
            printDirectiveField(f),
    );
    return printBlock(type, fields);
}

function printDirectiveField(field) {
    const node = field.astNode;
    return printDirectiveNode(node);
}

function printDirectiveNode(node) {
    if (!node || !node.directives || node.directives.length === 0) {
        return '';
    }

    const directives = node.directives.map(
        (directive) => {
            let directiveString = '';
            directiveString += ' @';
            directiveString += directive.name.value;

            if (directive.arguments.length > 0) {
                directiveString += '(';
                directive.arguments.forEach((arg, i) => {
                    directiveString += printArgument(arg);
                    if (i !== directive.arguments.length - 1) {
                        directiveString += ', ';
                    }
                });
                directiveString += ')';
            }
            return directiveString;
        });

    return directives.join('');
}

function printArgument(node: ArgumentNode) {
    return node.name.value
        + ': '
        + printArgumentValueNode(node.value);
}

function printBlock(type, items) {
    const directiveStatement = printDirectiveNode(type.astNode);
    if (items.length !== 0) {
        return directiveStatement + ' {\n' + items.join('\n') + '\n}';
    } else {
        return '';
    }
}

function isDefinedType(type: GraphQLNamedType): boolean {
    return !isSpecifiedScalarType(type) && !isIntrospectionType(type);
}

function printSchemaDefinition(schema: GraphQLSchema): string {
    if (isSchemaOfCommonNames(schema)) {
        return;
    }

    const operationTypes = [];

    const queryType = schema.getQueryType();
    if (queryType) {
        operationTypes.push(`  query: ${queryType.name}`);
    }

    const mutationType = schema.getMutationType();
    if (mutationType) {
        operationTypes.push(`  mutation: ${mutationType.name}`);
    }

    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) {
        operationTypes.push(`  subscription: ${subscriptionType.name}`);
    }

    return `schema {\n${operationTypes.join('\n')}\n}`;
}

function isSchemaOfCommonNames(schema: GraphQLSchema): boolean {
    const queryType = schema.getQueryType();
    if (queryType && queryType.name !== 'Query') {
        return false;
    }

    const mutationType = schema.getMutationType();
    if (mutationType && mutationType.name !== 'Mutation') {
        return false;
    }

    const subscriptionType = schema.getSubscriptionType();
    return !(subscriptionType && subscriptionType.name !== 'Subscription');
}

function printDirective(directive) {
    return (
        printDescription(directive) +
        'directive @' +
        directive.name +
        printArgs(directive.args) +
        (directive.isRepeatable ? ' repeatable' : '') +
        ' on ' +
        directive.locations.join(' | ')
    );
}

function printDescription(
    def,
    indentation = '',
    firstInBlock = true,
): string {
    if (!def.description) {
        return '';
    }
    const lines = descriptionLines(def.description, 120 - indentation.length);
    const text = lines.join('\n');
    const preferMultipleLines = text.length > 70;
    const blockString = printBlockString(text, '', preferMultipleLines);
    const prefix =
        indentation && !firstInBlock ? '\n' + indentation : indentation;

    return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}

function printArgs(args, indentation = '') {
    if (args.length === 0) {
        return '';
    }

    // If every arg does not have a description, print them on one line.
    if (args.every((arg) => !arg.description)) {
        return '(' + args.map(printInputValue).join(', ') + ')';
    }

    return (
        '(\n' +
        args
            .map(
                (arg, i) =>
                    printDescription(arg, '  ' + indentation, !i) +
                    '  ' +
                    indentation +
                    printInputValue(arg),
            )
            .join('\n') +
        '\n' +
        indentation +
        ')'
    );
}

function printInputValue(arg) {
    const defaultAST = astFromValue(arg.defaultValue, arg.type);
    // printDirectiveNode
    let argDecl = arg.name + ': ' + String(arg.type) + printDirectiveField(arg);
    if (defaultAST) {
        argDecl += ` = ${print(defaultAST)}`;
    }
    return argDecl;
}

function printArgumentValueNode(type: ValueNode) {
    switch (type.kind) {
        case 'BooleanValue':
            return printLiteralArgumentValueNode(type as BooleanValueNode);

        case 'FloatValue':
            return printLiteralArgumentValueNode(type as FloatValueNode);

        case 'IntValue':
            return printLiteralArgumentValueNode(type as IntValueNode);

        case 'NullValue':
            return printNullValueNode(type as NullValueNode);

        case 'StringValue':
            return printStringValueNode(type as StringValueNode);

        case 'ListValue':
            return printListValueNode(type as ListValueNode);

        case 'EnumValue':
            return printEnumValueNode(type as EnumValueNode);

        case 'ObjectValue':
            return printObjectValueNode(type as ObjectValueNode);
    }

    throw Error('Cannot print complex directive of type: ' + String(type.kind));
}

function printLiteralArgumentValueNode(node: IntValueNode | FloatValueNode | BooleanValueNode) {
    return node.value;
}

function printStringValueNode(node: StringValueNode) {
    return '"' + node.value + '"';
}

function printNullValueNode(node: NullValueNode) {
    return null;
}

function printListValueNode(node: ListValueNode) {
    return '[' + node.values.map(printArgumentValueNode).join(', ') + ']';
}

function printEnumValueNode(node: EnumValueNode) {
    return node.value;
}

function printObjectValueNode(node) {
    return '{' + node.fields.map(printObjectField).join(', ') + '}';
}

function printObjectField(field) {
    return field.name.value + ': ' + printArgumentValueNode(field.value);
}

function descriptionLines(description: string, maxLen: number): string[] {
    const rawLines = description.split('\n');
    const updatedLines = [];
    for (const line of rawLines) {
        if (line.length < maxLen + 5) {
            updatedLines.push(line);
        } else {
            // For > 120 character long lines, cut at space boundaries into sublines
            // of ~80 chars.
            const brokenLines = breakLine(line, maxLen);
            for (const brokenLine of brokenLines) {
                updatedLines.push(brokenLine);
            }
        }
    }
    return updatedLines;
}

function breakLine(line: string, maxLen: number): string[] {
    const parts = line.split(new RegExp(`((?: |^).{15,${maxLen - 40}}(?= |$))`));
    if (parts.length < 4) {
        return [line];
    }
    const sublines = [parts[0] + parts[1] + parts[2]];
    for (let i = 3; i < parts.length; i += 2) {
        sublines.push(parts[i].slice(1) + parts[i + 1]);
    }
    return sublines;
}
