export const PRISM_DARK_THEME: Record<string, string> = {
  '--prism-code-tag': '#f472b6',
  '--prism-code-attr': '#60a5fa',
  '--prism-code-str': '#86efac',
  '--prism-code-com': '#6a5d87',

  '--prism-void': '#07050f',
  '--prism-bg': '#0d0b1c',
  '--prism-bg-surface': '#131022',
  '--prism-bg-elevated': '#1a1535',
  '--prism-stage': '#16122b',
  '--prism-stage-edge': 'rgba(255, 255, 255, 0.10)',

  '--prism-text': '#ede9f8',
  '--prism-text-2': '#b0a6c8',
  '--prism-text-muted': '#8476a2',
  '--prism-text-ghost': '#6a5d87',

  '--prism-primary': '#a78bfa',
  '--prism-primary-from': '#7c3aed',
  '--prism-primary-to': '#3b82f6',
  '--prism-accent': '#ec4899',

  '--prism-border': 'rgba(255, 255, 255, 0.08)',
  '--prism-border-strong': 'rgba(255, 255, 255, 0.16)',

  '--prism-glow': 'rgba(139, 92, 246, 0.18)',
  '--prism-glow-strong': 'rgba(139, 92, 246, 0.35)',

  '--prism-input-bg': 'rgba(255, 255, 255, 0.05)',
  '--prism-dot': 'rgba(167, 139, 250, 0.18)',

  '--prism-success': '#34d399',
  '--prism-warn': '#fbbf24',
  '--prism-danger': '#f87171',

  '--prism-mark-nominal': 'transparent',
  '--prism-mark-attention': '#e8a33d',
  '--prism-mark-critical': '#e5484d',
  '--prism-measure': '#22d3ee',
  '--prism-spectrum':
    'linear-gradient(90deg, var(--prism-accent), var(--prism-primary), var(--prism-primary-to))',
};

export const PRISM_LIGHT_THEME: Record<string, string> = {
  '--prism-code-tag': '#be185d',
  '--prism-code-attr': '#1d4ed8',
  '--prism-code-str': '#047857',
  '--prism-code-com': '#6b5e80',

  '--prism-void': '#f7f5fc',
  '--prism-bg': '#ffffff',
  '--prism-bg-surface': '#faf9fd',
  '--prism-bg-elevated': '#ffffff',
  '--prism-stage': '#ffffff',
  '--prism-stage-edge': 'rgba(28, 21, 48, 0.14)',

  '--prism-text': '#1c1530',
  '--prism-text-2': '#4d4266',
  '--prism-text-muted': '#6b5e80',
  '--prism-text-ghost': '#b0a6c8',

  '--prism-primary': '#7c3aed',
  '--prism-primary-from': '#7c3aed',
  '--prism-primary-to': '#3b82f6',
  '--prism-accent': '#db2777',

  '--prism-border': 'rgba(28, 21, 48, 0.08)',
  '--prism-border-strong': 'rgba(28, 21, 48, 0.16)',

  '--prism-glow': 'rgba(124, 58, 237, 0.12)',
  '--prism-glow-strong': 'rgba(124, 58, 237, 0.25)',

  '--prism-input-bg': 'rgba(28, 21, 48, 0.04)',
  '--prism-dot': 'rgba(124, 58, 237, 0.2)',

  '--prism-success': '#059669',
  '--prism-warn': '#d97706',
  '--prism-danger': '#dc2626',

  '--prism-mark-nominal': 'transparent',
  '--prism-mark-attention': '#b4700d',
  '--prism-mark-critical': '#c62b30',
  '--prism-measure': '#0b93ad',
  '--prism-spectrum':
    'linear-gradient(90deg, var(--prism-accent), var(--prism-primary), var(--prism-primary-to))',
};

export const PRISM_BASE_TOKENS: Record<string, string> = {
  '--font-sans': "'Inter', system-ui, sans-serif",
  '--font-mono': "'JetBrains Mono', ui-monospace, monospace",

  '--fs-xs': '10px',
  '--fs-sm': '11.5px',
  '--fs-md': '12.5px',
  '--fs-lg': '13.5px',
  '--fs-xl': '15px',
  '--fs-2xl': '22px',

  '--sp-1': '2px',
  '--sp-2': '4px',
  '--sp-3': '8px',
  '--sp-4': '12px',
  '--sp-5': '16px',
  '--sp-6': '24px',
  '--sp-7': '40px',

  '--radius-xs': '3px',
  '--radius-sm': '5px',
  '--radius-md': '7px',
  '--radius-lg': '10px',

  '--ease-default': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--dur-fast': '0.12s',
  '--dur-base': '0.2s',
  '--dur-slow': '0.3s',

  /**
   * Chrome density. Set on the shell host, so a consuming app can compact or
   * loosen the entire interface from CSS alone:
   *
   *   prism-shell { --density: .8 }
   *
   * There is deliberately no signal, service or menu behind this — the whole
   * control surface is the custom property.
   */
  '--density': '1',

  '--band-header': 'calc(40px * var(--density))',
  '--band-head': 'calc(36px * var(--density))',
  '--band-rail': 'calc(28px * var(--density))',
  '--band-tabs': 'calc(34px * var(--density))',

  '--prism-void-light': '#f7f5fc',
  '--prism-void-dark': '#07050f',
  '--prism-text-light': '#ede9f8',

  /**
   * Kept as an alias rather than removed: it is exported through
   * PRISM_BASE_TOKENS, so a consuming stylesheet may reference it even though
   * nothing inside this package does.
   */
  '--prism-header-height': 'var(--band-header)',

  '--prism-font-sans': 'var(--font-sans)',
  '--prism-font-mono': 'var(--font-mono)',
};

export const PRISM_DEFAULT_THEME = PRISM_DARK_THEME;
