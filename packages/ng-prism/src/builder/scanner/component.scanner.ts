import ts from 'typescript';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import type { ShowcaseConfig } from '../../decorator/showcase.types.js';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';
import {
  evaluateExpression,
  findDecorator,
  getDecoratorArgument,
} from './ast-utils.js';
import { extractInputs, extractOutputs } from './input.extractor.js';

function isCanvasBg(value: unknown): value is CanvasBg {
  return (
    typeof value === 'string' &&
    (CANVAS_BGS as readonly string[]).includes(value)
  );
}

/**
 * Scan exported symbols for Angular components annotated with @Showcase.
 */
export function scanComponents(
  exports: ts.Symbol[],
  checker: ts.TypeChecker
): ScannedComponent[] {
  const components: ScannedComponent[] = [];

  for (const sym of exports) {
    const resolved =
      sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;

    const classDecl = resolved.declarations?.find(ts.isClassDeclaration);
    if (!classDecl) continue;

    const showcaseDecorator = findDecorator(classDecl, 'Showcase');
    if (!showcaseDecorator) continue;

    const className = classDecl.name?.text ?? 'Anonymous';
    const showcaseConfig = extractShowcaseConfig(showcaseDecorator, className);
    if (!showcaseConfig) continue;

    const componentMeta = extractComponentMeta(classDecl);
    const inputs = extractInputs(classDecl, checker);
    const outputs = extractOutputs(classDecl, checker);

    const filePath = classDecl.getSourceFile().fileName;

    if (hasDecoratorInputs(classDecl)) {
      console.warn(
        `⚠ ng-prism: ${className} uses @Input() decorators which are not fully supported. ` +
          `Migrate to input() signals for full ng-prism support.`
      );
    }

    components.push({
      className,
      filePath,
      showcaseConfig,
      inputs,
      outputs,
      componentMeta,
    });
  }

  return components;
}

function hasDecoratorInputs(classDecl: ts.ClassDeclaration): boolean {
  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (findDecorator(member, 'Input')) return true;
  }
  return false;
}

function extractShowcaseConfig(
  decorator: ts.Decorator,
  className: string
): ShowcaseConfig | undefined {
  const arg = getDecoratorArgument(decorator);
  if (!arg) return undefined;

  const raw = evaluateExpression(arg);
  if (!raw || typeof raw !== 'object') return undefined;

  if (!('title' in raw)) {
    console.warn(
      `⚠ ng-prism: ${className} has @Showcase without a "title" field — skipping. ` +
        `Add a title so it can appear in the styleguide.`
    );
    return undefined;
  }

  const obj = raw as Record<string, unknown>;
  const config: ShowcaseConfig = {
    title: obj['title'] as string,
  };

  if (obj['description']) config.description = obj['description'] as string;
  if (obj['category']) config.category = obj['category'] as string;
  if (obj['tags']) config.tags = obj['tags'] as string[];
  if (obj['meta']) config.meta = obj['meta'] as Record<string, unknown>;
  if (obj['host'] !== undefined)
    config.host = obj['host'] as ShowcaseConfig['host'];
  if (obj['renderPage']) config.renderPage = obj['renderPage'] as string;

  if (obj['bg'] !== undefined) {
    if (isCanvasBg(obj['bg'])) {
      config.bg = obj['bg'];
    } else {
      console.warn(
        `⚠ ng-prism: ${className} declares invalid bg "${String(
          obj['bg']
        )}" — ` +
          `expected one of: dots, plain, light, dark, checker. Skipping.`
      );
    }
  }

  if (Array.isArray(obj['variants'])) {
    config.variants = (obj['variants'] as Array<Record<string, unknown>>).map(
      (variant) => {
        const cleaned: Record<string, unknown> = { ...variant };
        if (variant['bg'] !== undefined && !isCanvasBg(variant['bg'])) {
          console.warn(
            `⚠ ng-prism: ${className} variant "${String(
              variant['name']
            )}" declares ` +
              `invalid bg "${String(
                variant['bg']
              )}" — expected one of: dots, plain, light, dark, checker. Skipping.`
          );
          delete cleaned['bg'];
        }
        return cleaned;
      }
    ) as unknown as ShowcaseConfig['variants'];
  }

  return config;
}

function extractComponentMeta(
  classDecl: ts.ClassDeclaration
): ScannedComponent['componentMeta'] {
  const componentDecorator = findDecorator(classDecl, 'Component');
  if (componentDecorator) {
    const arg = getDecoratorArgument(componentDecorator);
    if (!arg) return { selector: '', standalone: true, isDirective: false };

    const raw = evaluateExpression(arg);
    if (!raw || typeof raw !== 'object') {
      return { selector: '', standalone: true, isDirective: false };
    }

    const obj = raw as Record<string, unknown>;
    return {
      selector: (obj['selector'] as string) ?? '',
      standalone: obj['standalone'] !== false,
      isDirective: false,
    };
  }

  const directiveDecorator = findDecorator(classDecl, 'Directive');
  if (directiveDecorator) {
    const arg = getDecoratorArgument(directiveDecorator);
    if (!arg) return { selector: '', standalone: true, isDirective: true };

    const raw = evaluateExpression(arg);
    if (!raw || typeof raw !== 'object') {
      return { selector: '', standalone: true, isDirective: true };
    }

    const obj = raw as Record<string, unknown>;
    return {
      selector: (obj['selector'] as string) ?? '',
      standalone: obj['standalone'] !== false,
      isDirective: true,
    };
  }

  return { selector: '', standalone: true, isDirective: false };
}
