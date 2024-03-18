// inspired by https://github.com/nrwl/nx/blob/master/packages/eslint/src/plugins/plugin.ts
import {
  CreateDependencies,
  CreateNodes,
  CreateNodesContext,
  joinPathFragments,
  NxJsonConfiguration,
  readJsonFile,
  TargetConfiguration,
  writeJsonFile,
} from '@nx/devkit';
import { calculateHashForCreateNodes } from '@nx/devkit/src/utils/calculate-hash-for-create-nodes';
import { getNamedInputs } from '@nx/devkit/src/utils/get-named-inputs';
import { minimatch } from 'minimatch';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getGlobPatternsFromPackageManagerWorkspaces } from 'nx/src/plugins/package-json-workspaces';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import { combineGlobPatterns } from 'nx/src/utils/globs';

type BaseClinicOptions = {
  collectOnly?: boolean;
  vizualizeOnly?: string;
  dest?: string;
  debug?: boolean;
  name?: string;
};
/**
 * clinic config should be in the root of the project and contain a key for each tool
 * with the options for that tool
 * @example
 * {
 *  "bubbleprof": {
 *    "collectOnly": true,
 *    "debug": true
 *  },
 *  "flame": {
 *    "debug": true
 *  }
 * }
 */
export interface ClinicConfig {
  doctor: BaseClinicOptions;
  flame: BaseClinicOptions;
  bubbleprof: BaseClinicOptions;
  heap: BaseClinicOptions;
}

export interface ClinicJsPluginOptions {
  buildTarget: string;
  doctorTargetName: string;
  flameTargetName: string;
  bubbleprofTargetName: string;
  heapTargetName: string;
}

const cachePath = join(projectGraphCacheDirectory, 'clinic.hash');
const targetsCache = existsSync(cachePath) ? readTargetsCache() : {};

const calculatedTargets: Record<
  string,
  Record<string, TargetConfiguration>
> = {};

function readTargetsCache(): Record<
  string,
  Record<string, TargetConfiguration>
> {
  return readJsonFile(cachePath);
}

function writeTargetsToCache(
  targets: Record<string, Record<string, TargetConfiguration>>
) {
  writeJsonFile(cachePath, targets);
}

export const createDependencies: CreateDependencies = () => {
  writeTargetsToCache(calculatedTargets);
  return [];
};

export const createNodes: CreateNodes<Partial<ClinicJsPluginOptions>> = [
  combineGlobPatterns(['**/clinic.json']),
  (configFilePath, options, context) => {
    const projectRoot = dirname(configFilePath);
    const packageManagerWorkspacesGlob = combineGlobPatterns(
      getGlobPatternsFromPackageManagerWorkspaces(context.workspaceRoot)
    );
    // Do not create a project if package.json and project.json isn't there.
    const siblingFiles = readdirSync(join(context.workspaceRoot, projectRoot));
    if (
      !siblingFiles.includes('package.json') &&
      !siblingFiles.includes('project.json')
    ) {
      return {};
    } else if (
      !siblingFiles.includes('project.json') &&
      siblingFiles.includes('package.json')
    ) {
      const path = joinPathFragments(projectRoot, 'package.json');
      const isPackageJsonProject = minimatch(
        path,
        packageManagerWorkspacesGlob
      );
      if (!isPackageJsonProject) {
        return {};
      }
    }

    const opts = normalizeOptions(options ?? {});
    const hash = calculateHashForCreateNodes(projectRoot, opts, context);
    const targets =
      targetsCache[hash] ??
      buildClinicJsTargets(configFilePath, projectRoot, opts, context);

    calculatedTargets[hash] = targets;

    return {
      projects: {
        [projectRoot]: {
          root: projectRoot,
          targets,
        },
      },
    };
  },
];

function getInputs(
  namedInputs: NxJsonConfiguration['namedInputs']
): TargetConfiguration['inputs'] {
  return [
    ...(namedInputs && 'production' in namedInputs
      ? ['default', '^production']
      : ['default', '^default']),
    { externalDependencies: ['@clinic/bubbleprof'] },
  ];
}

function getBaseTargetConfiguration(
  projectRoot: string,
  pluginOptions: ClinicJsPluginOptions,
  context: CreateNodesContext
): TargetConfiguration {
  const namedInputs = getNamedInputs(projectRoot, context);
  return {
    options: {
      buildTarget: pluginOptions.buildTarget,
    },
    cache: true,
    dependsOn: [`^${pluginOptions.buildTarget}`],
    inputs: getInputs(namedInputs),
  };
}

function getBubbleprofTargetConfiguration(
  projectRoot: string,
  options: ClinicJsPluginOptions,
  clinicConfig: ClinicConfig,
  context: CreateNodesContext
): TargetConfiguration {
  const baseConfig = getBaseTargetConfiguration(projectRoot, options, context);
  const isRootProject = projectRoot === '.';
  const defaultDest = isRootProject ? '.clinic/.' : `.clinic/${projectRoot}/.`;
  const outputs = [
    '{options.dest}/{options.name}.clinic-bubbleprof',
    '{options.dest}/{options.name}.clinic-bubbleprof.html',
  ];
  return {
    ...baseConfig,
    executor: '@getlarge/nx-clinicjs:bubbleprof',
    outputs,
    options: {
      dest: defaultDest,
      name: options.bubbleprofTargetName,
      ...baseConfig.options,
      ...(clinicConfig.bubbleprof ?? {}),
    },
  };
}

function buildClinicJsTargets(
  configFilePath: string,
  projectRoot: string,
  options: ClinicJsPluginOptions,
  context: CreateNodesContext
) {
  const absoluteConfigFilePath = joinPathFragments(
    context.workspaceRoot,
    configFilePath
  );
  const clinicConfig = readJsonFile(absoluteConfigFilePath) as ClinicConfig;
  const targets: Record<string, TargetConfiguration> = {};
  targets[options.bubbleprofTargetName] = getBubbleprofTargetConfiguration(
    projectRoot,
    options,
    clinicConfig,
    context
  );
  return targets;
}

function normalizeOptions(
  options: Partial<ClinicJsPluginOptions>
): ClinicJsPluginOptions {
  return {
    doctorTargetName: options.doctorTargetName ?? 'doctor',
    flameTargetName: options.flameTargetName ?? 'flame',
    bubbleprofTargetName: options.bubbleprofTargetName ?? 'bubbleprof',
    heapTargetName: options.heapTargetName ?? 'heap',
    buildTarget: options.buildTarget ?? 'build',
  };
}
