import ClinicDoctor from '@clinic/doctor';
import { ExecutorContext } from '@nx/devkit';

import {
  fileToRunCorrectPath,
  retrieveFileToRunFromContext,
} from '../../helpers/file-to-run';
import { runTool } from '../../helpers/tool-runner';
import { DoctorExecutorSchema } from './schema';

/**
 * @description Run the JS built file with Clinic Bubbleprof
 * Reuse functionalities from @nx/js:node executor
 * @see https://github.com/nrwl/nx/blob/master/packages/js/src/executors/node/node.impl.ts#L387
 */
export default async function doctor(
  options: DoctorExecutorSchema,
  context: ExecutorContext
) {
  process.env.NODE_ENV ??= context?.configurationName ?? 'development';

  const fileToRun = retrieveFileToRunFromContext(context, options);

  await runTool(
    'doctor',
    ClinicDoctor,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@clinic/doctor/package.json').version,
    {
      open: true,
      ...options,
      command: ['node', fileToRunCorrectPath(fileToRun)],
    },
    { color: 'green' }
  );
  return {
    success: true,
  };
}
