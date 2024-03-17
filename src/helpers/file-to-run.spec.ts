import { ExecutorContext, ProjectGraphProjectNode } from '@nx/devkit';
import * as path from 'node:path';
import { fileExists } from 'nx/src/utils/fileutils';

import {
  fileToRunCorrectPath,
  getFileToRun,
  getRelativeDirectoryToProjectRoot,
} from './file-to-run';

jest.mock('nx/src/utils/fileutils', () => ({
  fileExists: jest.fn(),
}));

jest.mock('@nx/devkit', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('getFileToRun', () => {
  it('should return the correct file to run', async () => {
    const context: ExecutorContext = {
      root: '/root',
      projectName: 'projectName',
      targetName: 'targetName',
      configurationName: 'configurationName',
      target: {},
      workspace: {
        version: 2,
        projects: {},
      },
      cwd: '/cwd',
      isVerbose: false,
    };
    const project: ProjectGraphProjectNode = {
      name: 'projectName',
      type: 'app',
      data: {
        root: '/root',
        sourceRoot: '/sourceRoot',
        projectType: 'application',
        targets: {},
      },
    };
    const buildOptions = {
      outputPath: '/outputPath',
      outputFileName: 'outputFileName.js',
    };
    const result = getFileToRun(context, project, buildOptions);
    expect(result).toBe(
      path.join(
        context.root,
        buildOptions.outputPath,
        buildOptions.outputFileName
      )
    );
  });
});

describe('fileToRunCorrectPath', () => {
  it('should return the correct path if file exists', () => {
    (fileExists as jest.Mock).mockReturnValue(true);
    const fileToRun = 'fileToRun.js';
    expect(fileToRunCorrectPath(fileToRun)).toBe(fileToRun);
  });

  it('should throw an error if file does not exist', () => {
    (fileExists as jest.Mock).mockReturnValue(false);
    const fileToRun = 'fileToRun.js';
    expect(() => fileToRunCorrectPath(fileToRun)).toThrow(
      `Could not find ${fileToRun}. Make sure your build succeeded.`
    );
  });
});

describe('getRelativeDirectoryToProjectRoot', () => {
  it('should return the correct relative directory', () => {
    const file = '/root/dir/file.js';
    const projectRoot = '/root';
    expect(getRelativeDirectoryToProjectRoot(file, projectRoot)).toBe('./dir/');
  });
});
