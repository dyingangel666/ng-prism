import path from 'node:path';
import { extractJsDocData } from './jsdoc-extractor.js';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/documented-button.ts');

describe('extractJsDocData', () => {
  it('should return null for a non-existent class name', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'NonExistentComponent');
    expect(result).toBeNull();
  });

  it('should extract the class description', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classDescription).toBe('Primary action button component.');
  });

  it('should extract @deprecated tag as string when message is present', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classTags.deprecated).toBe('Use PrimaryButtonComponent instead.');
  });

  it('should extract @since tag', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classTags.since).toBe('1.0.0');
  });

  it('should extract @version tag', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classTags.version).toBe('1.0.0');
  });

  it('should extract @see tag', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classTags.see).toEqual(['PrimaryButtonComponent']);
  });

  it('should extract @example tag', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.classTags.example).toBeDefined();
    expect(result?.classTags.example?.length).toBeGreaterThan(0);
  });

  it('should extract member tags for variant input', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.memberTags['variant']).toBeDefined();
    expect(result?.memberTags['variant'].deprecated).toBe('Prefer using semantic tokens');
    expect(result?.memberTags['variant'].since).toBe('1.1.0');
  });

  it('should not include member tags for members without JSDoc tags', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'DocumentedButtonComponent');
    expect(result?.memberTags['clicked']).toBeUndefined();
    expect(result?.memberTags['label']).toBeUndefined();
  });

  it('should return empty classTags for a class without tags', () => {
    const result = extractJsDocData(FIXTURE_PATH, 'UndocumentedButtonComponent');
    expect(result).not.toBeNull();
    expect(result?.classTags).toEqual({});
    expect(result?.classDescription).toBeUndefined();
    expect(result?.memberTags).toEqual({});
  });
});
