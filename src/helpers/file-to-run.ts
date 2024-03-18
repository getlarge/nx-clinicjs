import {
  ExecutorContext,
  logger,
  parseTargetString,
  ProjectGraphProjectNode,
  readTargetOptions,
} from '@nx/devkit';
import * as path from 'node:path';
import { fileExists } from 'nx/src/utils/fileutils';
import { normalizePath } from 'nx/src/utils/path';

import { BaseExecutorSchema } from '../types/schema';

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

export function retrieveFileToRunFromContext(
  context: ExecutorContext,
  options: BaseExecutorSchema
): string {
  if (!context.projectName) {
    throw new Error('Project name is not set in context');
  }
  const projectNode = context.projectGraph?.nodes[context.projectName];
  const buildTarget = parseTargetString(options.buildTarget, context);
  if (!projectNode?.data.targets?.[buildTarget.target]) {
    throw new Error(
      `Cannot find build target ${options.buildTarget} for project ${context.projectName}`
    );
  }
  const buildOptions: Record<string, unknown> = readTargetOptions(
    buildTarget,
    context
  );
  const buildTargetExecutor =
    projectNode.data.targets[buildTarget.target]?.executor;

  return getFileToRun(context, projectNode, buildOptions, buildTargetExecutor);
}
