## 2026-07-27 - [Destructive Async Button States]
**Learning:** Found that destructive operations (like deleting sessions) were missing loading feedback and proper disabled states, making the app feel unresponsive during API calls.
**Action:** When implementing destructive or async actions in this design system, standardise on adding `disabled:opacity-50`, `disabled:cursor-not-allowed`, and conditionally swapping the button text (e.g. `Deleting...`) while maintaining a `min-w-[70px]` to prevent layout shifting during the text swap.
