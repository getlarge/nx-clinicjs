import { BaseExecutorSchema } from '../../types/schema';

export interface DoctorExecutorSchema extends BaseExecutorSchema {
  /** The time in ms to wait before starting to collect data */
  collectDelay?: number;
  /** The time in ms between each sample */
  sampleInterval?: string;
}
