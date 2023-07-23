import { expect } from 'code';
import * as Lab from 'lab';
export const lab = Lab.script();

const describe = lab.describe;
const it = lab.it;
const before = lab.before;

import * as fs from 'fs';
import * as cli from '../cli';
import * as printers from '../printers';

describe('GraphQL Schema Printers', () => {
    describe('#printSchemaWithDirectives', () => {
        describe(`When loading and printing a schema with directives.`, () => {
            const glob = './fixtures/directiveSchemas/**/*.graphql';
            let printedSchema;
            before((done) => {
                cli.mergeGQLSchemas(glob).then((s) => {
                    printedSchema = printers.printSchemaWithDirectives(s);
                    done();
                });
            });

            it('Has symmetric equality preserving directives', (done) => {
                expect(printedSchema).to.exist();
                const expectedSchema: string = fs.readFileSync(
                    './fixtures/expectedOutput/directiveSchemas/printedWithDirectives.graphql', 'utf8');
                expect(printedSchema).to.equal(expectedSchema);
                done();
            });
        });

        describe(`When loading and printing the canonical schema example.`, () => {
            const glob = './fixtures/helloWorld/**/*.graphql';
            let printedSchema: string;
            before((done) => {
                cli.mergeGQLSchemas(glob).then((s) => {
                    printedSchema = printers.printSchemaWithDirectives(s);
                    done();
                });
            });

            it('Has symmetric equality preserving directives', (done) => {
                expect(printedSchema).to.exist();
                const expectedSchema: string = fs.readFileSync(
                    './fixtures/expectedOutput/helloWorld/expectedOutput.graphql', 'utf8');
                expect(printedSchema).to.equal(expectedSchema);
                done();
            });
        });

        describe(`When loading and printing the custom input object in directive arguments.`, () => {
            const glob = './fixtures/inputObjectInDirective/**/*.graphql';
            let printedSchema: string;
            before((done) => {
                cli.mergeGQLSchemas(glob).then((s) => {
                    printedSchema = printers.printSchemaWithDirectives(s);
                    done();
                });
            });

            it('Has symmetric equality preserving directives', (done) => {
                expect(printedSchema).to.exist();
                const expectedSchema: string = fs.readFileSync(
                    './fixtures/expectedOutput/inputObjectInDirective/printedInputObject.graphql', 'utf8');
                expect(printedSchema).to.equal(expectedSchema);
                done();
            });
        });
    });

    describe('#printSchemaDefault', () => {
        describe(`When loading and printing a schema with directives.`, () => {
            const glob = './fixtures/directiveSchemas/**/*.graphql';
            let printedSchema: string;
            before((done) => {
                cli.mergeGQLSchemas(glob).then((s) => {
                    printedSchema = printers.printSchemaDefault(s);
                    done();
                });
            });

            it('Has symmetric equality without custom directives', (done) => {
                expect(printedSchema).to.exist();
                const expectedSchema: string = fs.readFileSync(
                    './fixtures/expectedOutput/directiveSchemas/printedDefault.graphql', 'utf8');
                expect(printedSchema).to.equal(expectedSchema);
                done();
            });
        });

        describe(`When loading and printing the canonical schema example with directives.`, () => {
            const glob = './fixtures/helloWorld/**/*.graphql';
            let printedSchema: string;
            before((done) => {
                cli.mergeGQLSchemas(glob).then((s) => {
                    printedSchema = printers.printSchemaWithDirectives(s);
                    done();
                });
            });

            it('Has symmetric equality preserving directives', (done) => {
                expect(printedSchema).to.exist();
                const expectedSchema: string = fs.readFileSync(
                    './fixtures/expectedOutput/helloWorld/expectedOutput.graphql', 'utf8');
                expect(printedSchema).to.equal(expectedSchema);
                done();
            });
        });
    });
});
