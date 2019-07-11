import { readFileSync } from 'fs';
import { RawSourceMap, SourceMapConsumer } from 'source-map';
import resorcery from '../../../src/resorcery';

function read(filename: string): string {
  return readFileSync(`${__dirname}/files/${filename}`, 'utf8');
}

describe('transpile then minify', () => {
  test('minify a transpiled source map', () => {
    const map = read('helloworld.min.js.map');
    const remapped = resorcery(map, file => {
      return file.endsWith('.mjs') ? null : read(`${file}.map`);
    });

    const consumer = new SourceMapConsumer((remapped as unknown) as RawSourceMap);
    const alert = consumer.originalPositionFor({
      column: 61,
      line: 1,
    });
    expect(alert).toEqual({
      column: 20,
      line: 3,
      name: 'alert',
      source: 'helloworld.mjs',
    });
  });

  test('inherits sourcesContent of original source', () => {
    const map = read('helloworld.min.js.map');
    const remapped = resorcery(map, file => {
      return file.endsWith('.mjs') ? null : read(`${file}.map`);
    });

    expect(remapped.sourcesContent).toEqual([read('helloworld.mjs')]);
  });
});