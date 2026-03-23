import { InjectionToken } from '@angular/core';
import type { PerfPluginOptions } from './perf.types.js';

export const PERF_PLUGIN_CONFIG = new InjectionToken<PerfPluginOptions>('PERF_PLUGIN_CONFIG');
