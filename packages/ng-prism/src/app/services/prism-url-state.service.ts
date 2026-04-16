import { effect, inject, Injectable, Injector } from '@angular/core';
import type { NavigationItem } from './navigation-item.types.js';
import { PRISM_CONFIG } from '../tokens/prism-tokens.js';
import { PrismManifestService } from './prism-manifest.service.js';
import { PrismNavigationService } from './prism-navigation.service.js';
import { PrismPanelService } from './prism-panel.service.js';
import { PrismRendererService } from './prism-renderer.service.js';

const PARAM_COMPONENT = 'component';
const PARAM_PAGE = 'page';
const PARAM_VARIANT = 'variant';
const PARAM_VIEW = 'view';
const DEFAULT_VIEW = 'renderer';

@Injectable({ providedIn: 'root' })
export class PrismUrlStateService {
  private readonly manifestService = inject(PrismManifestService);
  private readonly navigationService = inject(PrismNavigationService);
  private readonly rendererService = inject(PrismRendererService);
  private readonly panelService = inject(PrismPanelService);
  private readonly config = inject(PRISM_CONFIG);
  private readonly injector = inject(Injector);

  private suppressSync = false;

  init(): void {
    if (this.config.urlState === false) return;

    this.restoreFromUrl();

    effect(() => {
      const item = this.navigationService.activeItem();
      const variantIndex = this.rendererService.activeVariantIndex();
      const viewId = this.panelService.activeViewId();

      if (this.suppressSync) return;
      this.writeToUrl(item, variantIndex, viewId);
    }, { injector: this.injector });

    window.addEventListener('popstate', () => this.restoreFromUrl());
  }

  private restoreFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const componentClassName = params.get(PARAM_COMPONENT);
    const pageTitle = params.get(PARAM_PAGE);
    const variantParam = params.get(PARAM_VARIANT);
    const viewId = params.get(PARAM_VIEW);

    this.suppressSync = true;
    try {
      if (componentClassName) {
        const comp = this.manifestService.components()
          .find((c) => c.meta.className === componentClassName);
        if (comp) {
          this.navigationService.select(comp);
          if (variantParam !== null) {
            const index = parseInt(variantParam, 10);
            const maxIndex = (comp.meta.showcaseConfig.variants?.length ?? 1) - 1;
            if (!Number.isNaN(index) && index >= 0 && index <= maxIndex) {
              this.rendererService.activeVariantIndex.set(index);
            }
          }
        }
      } else if (pageTitle) {
        const page = this.manifestService.pages()
          .find((p) => p.title === pageTitle);
        if (page) {
          this.navigationService.selectPage(page);
        }
      }

      if (viewId) {
        this.panelService.activeViewId.set(viewId);
      }
    } finally {
      this.suppressSync = false;
    }
  }

  private writeToUrl(
    item: NavigationItem | null,
    variantIndex: number,
    viewId: string,
  ): void {
    const params = new URLSearchParams();

    if (item?.kind === 'component') {
      params.set(PARAM_COMPONENT, item.data.meta.className);
      if (variantIndex > 0) {
        params.set(PARAM_VARIANT, String(variantIndex));
      }
    } else if (item?.kind === 'page') {
      params.set(PARAM_PAGE, item.data.title);
    }

    if (viewId && viewId !== DEFAULT_VIEW) {
      params.set(PARAM_VIEW, viewId);
    }

    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    if (newUrl === window.location.pathname + window.location.search) return;

    const currentParams = new URLSearchParams(window.location.search);
    const prevNavKey = currentParams.get(PARAM_COMPONENT) ?? currentParams.get(PARAM_PAGE);
    const newNavKey = params.get(PARAM_COMPONENT) ?? params.get(PARAM_PAGE);

    if (prevNavKey !== newNavKey) {
      window.history.pushState(null, '', newUrl);
    } else {
      window.history.replaceState(null, '', newUrl);
    }
  }
}
