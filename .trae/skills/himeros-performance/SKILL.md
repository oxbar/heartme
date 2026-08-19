---
name: himeros-performance
description: Protect Himeros Angular startup, route chunking, image/network behavior and rendering performance while preserving UX.
---

# Himeros Frontend Performance Skill

## Bundle strategy

- Route-level product features stay lazy.
- Shell, auth/session bootstrap and tiny shared primitives may be eager.
- Heavy secondary route content may use `@defer` with a meaningful placeholder.
- Do not eagerly import feature components into the root or shell.
- Keep production bundle budgets active and investigate regressions rather than raising limits reflexively.

## Rendering

- Use OnPush and Signals.
- Use `track` in every dynamic `@for`.
- Derive filtered/sorted state with `computed()`.
- Avoid getter/function work in hot template loops.
- Virtualize only genuinely long lists; do not add complexity to short lists.

## Network

- Avoid request waterfalls when calls can run concurrently.
- Avoid N+1 HTTP patterns; use backend batch endpoints.
- Debounce user-driven remote search/filter requests where applicable.
- Cache only data with a clear freshness policy.

## Images

- First meaningful profile image may load eagerly/high priority.
- Secondary/offscreen images load lazily.
- Always reserve dimensions/aspect ratio to avoid layout shifts.
- Production media should eventually use CDN-sized derivatives instead of original uploads.
- Keep useful alt text; optimization never removes accessibility.

## Measurement

For material UI changes inspect:

- production bundle output/chunks;
- Lighthouse/Web Vitals when a browser environment is available;
- network request count for discovery/matches/messages;
- long tasks or repeated rendering during swipe/chat interaction.
