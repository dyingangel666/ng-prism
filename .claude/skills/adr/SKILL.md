---
name: adr
description: Creates Architecture Decision Records under docs/adr/. Triggers on "create ADR", "new ADR", "document decision", "architecture decision".
---

# ADR — Architecture Decision Record

Create ADRs under `docs/adr/` to document architectural decisions.

## Naming Convention

```
docs/adr/NNN-kebab-case-title.md
```

- Sequential numbering: `001`, `002`, `003`, ...
- Check existing ADRs to determine the next number

## Template

```markdown
# ADR NNN — Title

**Status:** Akzeptiert | Vorgeschlagen | Abgelöst durch ADR XXX
**Datum:** YYYY-MM-DD

---

## Kontext

What is the issue or situation that requires a decision?
What forces are at play?

## Entscheidung

What is the decision that was made?
Include code examples if relevant.

## Begründung

Why was this decision made?
What alternatives were considered?
What are the key arguments?

## Konsequenzen

What are the positive and negative consequences?
What trade-offs were accepted?
What follow-up work is needed?
```

## Existing ADRs

| # | Title | Topic |
|---|---|---|
| 001 | Decorator-basierte Komponenten-Discovery | @Showcase vs story files |
| 002 | TypeScript Compiler API | Scanning approach |
| 003 | Plugin-Architektur | Plugin system design |
| 004 | *(check docs/adr/ for latest)* | |

## Conventions

- ADRs are written in **German** (consistent with project documentation)
- Status values: `Akzeptiert`, `Vorgeschlagen`, `Abgelöst durch ADR XXX`
- Keep them concise — focus on the "why", not the "how"
- Reference related ADRs when decisions build on each other
- Update `docs/README.md` documentation index when adding new ADRs

## Checklist

- [ ] Correct sequential number
- [ ] Status and date set
- [ ] Context explains the problem
- [ ] Decision is clear and specific
- [ ] Alternatives were considered
- [ ] Consequences are documented
- [ ] `docs/README.md` index updated
