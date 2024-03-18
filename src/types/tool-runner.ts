import type EventEmitter from 'node:events';

export interface ToolOptions {
  sampleInterval?: number;
  detectPort?: boolean;
  dest?: string;
  debug?: boolean;
  kernelTracing?: boolean;
  name?: string;
}

export type Args = {
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

export type Color =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray';

export type UiOptions = {
  color?: Color;
};

export interface ITool extends EventEmitter {
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

export type Tool = new (options: ToolOptions) => ITool;
