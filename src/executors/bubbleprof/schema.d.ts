export interface BubbleprofExecutorSchema {
  buildTarget: string;
  detectPort?: boolean;
  /** If set to true, the generated html will not be minified. Default: false */
  debug?: boolean;
  /** The folder where the collected data is stored. Default: '.' */
  dest?: string;
  name?: string;
  /** Path of the report to visualize */
  visualizeOnly?: string;
}
