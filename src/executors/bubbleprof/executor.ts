import ClinicBubbleprof from '@clinic/bubbleprof';
import {
  ExecutorContext,
  parseTargetString,
  readTargetOptions,
} from '@nx/devkit';

import { fileToRunCorrectPath, getFileToRun } from '../../helpers/file-to-run';
import { runTool } from '../../helpers/tool-runner';
import { BubbleprofExecutorSchema } from './schema';

/**
 * @description Run the JS built file with Clinic Bubbleprof
 * Reuse functionalities from @nx/js:node executor
 * @see https://github.com/nrwl/nx/blob/master/packages/js/src/executors/node/node.impl.ts#L387
 */
export default async function bubbleProf(
  options: BubbleprofExecutorSchema,
  context: ExecutorContext
) {
  process.env.NODE_ENV ??= context?.configurationName ?? 'development';
  if (!context.projectName) {
    throw new Error('No project name');
  }
  const project = context.projectGraph?.nodes[context.projectName];
  const buildTarget = parseTargetString(
    options.buildTarget ?? 'build',
    context
  );
  if (!project?.data.targets?.[buildTarget.target]) {
    throw new Error(
      `Cannot find build target ${options.buildTarget} for project ${context.projectName}`
    );
  }
  const buildOptions: Record<string, unknown> = readTargetOptions(
    buildTarget,
    context
  );
  const buildTargetExecutor =
    project.data.targets[buildTarget.target]?.executor;

  const fileToRun = getFileToRun(
    context,
    project,
    buildOptions,
    buildTargetExecutor
  );
  // TODO: check if build output exists

  await runTool(
    'bubbleprof',
    ClinicBubbleprof,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@clinic/bubbleprof/package.json').version,
    {
      open: true,
      ...options,
      command: ['node', fileToRunCorrectPath(fileToRun)],
    },
    { color: 'cyan' }
  );
  return {
    success: true,
  };
}
