export interface BuildBuilderSchema {
  entryPoint: string;
  prismProject: string;
  libraryProject?: string;
  outputPath?: string;
  libraryImportPath?: string;
  configFile?: string;
}
