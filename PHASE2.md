# NanoClaw UI — Phase 2 Roadmap

## 1. A2UI / Canvas
Agent-generated visual output — rich, interactive content rendered in the chat beyond plain text. Think charts, diagrams, forms, mini-apps that the agent can produce dynamically.

**Priority:** Must-have (Dave: "not MVP but is a must have")

## 2. LLM-Powered Skill Creation
Define new skills directly in the UI via natural language. User describes what they want, LLM generates the skill YAML/markdown, previews it, and installs it — no CLI or file editing needed.

## 3. Multi-User Onboarding
Data model is already multi-user. Phase 2 adds:
- Invite flow (email/link)
- Role-based permissions (admin, member, viewer)
- Family/team account support
- Per-user session isolation

## 4. Light Mode
Dark mode is default and primary. Light mode as a toggle for users who prefer it. Design tokens are already structured for theming — implementation is mostly a second palette pass.

## 5. Deeper Marketplace UX
Core search + install shipped in Phase 1. Phase 2 adds:
- Featured / curated skills
- Ratings and reviews
- Skill categories and tags
- "Popular this week" section
- Skill detail page with README preview

## 6. Mobile Polish
Responsive layout shipped in Phase 1. Phase 2 focuses on:
- Touch-optimized interactions
- Swipe gestures (navigation, dismiss)
- Mobile-specific layout refinements
- PWA support (installable, offline shell)
