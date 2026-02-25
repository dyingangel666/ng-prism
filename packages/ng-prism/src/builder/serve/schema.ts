export interface ServeBuilderSchema {
  entryPoint: string;
  prismProject: string;
  libraryProject?: string;
  port?: number;
  libraryImportPath?: string;
  configFile?: string;
}
