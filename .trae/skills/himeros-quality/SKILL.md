---
name: himeros-quality
description: Definition-of-done checks for Angular code, accessibility, responsiveness, tests and contract safety in Himeros.
---

# Himeros Frontend Quality Skill

## Required checks for every changed feature

### Compile

- `npm run lint:types`
- `npm run build:prod`
- `npm test`

### UX

- Loading state exists.
- Empty state exists when the dataset can be empty.
- Error state is readable and recoverable where safe.
- Mutation buttons expose submitting/disabled state.
- Destructive actions ask for confirmation or use a recoverable flow.

### Accessibility

- Full keyboard path works.
- Focus is visible.
- Inputs have labels.
- Icon-only buttons have accessible names.
- Images have appropriate alt text.
- Heading hierarchy is sensible.
- Error text is not communicated by color alone.

### Responsive

Review at least conceptually at:

- narrow phone (~360px);
- common phone (~390–430px);
- tablet (~768px);
- desktop (~1280px+).

No horizontal overflow in primary flows.

### Architecture

- No endpoint literal in a feature.
- No auth token storage.
- No React dependency.
- No duplicated UI primitive.
- No feature imported eagerly into root/shell accidentally.
- Specs updated if behavior/contract changed.

## Test strategy

Prioritize tests for:

- auth/session and retry behavior;
- derived feature state;
- form validation/submission;
- destructive mutations;
- realtime message deduplication;
- route guards;
- regression-prone UI primitives.

Do not write snapshot-only tests as the primary evidence of behavior.
