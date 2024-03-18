import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { ProjectConfiguration, readJsonFile } from '@nx/devkit';

describe('nx-clinicjs', () => {
  let projectDirectory: string;
  let testApp: string;

  beforeAll(() => {
    const projectConfig = createTestProject();
    testApp = projectConfig.testApp;
    projectDirectory = projectConfig.projectDirectory;

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugin built with the latest source code into the test repo
    execSync(`npm install @getlarge/nx-clinicjs@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    addPlugin(projectDirectory);
  });

  afterAll(() => {
    // Cleanup the test project
    projectDirectory &&
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync('npm ls @getlarge/nx-clinicjs', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  it('should include the bubbleprof target in the project graph', () => {
    const result = execSync(`npx nx show project ${testApp} --json`, {
      cwd: projectDirectory,
      env: process.env,
      encoding: 'utf-8',
    });
    const project: ProjectConfiguration = JSON.parse(result);
    expect(Object.keys(project.targets)).toContain('bubbleprof');
    expect(project.targets.bubbleprof.executor).toBe(
      '@getlarge/nx-clinicjs:bubbleprof'
    );
  });

  it.todo('should be able to run bubbleprof task');
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);
  const testApp = 'test-app';

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(
    `npx --yes create-nx-workspace@latest ${projectName} --preset apps --nxCloud=skip --no-interactive`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${projectDirectory}"`);

  // create app
  execSync(
    `npx nx g @nx/node:application ${testApp} --directory apps --as-provided --no-interactive`,
    {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    }
  );
  // add empty clinicjs config
  writeFileSync(
    join(projectDirectory, 'apps', testApp, 'clinic.json'),
    JSON.stringify({})
  );

  return { projectDirectory, testApp };
}

function addPlugin(projectDirectory: string) {
  // add the plugin to the nx.json file
  const nxJsonPath = join(projectDirectory, 'nx.json');
  const nxJson = readJsonFile(nxJsonPath);
  nxJson.plugins = nxJson.plugins || [];
  nxJson.plugins.push({
    plugin: '@getlarge/nx-clinicjs',
    options: {
      buildTarget: 'build',
      doctorTargetName: 'doctor',
      flameTargetName: 'flame',
      bubbleprofTargetName: 'bubbleprof',
      heapTargetName: 'heap',
    },
  });
  writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2));
}
