import type { AxeResults, RunOptions } from 'axe-core';
import type { A11yComponentConfig, A11yPluginOptions } from './a11y.types.js';

export async function runA11yAudit(
  element: Element,
  globalOptions?: A11yPluginOptions,
  componentConfig?: A11yComponentConfig,
): Promise<AxeResults> {
  const axe = await import('axe-core');

  const mergedRules: Record<string, { enabled: boolean }> = {
    ...globalOptions?.rules,
    ...componentConfig?.rules,
  };

  const options: RunOptions = {};
  const ruleKeys = Object.keys(mergedRules);
  if (ruleKeys.length > 0) {
    options.rules = Object.fromEntries(
      ruleKeys.map((id) => [id, mergedRules[id]]),
    );
  }

  return axe.default.run(element, options);
}
