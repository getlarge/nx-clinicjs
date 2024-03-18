declare module '@clinic/doctor' {
  import type { EventEmitter } from 'node:events';

  interface ClinicDoctorOptions {
    detectPort?: boolean;
    debug?: boolean;
    dest?: string;
    name?: string;
    collectDelay?: number;
    sampleInterval?: number;
  }

  class ClinicDoctor extends EventEmitter {
    constructor(options?: ClinicDoctorOptions);
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
  export = ClinicDoctor;
}
