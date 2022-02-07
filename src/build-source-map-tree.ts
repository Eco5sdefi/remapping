import { TraceMap } from '@jridgewell/trace-mapping';

import OriginalSource from './original-source';
import { SourceMapTree } from './source-map-tree';

import type { SourceMapInput, SourceMapLoader, LoaderContext } from './types';

function asArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Recursively builds a tree structure out of sourcemap files, with each node
 * being either an `OriginalSource` "leaf" or a `SourceMapTree` composed of
 * `OriginalSource`s and `SourceMapTree`s.
 *
 * Every sourcemap is composed of a collection of source files and mappings
 * into locations of those source files. When we generate a `SourceMapTree` for
 * the sourcemap, we attempt to load each source file's own sourcemap. If it
 * does not have an associated sourcemap, it is considered an original,
 * unmodified source file.
 */
export default function buildSourceMapTree(
  input: SourceMapInput | SourceMapInput[],
  loader: SourceMapLoader
): SourceMapTree {
  const maps = asArray(input).map((m) => new TraceMap(m, ''));
  const map = maps.pop()!;

  for (let i = 0; i < maps.length; i++) {
    if (maps[i].sources.length > 1) {
      throw new Error(
        `Transformation map ${i} must have exactly one source file.\n` +
          'Did you specify these with the most recent transformation maps first?'
      );
    }
  }

  let tree = build(map, '', loader);
  for (let i = maps.length - 1; i >= 0; i--) {
    tree = new SourceMapTree(maps[i], [tree]);
  }
  return tree;
}

function build(map: TraceMap, importer: string, loader: SourceMapLoader): SourceMapTree {
  const { resolvedSources, sourcesContent } = map;

  const children = resolvedSources.map(
    (sourceFile: string | null, i: number): SourceMapTree | OriginalSource => {
      // The loading context gives the loader more information about why this file is being loaded
      // (eg, from which importer). It also allows the loader to override the location of the loaded
      // sourcemap/original source, or to override the content in the sourcesContent field if it's
      // an unmodified source file.
      const ctx: LoaderContext = {
        importer,
        source: sourceFile || '',
        content: undefined,
      };

      // Use the provided loader callback to retrieve the file's sourcemap.
      // TODO: We should eventually support async loading of sourcemap files.
      const sourceMap = loader(ctx.source, ctx);

      const { source, content } = ctx;

      // If there is no sourcemap, then it is an unmodified source file.
      if (!sourceMap) {
        // The contents of this unmodified source file can be overridden via the loader context,
        // allowing it to be explicitly null or a string. If it remains undefined, we fall back to
        // the importing sourcemap's `sourcesContent` field.
        const sourceContent =
          content !== undefined ? content : sourcesContent ? sourcesContent[i] : null;
        return new OriginalSource(source, sourceContent);
      }

      // Else, it's a real sourcemap, and we need to recurse into it to load its
      // source files.
      return build(new TraceMap(sourceMap, source), source, loader);
    }
  );

  return new SourceMapTree(map, children);
}
