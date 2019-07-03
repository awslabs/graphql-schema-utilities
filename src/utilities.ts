import * as fs from 'fs';
import * as globUtil from 'glob';

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
