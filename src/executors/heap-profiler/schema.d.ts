import { BaseExecutorSchema } from '../../types/schema';

export interface HeapProfilerExecutorSchema extends BaseExecutorSchema {
  /** Whether the report should be generated on error */
  collectOnFailure?: boolean;
}
