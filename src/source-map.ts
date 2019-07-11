import { encode } from 'sourcemap-codec';
import { DecodedSourceMap, RawSourceMap } from './types';

export default class SourceMap implements RawSourceMap {
  file?: string;
  mappings: string;
  sourceRoot?: string;
  names: string[];
  sources: string[];
  sourcesContent?: (string | null)[];
  version: 3;

  constructor(map: DecodedSourceMap, excludeContent: boolean) {
    if ('file' in map) this.file = map.file;
    this.mappings = encode(map.mappings);
    this.names = map.names;
    if ('sourceRoot' in map) this.sourceRoot = map.sourceRoot;
    this.sources = map.sources;
    if (!excludeContent && 'sourcesContent' in map) this.sourcesContent = map.sourcesContent;
    this.version = 3;
  }

  toString(): string {
    return JSON.stringify(this);
  }
}