/** Port of https://github.com/clinicjs/node-clinic/blob/main/bin.js#L476 */
import { logger } from '@nx/devkit';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';
import { access, appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import type { Options as OraOptions } from 'ora';

import { replace as envString } from './envsubst';

interface ToolOptions {
  sampleInterval?: number;
  detectPort?: boolean;
  dest?: string;
  debug?: boolean;
  kernelTracing?: boolean;
  name?: string;
}

type Args = {
  collectOnly?: boolean;
  dest?: string;
  debug?: boolean;
  kernelTracing?: boolean;
  name?: string;
  onPort?: string;
  open?: boolean;
  sampleInterval?: string;
  stopDelay?: string;
  version?: boolean;
  visualizeOnly?: string;
  command: string[];
};

type Color =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray';

type UiOptions = {
  color?: Color;
};

interface ITool extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  // new(options?: ToolOptions): ITool;
  collect(
    command: string[],
    callback: (err: Error | null, filepath: string) => void
  ): void;
  visualize(
    data: string,
    output: string,
    callback: (err: Error | null) => void
  ): void;
}

type Tool = new (options: ToolOptions) => ITool;

async function openUrl(target: string, options: { wait: boolean }) {
  const open = Function('return import("open")')() as Promise<
    typeof import('open')
  >;
  return (await open).default(target, options);
}

async function spinnerFactory(options: OraOptions = {}) {
  // https://github.com/microsoft/TypeScript/issues/43329
  const ora = Function('return import("ora")')() as Promise<
    typeof import('ora')
  >;
  // const ora =  import('ora');
  return (await ora).default({
    text: '',
    spinner: 'simpleDots',
    ...options,
  });
}

// eslint-disable-next-line max-lines-per-function
export async function runTool(
  toolName: string,
  Tool: Tool,
  version: string,
  args: Args,
  uiOptions: UiOptions = {}
) {
  // TODO: add support for autocannon options

  const {
    collectOnly,
    command,
    debug,
    dest,
    kernelTracing,
    name,
    onPort,
    open: openLocalFile,
    sampleInterval,
    stopDelay,
    visualizeOnly,
  } = args;

  if (!onPort && !visualizeOnly) {
    if (collectOnly) {
      logger.log('To stop data collection press: Ctrl + C');
    } else {
      logger.log('To generate the report press: Ctrl + C');
    }
  }

  const stopDelayMs = parseInt(stopDelay ?? '2000', 10);
  const spinnerIsEnabled = process.stdout.isTTY && !process.env.CI;
  const spinnerStream = process.stderr;
  const spinner = await spinnerFactory({
    isEnabled: spinnerIsEnabled,
    stream: spinnerStream,
    color: uiOptions.color,
  });

  function status(message: string) {
    if (spinnerIsEnabled) {
      spinner.text = `${message}\n`;
    } else {
      logger.log(message);
    }
  }

  function onsigint() {
    status('Received Ctrl+C, closing process...');
    if (!spinner.isSpinning) spinner.start();
  }

  const tool = new Tool({
    sampleInterval: parseInt(sampleInterval ?? '250', 10),
    detectPort: !!onPort,
    dest,
    debug,
    kernelTracing,
    name,
  });
  const collect = promisify(tool.collect.bind(tool));

  async function viz(toolName: string, filename: string) {
    await access(filename).catch(() => {
      throw new Error(`No data found: ${filename}`);
    });
    const html = filename + '.html';
    const visualize = promisify(tool.visualize.bind(tool));
    await visualize(filename, html);
    await hash(html).then((h) => {
      const info = {
        tool: toolName,
        toolVersion: version,
        hash: h.toString('hex'),
      };
      return appendFile(html, `<!-- ${JSON.stringify(info)} -->\n`);
    });
  }

  tool.on('warning', function (warning) {
    logger.warn(warning);
  });

  tool.on('port', function (port, proc, cb) {
    process.env.PORT = port;
    // inline the PORT env to make it easier for cross platform usage
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    spawn(envString(onPort!, { PORT: port }), { stdio: 'inherit' }).on(
      'exit',
      () => {
        if (stopDelayMs) {
          tool.emit('status', 'Waiting to close the process');
          if (spinnerIsEnabled && !spinner.isSpinning) spinner.start();
          setTimeout(stopDelayMs).then(() => cb());
        } else {
          cb();
        }
      }
    );
  });

  tool.on('analysing', function (message = 'Analysing data') {
    if (spinnerIsEnabled && !spinner.isSpinning) {
      spinner.start(message);
    } else {
      logger.log(message);
    }
  });

  tool.on('status', status);

  let filename: string;
  if (collectOnly) {
    process.once('SIGINT', onsigint);

    filename = await collect(command);
    if (spinnerIsEnabled) {
      spinner.stop();
    }
  } else if (visualizeOnly) {
    const dataPath = visualizeOnly.replace(/[\\/]$/, '');
    await viz(toolName, dataPath);
    filename = dataPath;
  } else {
    process.once('SIGINT', onsigint);
    filename = await collect(command);
    await viz(toolName, filename).catch((err) => {
      if (
        err &&
        'code' in err &&
        err?.['code'] === 'ENOENT' &&
        err?.message.includes('processstat')
      ) {
        spinner.fail(
          'Process forcefully closed before processstat file generation'
        );
        throw new Error(
          'Process forcefully closed before processstat file generation'
        );
      }
      spinner.fail('Error generating HTML file');
      throw err;
    });
    if (openLocalFile) {
      const p = await openUrl(pathToFileURL(filename + '.html').toString(), {
        wait: false,
      });
      // trick to keep the process running
      p.ref();
      await setTimeout(500);
    }
    if (spinnerIsEnabled) {
      spinner.stop();
    }
  }

  if (!collectOnly) {
    spinner.succeed(
      `Generated HTML file is ${pathToFileURL(filename + '.html')}`
    );
  } else {
    spinner.succeed(`Output file is ${filename}`);
  }
}

function hash(filename: string) {
  const sha = createHash('sha512');
  sha.update('clinic\n');
  return new Promise<Buffer>((resolve, reject) => {
    createReadStream(filename)
      .on('data', (data) => sha.update(data))
      .on('end', () => resolve(sha.digest()))
      .on('error', reject);
  });
}
