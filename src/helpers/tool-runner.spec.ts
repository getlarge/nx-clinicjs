import { logger } from '@nx/devkit';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

import { Args, runTool, Tool, UiOptions } from './tool-runner';

jest.mock('@nx/devkit', () => ({
  logger: {
    log: jest.fn(),
  },
}));

jest.mock('node:fs', () => ({
  createReadStream: jest.fn().mockReturnValue(Readable.from('')),
}));

jest.mock('node:fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

const collectMock = jest.fn(
  (
    command: string[],
    callback: (err: Error | null, filepath: string) => void
  ) => {
    callback(null, 'filename');
  }
);

const visualizeMock = jest.fn(
  (filename: string, output: string, callback: (err: Error | null) => void) => {
    callback(null);
  }
);

class MockTool extends EventEmitter {
  constructor() {
    super();
  }

  collect = collectMock;

  visualize = visualizeMock;
}

describe('runTool', () => {
  it('should run the tool correctly', async () => {
    const toolName = 'MockTool';
    const Tool: Tool = MockTool;
    const version = '1.0.0';
    const args: Args = {
      command: ['command1', 'command2'],
    };
    const uiOptions: UiOptions = {};

    await runTool(toolName, Tool, version, args, uiOptions);

    expect(logger.log).toHaveBeenCalled();
    expect(collectMock).toHaveBeenCalledWith(
      args.command,
      expect.any(Function)
    );
    expect(visualizeMock).toHaveBeenCalledWith(
      'filename',
      'filename.html',
      expect.any(Function)
    );
  });
});
