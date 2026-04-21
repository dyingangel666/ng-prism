import { BadgeComponent, BadgeVariantType } from './badge.component';

describe('BadgeComponent', () => {
  it('should be defined', () => {
    expect(BadgeComponent).toBeDefined();
  });

  it('should export BadgeVariantType variants', () => {
    const variants: BadgeVariantType[] = ['default', 'success', 'warning', 'error', 'info'];
    expect(variants).toHaveLength(5);
  });
});
