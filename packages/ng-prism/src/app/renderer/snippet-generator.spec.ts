import type { InputMeta } from '../../plugin/plugin.types.js';
import { generateSnippet } from './snippet-generator.js';

function meta(overrides: Partial<InputMeta> & Pick<InputMeta, 'name'>): InputMeta {
  return { type: 'string', required: false, ...overrides };
}

describe('generateSnippet', () => {
  it('should return self-closing tag when no inputs have values', () => {
    expect(generateSnippet('lib-button', [], {})).toBe('<lib-button />');
  });

  it('should render string inputs as plain attributes', () => {
    const inputs = [meta({ name: 'label' })];
    const result = generateSnippet('lib-button', inputs, { label: 'Save' });
    expect(result).toBe('<lib-button label="Save" />');
  });

  it('should render boolean true with binding syntax', () => {
    const inputs = [meta({ name: 'disabled', type: 'boolean' })];
    const result = generateSnippet('lib-button', inputs, { disabled: true });
    expect(result).toBe('<lib-button [disabled]="true" />');
  });

  it('should omit boolean false', () => {
    const inputs = [meta({ name: 'disabled', type: 'boolean' })];
    const result = generateSnippet('lib-button', inputs, { disabled: false });
    expect(result).toBe('<lib-button />');
  });

  it('should render number with binding syntax', () => {
    const inputs = [meta({ name: 'count', type: 'number' })];
    const result = generateSnippet('lib-button', inputs, { count: 42 });
    expect(result).toBe('<lib-button [count]="42" />');
  });

  it('should render object/array as placeholder', () => {
    const inputs = [meta({ name: 'data', type: 'object' })];
    const result = generateSnippet('lib-button', inputs, { data: { foo: 1 } });
    expect(result).toBe('<lib-button [data]="yourData" />');
  });

  it('should omit inputs with undefined value', () => {
    const inputs = [meta({ name: 'label' }), meta({ name: 'variant' })];
    const result = generateSnippet('lib-button', inputs, { label: 'Save' });
    expect(result).toBe('<lib-button label="Save" />');
  });

  it('should omit inputs matching their default value', () => {
    const inputs = [
      meta({ name: 'variant', defaultValue: 'primary' }),
      meta({ name: 'label' }),
    ];
    const result = generateSnippet('lib-button', inputs, {
      variant: 'primary',
      label: 'Save',
    });
    expect(result).toBe('<lib-button label="Save" />');
  });

  it('should render single-line when total length fits in 80 chars', () => {
    const inputs = [
      meta({ name: 'variant' }),
      meta({ name: 'label' }),
      meta({ name: 'disabled', type: 'boolean' }),
    ];
    const result = generateSnippet('lib-button', inputs, {
      variant: 'filled',
      label: 'Save',
      disabled: true,
    });
    expect(result).toBe(
      '<lib-button variant="filled" label="Save" [disabled]="true" />',
    );
  });

  it('should render multiline when total length exceeds 80 chars', () => {
    const inputs = [
      meta({ name: 'variant' }),
      meta({ name: 'label' }),
      meta({ name: 'placeholder' }),
      meta({ name: 'disabled', type: 'boolean' }),
    ];
    const result = generateSnippet('my-long-component-selector', inputs, {
      variant: 'filled',
      label: 'Save Changes',
      placeholder: 'Enter something here',
      disabled: true,
    });
    expect(result).toBe(
      `<my-long-component-selector\n  variant="filled"\n  label="Save Changes"\n  placeholder="Enter something here"\n  [disabled]="true" />`,
    );
  });

  it('should include non-default values even when defaults exist', () => {
    const inputs = [meta({ name: 'variant', defaultValue: 'primary' })];
    const result = generateSnippet('lib-button', inputs, { variant: 'danger' });
    expect(result).toBe('<lib-button variant="danger" />');
  });

  it('should render array as placeholder', () => {
    const inputs = [meta({ name: 'items', type: 'array' })];
    const result = generateSnippet('lib-button', inputs, { items: [1, 2, 3] });
    expect(result).toBe('<lib-button [items]="yourData" />');
  });

  it('should include default values when input is in explicitKeys', () => {
    const inputs = [
      meta({ name: 'variant', defaultValue: 'filled' }),
      meta({ name: 'icon', defaultValue: '★' }),
    ];
    const explicitKeys = new Set(['variant', 'icon']);
    const result = generateSnippet(
      'lib-button',
      inputs,
      { variant: 'icon-only', icon: '★' },
      explicitKeys,
    );
    expect(result).toBe(
      '<lib-button variant="icon-only" icon="★" />',
    );
  });

  it('should include values not present in inputs metadata', () => {
    const inputs = [meta({ name: 'disabled', type: 'boolean' })];
    const result = generateSnippet(
      'sg-color-picker',
      inputs,
      { value: '#6366f1', alphaChannel: true, disabled: false },
    );
    expect(result).toBe(
      '<sg-color-picker value="#6366f1" [alphaChannel]="true" />',
    );
  });

  it('should still omit defaults for non-explicit inputs', () => {
    const inputs = [
      meta({ name: 'variant', defaultValue: 'filled' }),
      meta({ name: 'label', defaultValue: 'Button' }),
    ];
    const explicitKeys = new Set(['variant']);
    const result = generateSnippet(
      'lib-button',
      inputs,
      { variant: 'outlined', label: 'Button' },
      explicitKeys,
    );
    expect(result).toBe('<lib-button variant="outlined" />');
  });
});
