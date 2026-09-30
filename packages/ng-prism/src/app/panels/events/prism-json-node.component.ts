import { NgComponentOutlet } from '@angular/common';
import { Component, computed, input, signal, Type } from '@angular/core';
import { summarizeValue } from './prism-json-node.utils.js';

const MAX_DEPTH = 10;
const MAX_ENTRIES = 50;

export { summarizeValue } from './prism-json-node.utils.js';

type JsonNodeType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'array';

function getType(val: unknown): JsonNodeType {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return 'array';
    return typeof val as JsonNodeType;
}

@Component({
    selector: 'prism-json-node',
    standalone: true,
    imports: [NgComponentOutlet],
    templateUrl: './prism-json-node.component.html',
    styleUrl: './prism-json-node.component.css'
})
export class PrismJsonNodeComponent {
    readonly value = input<unknown>(undefined);
    readonly depth = input<number>(0);

    protected readonly maxDepth = MAX_DEPTH;
    protected readonly self: Type<PrismJsonNodeComponent> = PrismJsonNodeComponent;

    protected readonly type = computed(() => getType(this.value()));
    protected readonly expanded = signal(false);

    protected readonly entries = computed<{ key: string; value: unknown }[]>(() => {
        const v = this.value();

        if (typeof v !== 'object' || v === null || Array.isArray(v)) return [];
        try {
            return Object.entries(v as Record<string, unknown>)
                .slice(0, MAX_ENTRIES)
                .map(([key, value]) => ({ key, value }));
        } catch {
            return [];
        }
    });

    protected readonly items = computed<unknown[]>(() => {
        const v = this.value();

        return Array.isArray(v) ? v : [];
    });

    protected readonly summary = computed(() => summarizeValue(this.value()));

    protected toggle(): void {
        this.expanded.update((v) => !v);
    }
}
