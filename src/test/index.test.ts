import { expect } from 'code';
import * as Lab from 'lab';
export const lab = Lab.script();

const describe = lab.describe;
const it = lab.it;
const before = lab.before;

import * as fs from 'fs';
import * as globUtil from 'glob';
import * as graphql from 'graphql';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import { mergeGQLSchemas } from '../cli';
import * as schemaUtilities from '../index';

describe('GraphQL Validator', () => {

  describe('#mergeGQLSchemas', () => {
    describe('when loading a schema glob', () => {
      const glob = './fixtures/schema/**/*.graphql';
      let schema;
      before((done) => {
        schemaUtilities.mergeGQLSchemas(glob).then((s) => {
          schema = s;
          done();
        });
      });

      it('expect schema to be a graphql schema', (done) => {
        expect(schema).to.exist();
        expect(schema).to.be.an.instanceof(graphql.GraphQLSchema);
        done();
      });
    });

    describe(`When merging schema files with duplicate types.`, () => {
      const glob = './fixtures/invalidSchemas/**/*.graphql';
      let err;
      before((done) => {
        schemaUtilities.mergeGQLSchemas(glob).catch((e) => {
          err = e;
          done();
        },
        );
      });

      it('schema wont merge when having duplicate types', (done) => {
        expect(err).to.exist();
        done();
      });
    });
  });

  describe(`when loading an invalid glob`, () => {
    const glob = './fixtures/not/an/existing/path';
    let errs;
    schemaUtilities.mergeGQLSchemas(glob).catch((e) => {
        errs = e;
      });

    it('expect error to exist', (done) => {
      expect(errs).to.exist();
      done();
    });
  });

  describe('#validateQueries', () => {
    let schema: graphql.GraphQLSchema;
    before(() => schemaUtilities.mergeGQLSchemas('./fixtures/schema/**/*.graphql').then((r) => schema = r));

    describe('when validating a query glob', () => {
      let results;
      const glob = './fixtures/queries/*.graphql';
      before((done) => {
        schemaUtilities.validateOperations(glob, schema).then((r) => {
          results = r;
          done();
        });
      });

      it('expect results to be empty', (done) => {
        expect(results).to.be.undefined();
        done();
      });
    });

    describe('when validating a query glob with invalid queries', () => {
      let errs;
      const glob = './fixtures/queries/**/*.graphql';
      before((done) => {
        schemaUtilities.validateOperations(glob, schema).catch((e) => {
          errs = e;
          done();
        });
      });

      it('expect validation results to exist', (done) => {
        expect(errs).to.be.an.array();
        expect(errs.length).to.equal(1);
        done();
      });
    });

    describe('when validating a glob with unreadable files', () => {
      const root = './fixtures/queries/unreadable';
      const glob = `${root}/*.graphql`;
      let errs;
      before((done) => {
        mkdirp(root, () => {
          fs.writeFile(`${root}/operation.graphql`, 'hello', { mode: '333' }, (err) => {
            schemaUtilities.validateOperations(glob, schema).catch((e) => {
              errs = e;
              rimraf(root, done);
            });
          });
        });
      });

      it('expect error to exist', (done) => {
        expect(errs).to.exist();
        expect(errs.length).to.equal(1);
        done();
      });
    });
  });

  let graphqlSchema: graphql.GraphQLSchema;
  before(() =>
    mergeGQLSchemas('./fixtures/schema/**/*.graphql').then((r) => (graphqlSchema = r)),
  );

  describe('when validating a valid query', () => {
    let results;
    before((done) => {
      const query = graphql.parse(`{allPeople{name}}`);
      results = schemaUtilities.validateQuery(graphqlSchema, query);
      done();
    });

    it('expect results to be an empty array', (done) => {
      expect(results).to.exist();
      expect(results.length).to.equal(0);
      done();
    });
  });

  describe('when validating a invalid query', () => {
    let results;
    before((done) => {
      const query = graphql.parse(`{allPeople{anInvalidFieldName}}`);
      results = schemaUtilities.validateQuery(graphqlSchema, query);
      done();
    });

    it('expect errors to exist', (done) => {
      expect(results.length).to.equal(1);
      expect(results[0].message).to.contain('anInvalidFieldName');
      done();
    });
  });

  describe('#loadQueryFiles', () => {
    describe('when loading a query glob', () => {
      const gqlGlob = './fixtures/queries/{allFilms,allPeople}.graphql';
      let results;
      let cbResults;
      before((done) => {
        schemaUtilities.loadQueryFiles(gqlGlob).then((r) => {
          results = r;
          schemaUtilities.loadQueryFiles(gqlGlob, (err, cbr) => {
            cbResults = cbr;
            done();
          });
        });
      });

      it('expect results to be two', (done) => {
        expect(results.length).to.equal(2);
        done();
      });
      it('expect callback results to be two', (done) => {
        expect(cbResults.length).to.equal(2);
        done();
      });
    });

    describe('when passing an invalid glob', () => {
      const gqlGlob = './fixtures/queries/{allFilms,allPeople}.test';
      let results;
      let cbResults;
      before((done) => {
        schemaUtilities.loadQueryFiles(gqlGlob).then((r) => {
          results = r;
          schemaUtilities.loadQueryFiles(gqlGlob, (err, cbr) => {
            cbResults = cbr;
            done();
          });
        });
      });

      it('expect results to empty', (done) => {
        expect(results.length).to.exist();
        done();
      });
      it('expect callback results to empty', (done) => {
        expect(cbResults.length).to.exist();
        done();
      });
    });

    describe('when accessing inaccessable path in glob', () => {
      const root = './fixtures/test';
      const gqlGlob = `${root}/*.graphql`;
      let results;
      let cbResults;
      before((done) => {
        mkdirp(root, '333', () => {
          schemaUtilities.loadQueryFiles(gqlGlob).catch((r) => {
            results = r;
            schemaUtilities.loadQueryFiles(gqlGlob, (cbr) => {
              cbResults = cbr;
              rimraf(root, done);
            });
          });
        });
      });

      it('expect error to exist', (done) => {
        expect(results).to.exist();
        done();
      });
      it('expect callback error to exist', (done) => {
        expect(cbResults).to.exist();
        done();
      });
    });

    describe('when accessing unreadable file in glob', () => {
      const root = './fixtures/queries/unreadable';
      const gqlGlob = `${root}/*.graphql`;
      let results;
      let cbResults;
      before((done) => {
        mkdirp(root, () => {
          fs.writeFile(
            `${root}/operation.graphql`,
            'hello',
            { mode: 333 },
            (err) => {
              schemaUtilities.loadQueryFiles(gqlGlob).catch((r) => {
                results = r;
                schemaUtilities.loadQueryFiles(gqlGlob, (cbr) => {
                  cbResults = cbr;
                  rimraf(root, done);
                });
              });
            },
          );
        });
      });

      it('expect error to exist', (done) => {
        expect(results).to.exist();
        done();
      });
      it('expect callback error to exist', (done) => {
        expect(cbResults).to.exist();
        done();
      });
    });

    describe('when loading a query file array', () => {
      let results;
      let fileNames;
      let cbResults;
      before((done) => {
        globUtil('./fixtures/queries/*.graphql', (_, files) => {
          fileNames = files;
          schemaUtilities.loadQueryFiles(files).then((r) => {
            results = r;
            schemaUtilities.loadQueryFiles(files, (err, cbr) => {
              cbResults = cbr;
              done();
            });
          });
        });
      });

      it('should load one query per file', (done) => {
        expect(results.length).to.equal(fileNames.length);
        done();
      });
      it('should load one query per file by callback', (done) => {
        expect(cbResults.length).to.equal(fileNames.length);
        done();
      });
    });
  });

  describe('#validateQueryFiles', () => {
    describe('when validating a query array', () => {
      let results;
      before(() => {
        return schemaUtilities
          .loadQueryFiles('./fixtures/queries/*.graphql')
          .then((queries) => {
            results = schemaUtilities.validateQueries(queries, graphqlSchema);
          });
      });

      it('expect results to be emtpy', (done) => {
        expect(results.length).to.equal(0);
        done();
      });
    });

    describe('when validating a query array with invalid queries', () => {
      let results;
      before(() => {
        return schemaUtilities
          .loadQueryFiles('./fixtures/queries/**/*.graphql')
          .then((queries) => {
            results = schemaUtilities.validateQueries(queries, graphqlSchema);
          });
      });

      it('expect results to be equal 1', (done) => {
        expect(results.length).to.equal(1);
        done();
      });
    });

    describe('when validating a query glob', () => {
      const gqlGlob = './fixtures/queries/*.graphql';
      let results;
      let cbResults;
      before((done) => {
        schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema).then((r) => {
          results = r;
          schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema, [], (err, cbr) => {
            cbResults = cbr;
            done();
          });
        });
      });

      it('expect results to be empty', (done) => {
        expect(results)
          .to.be.instanceOf(Array)
          .and.to.have.length(2)
          .and.to.contain('./fixtures/queries/allFilms.graphql')
          .and.to.contain('./fixtures/queries/allPeople.graphql');
        done();
      });
      it('expect callback results to be empty', (done) => {
        expect(cbResults)
          .to.be.instanceOf(Array)
          .and.to.have.length(2)
          .and.to.contain('./fixtures/queries/allFilms.graphql')
          .and.to.contain('./fixtures/queries/allPeople.graphql');
        done();
      });
    });

    describe('when validating a query glob with invalid queries', () => {
      const gqlGlob = './fixtures/queries/**/*.graphql';
      let results;
      let cbResults;
      before((done) => {
        schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema).catch((r) => {
          results = r;
          schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema, [], (err, cbr) => {
            cbResults = cbr;
            done();
          });
        });
      });

      it('expect validation results to exist', (done) => {
        expect(results).to.be.an.array();
        expect(results.length).to.equal(1);
        done();
      });
    });

    describe('when validating a glob with unreadable files', () => {
      const root = './fixtures/queries/unreadable';
      const gqlGlob = `${root}/*.graphql`;
      let results;
      let cbResults;
      before((done) => {
        mkdirp(root, () => {
          fs.writeFile(
            `${root}/operation.graphql`,
            'hello',
            { mode: '333' },
            (err) => {
              schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema).catch((r) => {
                results = r;
                schemaUtilities.validateQueryFiles(gqlGlob, graphqlSchema, [], (cbr) => {
                  cbResults = cbr;
                  rimraf(root, done);
                });
              });
            },
          );
        });
      });

      it('expect error to exist', (done) => {
        expect(results).to.exist();
        done();
      });
      it('expect callback error to exist', (done) => {
        expect(cbResults).to.exist();
        done();
      });
    });
  });
});
