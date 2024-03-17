/* eslint-disable max-lines-per-function */
import { ExecutorContext, ProjectConfiguration } from '@nx/devkit';

import * as fileToRunHelpers from '../../helpers/file-to-run';
import * as helpers from '../../helpers/tool-runner';
import bubbleProf from './executor';
import { BubbleprofExecutorSchema } from './schema';

jest.mock('../../helpers/tool-runner');
jest.mock('../../helpers/file-to-run');

describe('Bubbleprof Executor', () => {
  let options: BubbleprofExecutorSchema;
  let context: ExecutorContext;
  let runToolSpy: jest.SpyInstance;
  let getFileToRunSpy: jest.SpyInstance;
  let fileToRunCorrectPathSpy: jest.SpyInstance;

  beforeEach(() => {
    const testProject = {
      root: '/apps/testProject',
      tags: [],
      projectType: 'application',
      name: 'testProject',
      targets: {
        build: {
          executor: '@nx/js:tsc',
          options: {
            outputPath: 'dist/apps/testProject',
            output: 'main.js',
            main: 'apps/testProject/main.ts',
            tsConfig: './tsconfig.lib.json',
          },
        },
      },
    } satisfies ProjectConfiguration;

    options = {
      buildTarget: 'build',
    };
    context = {
      projectName: 'testProject',
      projectsConfigurations: {
        version: 2,
        projects: {
          testProject,
        },
      },
      projectGraph: {
        nodes: {
          testProject: {
            data: testProject,
            type: 'app',
            name: 'testProject',
          },
        },
        dependencies: {},
      },
      nxJsonConfiguration: {
        cli: {
          packageManager: 'npm',
        },
        implicitDependencies: {
          testProject: ['testProject'],
        },
      },
      configurationName: 'testConfiguration',
      root: './',
      cwd: process.cwd(),
      isVerbose: false,
    } satisfies ExecutorContext;

    runToolSpy = jest.spyOn(helpers, 'runTool');
    getFileToRunSpy = jest.spyOn(fileToRunHelpers, 'getFileToRun');
    fileToRunCorrectPathSpy = jest.spyOn(
      fileToRunHelpers,
      'fileToRunCorrectPath'
    );
  });

  it('should throw an error if no project name is provided', async () => {
    context.projectName = undefined;

    await expect(bubbleProf(options, context)).rejects.toThrow(
      'No project name'
    );
  });

  it('should throw an error if no build target is found for the project', async () => {
    if (context.projectGraph?.nodes.testProject.data.targets?.build) {
      delete context.projectGraph.nodes.testProject.data.targets.build;
    }

    await expect(bubbleProf(options, context)).rejects.toThrow(
      `Cannot find build target ${options.buildTarget} for project ${context.projectName}`
    );
  });

  it('should call runTool with the correct arguments', async () => {
    const expectedFileToRun = 'dist/apps/testProject/main.js';
    getFileToRunSpy.mockReturnValue('fileToRun');
    fileToRunCorrectPathSpy.mockReturnValue(expectedFileToRun);

    const result = await bubbleProf(options, context);
    expect(result).toEqual({ success: true });

    expect(runToolSpy).toHaveBeenCalledWith(
      'bubbleprof',
      expect.anything(),
      expect.any(String),
      {
        open: true,
        ...options,
        command: ['node', expectedFileToRun],
      },
      { color: 'cyan' }
    );
  });
});
