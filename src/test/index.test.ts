import { expect } from 'code';
import * as Lab from 'lab';
export const lab = Lab.script();

const describe = lab.describe;
const it = lab.it;
const before = lab.before;

import * as fs from 'fs';
import * as glob from 'glob';
import * as graphql from 'graphql';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import { mergeGQLSchemas } from '../cli';
import * as validator from '../index';

describe('GraphQL Validator', () => {
  let schema: graphql.GraphQLSchema;
  before(() =>
    mergeGQLSchemas('./fixtures/schema/**/*.graphql').then((r) => (schema = r)),
  );

  describe('when validating a valid query', () => {
    let results;
    before((done) => {
      const query = graphql.parse(`{allPeople{name}}`);
      results = validator.validateQuery(schema, query);
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
      results = validator.validateQuery(schema, query);
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
        validator.loadQueryFiles(gqlGlob).then((r) => {
          results = r;
          validator.loadQueryFiles(gqlGlob, (err, cbr) => {
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
        validator.loadQueryFiles(gqlGlob).then((r) => {
          results = r;
          validator.loadQueryFiles(gqlGlob, (err, cbr) => {
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
          validator.loadQueryFiles(gqlGlob).catch((r) => {
            results = r;
            validator.loadQueryFiles(gqlGlob, (cbr) => {
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
              validator.loadQueryFiles(gqlGlob).catch((r) => {
                results = r;
                validator.loadQueryFiles(gqlGlob, (cbr) => {
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
        glob('./fixtures/queries/*.graphql', (_, files) => {
          fileNames = files;
          validator.loadQueryFiles(files).then((r) => {
            results = r;
            validator.loadQueryFiles(files, (err, cbr) => {
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
        return validator
          .loadQueryFiles('./fixtures/queries/*.graphql')
          .then((queries) => {
            results = validator.validateQueries(queries, schema);
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
        return validator
          .loadQueryFiles('./fixtures/queries/**/*.graphql')
          .then((queries) => {
            results = validator.validateQueries(queries, schema);
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
        validator.validateQueryFiles(gqlGlob, schema).then((r) => {
          results = r;
          validator.validateQueryFiles(gqlGlob, schema, [], (err, cbr) => {
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
        validator.validateQueryFiles(gqlGlob, schema).catch((r) => {
          results = r;
          validator.validateQueryFiles(gqlGlob, schema, [], (err, cbr) => {
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
              validator.validateQueryFiles(gqlGlob, schema).catch((r) => {
                results = r;
                validator.validateQueryFiles(gqlGlob, schema, [], (cbr) => {
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
