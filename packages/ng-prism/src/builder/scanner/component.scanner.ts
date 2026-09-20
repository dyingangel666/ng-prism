import ts from 'typescript';
import type { ScannedComponent } from '../../plugin/plugin.types.js';
import type {
  ComponentStatus,
  ShowcaseConfig,
} from '../../decorator/showcase.types.js';
import { CANVAS_BGS, type CanvasBg } from '../../shared/canvas-bg.type.js';
import {
  CANVAS_LAYOUTS,
  type CanvasLayout,
} from '../../shared/canvas-layout.type.js';

const COMPONENT_STATUSES = ['stable', 'beta', 'wip', 'deprecated'] as const;

function isComponentStatus(value: unknown): value is ComponentStatus {
  return (
    typeof value === 'string' &&
    (COMPONENT_STATUSES as readonly string[]).includes(value)
  );
}
import {
  evaluateExpression,
  findDecorator,
  getDecoratorArgument,
} from './ast-utils.js';
import { extractInputs, extractOutputs } from './input.extractor.js';

/**
 * Backgrounds that still work but should not be reached for any more.
 *
 * `checker` draws the same checkerboard as `transparent` while browsing, so
 * the canvas cannot tell them apart — but it captures as `--prism-bg-surface`,
 * a *theme* token, which makes a baseline recorded on it depend on the theme
 * the runner's browser started in. Since `transparent` took over as the
 * default, it is the value that looks like transparency and is not.
 *
 * Warned rather than rejected: the value is valid, and dropping it would
 * change what a component renders on — a break wearing a warning's clothes.
 * Scheduled for removal in 23.0.0, the next Angular-aligned major.
 */
const DEPRECATED_BGS: Partial<Record<CanvasBg, string>> = {
  checker:
    "use 'transparent' for the same look with a capture that keeps its alpha, or 'light'/'dark' for an absolute colour",
};

function warnDeprecatedBg(bg: CanvasBg, where: string): void {
  const advice = DEPRECATED_BGS[bg];
  if (!advice) return;
  console.warn(
    `⚠ ng-prism: ${where} declares bg "${bg}", which is deprecated and will ` +
      `be removed in 23.0.0 — ${advice}.`
  );
}

function isCanvasBg(value: unknown): value is CanvasBg {
  return (
    typeof value === 'string' &&
    (CANVAS_BGS as readonly string[]).includes(value)
  );
}

function isCanvasLayout(value: unknown): value is CanvasLayout {
  return (
    typeof value === 'string' &&
    (CANVAS_LAYOUTS as readonly string[]).includes(value)
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

    // Perf: cheap pre-filter — skip the full decorator walk for files that don't
    // mention Showcase at all. False positives (string-literal containing "@Showcase")
    // just lose the optimization for that file; correctness is unaffected.
    if (!classDecl.getSourceFile().text.includes('@Showcase')) continue;

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
  if (obj['section']) config.section = obj['section'] as string;
  if (typeof obj['sectionOrder'] === 'number') {
    config.sectionOrder = obj['sectionOrder'];
  }
  if (obj['tags']) config.tags = obj['tags'] as string[];
  if (obj['meta']) config.meta = obj['meta'] as Record<string, unknown>;
  if (obj['host'] !== undefined)
    config.host = obj['host'] as ShowcaseConfig['host'];
  if (obj['renderPage']) config.renderPage = obj['renderPage'] as string;

  if (obj['status'] !== undefined) {
    if (isComponentStatus(obj['status'])) {
      config.status = obj['status'];
    } else {
      console.warn(
        `⚠ ng-prism: ${className} declares invalid status "${String(
          obj['status']
        )}" — ` + `expected one of: ${COMPONENT_STATUSES.join(', ')}. Skipping.`
      );
    }
  }

  if (obj['bg'] !== undefined) {
    if (isCanvasBg(obj['bg'])) {
      config.bg = obj['bg'];
      warnDeprecatedBg(obj['bg'], className);
    } else {
      console.warn(
        `⚠ ng-prism: ${className} declares invalid bg "${String(
          obj['bg']
        )}" — ` + `expected one of: ${CANVAS_BGS.join(', ')}. Skipping.`
      );
    }
  }

  if (obj['canvasLayout'] !== undefined) {
    if (isCanvasLayout(obj['canvasLayout'])) {
      config.canvasLayout = obj['canvasLayout'];
    } else {
      console.warn(
        `⚠ ng-prism: ${className} declares invalid canvasLayout "${String(
          obj['canvasLayout']
        )}" — ` + `expected one of: ${CANVAS_LAYOUTS.join(', ')}. Skipping.`
      );
    }
  }

  if (Array.isArray(obj['variants'])) {
    config.variants = (obj['variants'] as Array<Record<string, unknown>>).map(
      (variant) => {
        const cleaned: Record<string, unknown> = { ...variant };
        if (isCanvasBg(variant['bg'])) {
          warnDeprecatedBg(
            variant['bg'],
            `${className} variant "${String(variant['name'])}"`
          );
        }
        if (variant['bg'] !== undefined && !isCanvasBg(variant['bg'])) {
          console.warn(
            `⚠ ng-prism: ${className} variant "${String(
              variant['name']
            )}" declares ` +
              `invalid bg "${String(variant['bg'])}" — expected one of: ` +
              `${CANVAS_BGS.join(', ')}. Skipping.`
          );
          delete cleaned['bg'];
        }
        if (
          variant['canvasLayout'] !== undefined &&
          !isCanvasLayout(variant['canvasLayout'])
        ) {
          console.warn(
            `⚠ ng-prism: ${className} variant "${String(
              variant['name']
            )}" declares ` +
              `invalid canvasLayout "${String(
                variant['canvasLayout']
              )}" — expected one of: ${CANVAS_LAYOUTS.join(', ')}. Skipping.`
          );
          delete cleaned['canvasLayout'];
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
