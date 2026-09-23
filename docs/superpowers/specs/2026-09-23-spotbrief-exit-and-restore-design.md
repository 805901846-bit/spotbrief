# SpotBrief Exit and Restore Design

## Goal

Give users an obvious way to leave SpotBrief from the compact taskbar while guaranteeing that abandoning a session restores the host page to its state before SpotBrief launched.

## Interaction

- Add a 28px close button immediately to the right of **生成任务书** in the compact taskbar.
- The button uses an `×` mark and the accessible name **关闭 SpotBrief**.
- Pressing `Escape` invokes the same exit flow, including while focus is inside an editor field.
- If the session has no selections, written requests, screenshots, or visual changes, exit immediately.
- If the session contains any of those changes, show an accessible confirmation dialog:
  - Title: **退出 SpotBrief？**
  - Message: **本次所有修改将恢复到打开前的状态。**
  - Secondary action: **取消**
  - Primary destructive action: **退出并恢复**
- Cancel returns focus to the control that initiated exit and preserves the full session.
- Confirm restores the page, removes all SpotBrief UI and event listeners, and discards the current session.

## Restore Semantics

Confirmed exit must:

1. Undo every visual command in reverse order so authored transforms, inline styles, and intrinsic dimensions return to their pre-session values.
2. Remove overlays, numbered markers, snap guides, the compact editor, settings UI, screenshot state, and taskbar.
3. Remove global pointer, keyboard, hover, and message listeners owned by SpotBrief.
4. Clear in-memory selections, notes, history, and draft data by destroying the current runtime instance.

Previously generated or copied task-book content outside the runtime is unaffected.

## Implementation Boundary

- Reuse the existing runtime `destroy()` path rather than adding a second cleanup system.
- Extend the command history with a session rollback operation that undoes every applied command before destruction.
- Keep confirmation state inside the existing Shadow DOM so host-page styles cannot affect it.
- Do not use `window.confirm`; the dialog must match the compact SpotBrief interface and provide explicit focus handling.
- Synchronize the install-page product preview by placing a small decorative close control after its generate button.

## Accessibility

- The confirmation uses `role="dialog"`, `aria-modal="true"`, an accessible title, and an accessible description.
- Opening the dialog moves focus to **取消**.
- `Tab` remains within the two dialog actions while it is open.
- `Escape` inside the open dialog cancels it rather than reopening or confirming it.
- The close button has a visible keyboard focus state and a minimum 28px visual size; its taskbar hit area remains at least 34px.

## Tests

- Closing an untouched session removes the SpotBrief host immediately.
- Closing a changed session opens the confirmation dialog.
- Cancelling preserves UI, history, and page changes.
- Confirming restores changed styles and geometry, then removes the host.
- Pressing `Escape` follows the same guarded flow.
- `Escape` inside the confirmation dialog cancels it.
- The install-page preview contains the close control after **生成任务书**.

