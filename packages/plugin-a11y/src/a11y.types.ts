export interface A11yPluginOptions {
  rules?: Record<string, { enabled: boolean }>;
}

export interface A11yComponentConfig {
  rules?: Record<string, { enabled: boolean }>;
  disable?: boolean;
}
