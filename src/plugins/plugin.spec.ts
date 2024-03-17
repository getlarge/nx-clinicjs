import { CreateNodesContext } from '@nx/devkit';
import { tmpProjPath } from '@nx/plugin/testing';

import { createNodes } from './plugin';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(() => false),
  readdirSync: jest.fn(() => ['project.json']),
}));

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  readJsonFile: jest.fn(() => ({})),
  writeJsonFile: jest.fn(),
}));

// eslint-disable-next-line max-lines-per-function
describe('@getlarge/clinicjs', () => {
  const createNodesFunction = createNodes[1];
  const testProjectName = 'proj';
  let context: CreateNodesContext;

  beforeEach(() => {
    context = {
      nxJsonConfiguration: {
        namedInputs: {
          default: ['{projectRoot}/**/*'],
          production: ['!{projectRoot}/**/*.spec.ts'],
        },
      },
      workspaceRoot: tmpProjPath(),
    };
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should create nodes based on clinic.json', async () => {
    const nodes = await createNodesFunction(
      `${testProjectName}/clinic.json`,
      {
        bubbleprofTargetName: 'bubbleprof',
        buildTarget: 'build',
      },
      context
    );
    expect(nodes.projects?.[testProjectName]).toEqual({
      root: testProjectName,
      targets: {
        bubbleprof: {
          cache: true,
          dependsOn: ['^build'],
          executor: '@getlarge/nx-clinicjs:bubbleprof',
          inputs: [
            'default',
            '^production',
            {
              externalDependencies: ['@clinic/*'],
            },
          ],
          options: {
            buildTarget: 'build',
            dest: '.clinic/proj/.',
            name: 'bubbleprof',
          },
          outputs: ['{options.dest}'],
        },
      },
    });
  });
});
