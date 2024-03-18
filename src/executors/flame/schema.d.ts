import { BaseExecutorSchema } from '../../types/schema';

export interface FlameExecutorSchema extends BaseExecutorSchema {
  kernelTracing?: boolean;
}
