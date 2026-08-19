# UI/UX Specification

## Brand intent

Himeros should feel mature, calm, safe and premium rather than game-like.

## Visual system

- primary: blue;
- neutral light surfaces;
- restrained elevation;
- rounded but not cartoonish cards;
- typography with tight display headings and readable body;
- status color never used without text/icon context.

## Main screens

1. Marketing landing.
2. Login.
3. Registration.
4. Onboarding.
5. Discovery cards.
6. Matches.
7. Conversation list.
8. Chat.
9. Own profile.
10. Edit profile.
11. Public profile.
12. Premium.
13. Notifications.
14. Safety.
15. Settings.
16. Not found.

## Responsive behavior

Desktop:
- persistent sidebar;
- content max width;
- multi-column discovery/profile surfaces.

Mobile:
- fixed bottom navigation;
- single-column cards;
- chat consumes available viewport;
- actions remain thumb-friendly.

## Interaction rules

- destructive actions ask for confirmation where loss is meaningful;
- optimistic UI allowed only where rollback is implemented;
- form errors are actionable;
- backend errors are normalized into user-safe copy;
- never reveal moderation/security internals unnecessarily;
- loading must not cause layout instability where skeletons are practical.

## Future design-system extraction

Once component repetition justifies it:
- Button
- Field
- Dialog
- Toast
- Avatar
- ProfileCard
- EmptyState
- LoadingSkeleton
- Navigation
- SafetyAction

Do not create a large component library before repeated use exists.
