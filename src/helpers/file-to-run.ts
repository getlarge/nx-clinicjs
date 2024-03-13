import { ExecutorContext, logger, ProjectGraphProjectNode } from '@nx/devkit';
import * as path from 'node:path';
import { fileExists } from 'nx/src/utils/fileutils';
import { normalizePath } from 'nx/src/utils/path';

export function getFileToRun(
  context: ExecutorContext,
  project: ProjectGraphProjectNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildOptions: Record<string, any>,
  buildTargetExecutor?: string
): string {
  // If using run-commands or another custom executor, then user should set
  // outputFileName, but we can try the default value that we use.
  if (!buildOptions?.outputPath && !buildOptions?.outputFileName) {
    const fallbackFile = path.join('dist', project.data.root, 'main.js');
    logger.warn(
      `Build option ${'outputFileName'} not set for ${
        project.name
      }. Using fallback value of ${fallbackFile}.`
    );
    return path.join(context.root, fallbackFile);
  }

  let outputFileName = buildOptions.outputFileName;

  if (!outputFileName) {
    const fileName = `${path.parse(buildOptions.main).name}.js`;
    if (
      buildTargetExecutor === '@nx/js:tsc' ||
      buildTargetExecutor === '@nx/js:swc'
    ) {
      outputFileName = path.join(
        getRelativeDirectoryToProjectRoot(buildOptions.main, project.data.root),
        fileName
      );
    } else {
      outputFileName = fileName;
    }
  }

  return path.join(context.root, buildOptions.outputPath, outputFileName);
}

export function fileToRunCorrectPath(fileToRun: string): string {
  if (fileExists(fileToRun)) return fileToRun;

  const extensionsToTry = ['.cjs', '.mjs', 'cjs.js', '.esm.js'];

  for (const ext of extensionsToTry) {
    const file = fileToRun.replace(/\.js$/, ext);
    if (fileExists(file)) return file;
  }

  throw new Error(
    `Could not find ${fileToRun}. Make sure your build succeeded.`
  );
}

export function getRelativeDirectoryToProjectRoot(
  file: string,
  projectRoot: string
): string {
  const dir = path.dirname(file);
  const relativeDir = normalizePath(path.relative(projectRoot, dir));
  return relativeDir === '' ? `./` : `./${relativeDir}/`;
}
