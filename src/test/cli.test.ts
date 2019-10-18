import { expect } from 'code';
import * as Lab from 'lab';
export const lab = Lab.script();

const describe = lab.describe;
const it = lab.it;
const before = lab.before;

import * as fs from 'fs';
import * as graphql from 'graphql';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import * as cli from '../cli';

describe('GraphQL Validator CLI', () => {
  describe('#mergeGQLSchemas', () => {
    describe('when loading a schema glob', () => {
      const glob = './fixtures/schema/**/*.graphql';
      let schema;
      before((done) => {
        cli.mergeGQLSchemas(glob).then((s) => {
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
        cli.mergeGQLSchemas(glob).catch((e) => {
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
    cli.mergeGQLSchemas(glob).catch((e) => {
        errs = e;
      });

    it('expect error to exist', (done) => {
      expect(errs).to.exist();
      done();
    });
  });

  describe('#validateQueries', () => {
    let schema: graphql.GraphQLSchema;
    before(() => cli.mergeGQLSchemas('./fixtures/schema/**/*.graphql').then((r) => schema = r));

    describe('when validating a query glob', () => {
      let results;
      const glob = './fixtures/queries/*.graphql';
      before((done) => {
        cli.validateOperations(glob, schema).then((r) => {
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
        cli.validateOperations(glob, schema).catch((e) => {
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
            cli.validateOperations(glob, schema).catch((e) => {
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
});
