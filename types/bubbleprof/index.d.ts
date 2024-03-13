declare module '@clinic/bubbleprof' {
  import type { EventEmitter } from 'node:events';

  interface ClinicBubbleprofOptions {
    detectPort?: boolean;
    debug?: boolean;
    dest?: string;
    name?: string;
  }

  class ClinicBubbleprof extends EventEmitter {
    constructor(options?: ClinicBubbleprofOptions);
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
  // because => https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html
  export = ClinicBubbleprof;
}
