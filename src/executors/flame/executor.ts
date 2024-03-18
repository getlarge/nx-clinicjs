import ClinicFlame from '@clinic/flame';
import { ExecutorContext } from '@nx/devkit';

import {
  fileToRunCorrectPath,
  retrieveFileToRunFromContext,
} from '../../helpers/file-to-run';
import { runTool } from '../../helpers/tool-runner';
import { FlameExecutorSchema } from './schema';

export default async function flame(
  options: FlameExecutorSchema,
  context: ExecutorContext
) {
  process.env.NODE_ENV ??= context?.configurationName ?? 'development';

  const fileToRun = retrieveFileToRunFromContext(context, options);

  await runTool(
    'flame',
    ClinicFlame,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@clinic/flame/package.json').version,
    {
      open: true,
      ...options,
      command: ['node', fileToRunCorrectPath(fileToRun)],
    },
    { color: 'red' }
  );
  return {
    success: true,
  };
}
