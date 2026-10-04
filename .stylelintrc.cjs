module.exports = {
    plugins: ['stylelint-order'],
    extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
    rules: {
        // The CSS is BEM throughout (.cell__caption, .a11y-status--error), which
        // the default kebab-case pattern rejects wholesale: 368 of the 1216
        // baseline findings were this single rule, all BEM element/modifier
        // separators.
        'selector-class-pattern': null,

        // BEM's own convention (base block/element rule first, state-modifier
        // compound selector after, e.g. `.vrt__group-label` declared before
        // `.vrt__group--toggle:hover .vrt__group-label`) reads as "descending
        // specificity" to this rule, even though the modifier's higher
        // specificity wins regardless of source order. Confirmed against all 4
        // occurrences in this codebase; every one is this exact base-then-modifier
        // shape, not an accidental override.
        'no-descending-specificity': null,

        // No evidence found: no ID selector exists anywhere in the 55 component
        // stylesheets (`grep -rE '#[a-zA-Z]' packages/*/src --include=*.css`
        // returns nothing), so selector-id-pattern's kebab-case default has
        // nothing to conflict with here. Left enabled; verified it adds zero
        // findings against the current codebase.

        // No evidence found: the codebase's custom-element type selectors
        // (`prism-icon`, `prism-sidebar`, used e.g. as `.sb-group-head
        // prism-icon`) already pass stylelint's default handling: any
        // hyphenated tag name is treated as a valid custom element per the
        // Custom Elements spec, so this rule doesn't flag them even enabled.
        // Left enabled; verified it adds zero findings against the current
        // codebase.

        // No evidence found: none of the 55 tracked stylesheets is empty or
        // comment-only (smallest is 33 bytes, `:host { display: contents; }`).
        // Left enabled; verified it adds zero findings against the current
        // codebase.

        // Angular's ::ng-deep is a non-standard, view-encapsulation-piercing
        // combinator (deprecated by Angular but still the only way to reach
        // into child component styles from here). 37 uses across 3
        // stylesheets. Without this allowance every one fails
        // selector-pseudo-element-no-unknown (verified).
        'selector-pseudo-element-no-unknown': [
            true,
            {
                ignorePseudoElements: ['ng-deep']
            }
        ]
    },

    // SCSS needs its own parser (postcss-scss) and its own rules:
    // at-rule-no-unknown rejects @use/@mixin/@include, and
    // no-invalid-double-slash-comments treats `//` as broken CSS.
    // stylelint-config-standard-scss brings both and swaps the affected
    // rules for their scss/ counterparts.
    overrides: [
        {
            files: ['**/*.scss'],
            extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
            rules: {
                // stylelint-config-standard-scss sets
                // `except: ['after-dollar-variable']`, i.e. no empty line
                // allowed between two consecutive $ variables, and the autofix
                // removes them. In _variables.scss those empty lines separate
                // the groups (base, accent, success, error, font); one autofix
                // run collapsed all seven into a 40-line wall. The grouping is
                // intended, so the case is set to `ignore`: between two
                // variables either is allowed, everywhere else the rule
                // applies unchanged.
                'scss/dollar-variable-empty-line-before': [
                    'always',
                    {
                        except: ['first-nested'],
                        ignore: ['after-comment', 'inside-single-line-block', 'after-dollar-variable']
                    }
                ]
            }
        }
    ]
};
