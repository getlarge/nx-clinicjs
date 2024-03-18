import ClinicHeapProfiler from '@clinic/heap-profiler';
import { ExecutorContext } from '@nx/devkit';

import {
  fileToRunCorrectPath,
  retrieveFileToRunFromContext,
} from '../../helpers/file-to-run';
import { runTool } from '../../helpers/tool-runner';
import { HeapProfilerExecutorSchema } from './schema';

export default async function heapProfiler(
  options: HeapProfilerExecutorSchema,
  context: ExecutorContext
) {
  process.env.NODE_ENV ??= context?.configurationName ?? 'development';

  const fileToRun = retrieveFileToRunFromContext(context, options);

  await runTool(
    'flame',
    ClinicHeapProfiler,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@clinic/heap-profiler/package.json').version,
    {
      open: true,
      ...options,
      command: ['node', fileToRunCorrectPath(fileToRun)],
    },
    { color: 'yellow' }
  );
  return {
    success: true,
  };
}
