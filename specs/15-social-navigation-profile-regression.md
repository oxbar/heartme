# Social navigation & profile editor regression fixes

## Scope

This incremental fix is applied after `heartme-SOCIAL-UX-CHAT-PROFILE-v2-AFTER-MATCH-DISCOVERY.patch`.

## Matches / Messages navigation

The desktop sidebar keeps the last known-good match collection while the user navigates between `/app/matches` and `/app/messages`.

Rules:

- A route change must never clear already loaded matches because a background refresh failed.
- Concurrent social refreshes are deduplicated.
- On the Messages tab, a compact horizontal `Seus matches` strip remains visible above the conversation list.
- The full Matches tab continues to render the regular match grid.
- A successful backend response is authoritative; transient HTTP failures retain the previous UI state instead of replacing it with an empty array.

## Profile editor recovery

The profile editor relies on Lucide icons registered at application bootstrap. Every icon referenced by static or dynamic profile/social UI must be present in the provider set.

This regression registers the missing icons used by autosave, interests, notifications and social actions, including:

- `cloud`
- `cloud-check`
- `music`
- `users`
- `heart-off`
- `trash-2`

Missing icon providers must not interrupt Angular rendering while an existing profile is being hydrated.

## Regression tests

- `app-sidebar.component.spec.ts` verifies that a transient refresh failure does not discard an already loaded match and that switching visual mode to Messages preserves the match state.
- `profile-edit.page.spec.ts` verifies that the persisted profile, discovery preferences and interests are hydrated into the editor model.
