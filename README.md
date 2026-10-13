# session-notes

**English** | [繁體中文](README.zh-TW.md)

Sidebar sticky notes for the current Claude Code session: add, edit, delete and collapse notes.

**Expanded** (docked beside the transcript in fullscreen):

```
┌─ Notes ──────────────────────────────────┐
│                               ◂ Collapse │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ New note                             │ │
│ │ Title [optional               ]      │ │
│ │ Body  [type, then Enter to add]      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ 2 notes [ Expand all ] [ Collapse all ]  │
│                                          │
│ ╭──────────────────────────────────────╮ │
│ │ ▾ 1. Groceries                  ✎  ✕ │ │
│ │ Milk, eggs                           │ │
│ ╰──────────────────────────────────────╯ │
│                                          │
│ ╭──────────────────────────────────────╮ │
│ │ ▸ 2. Reply to MR                ✎  ✕ │ │
│ ╰──────────────────────────────────────╯ │
└──────────────────────────────────────────┘
```

**Collapsed** (a one-line row above the prompt; click it or press the shortcut to expand):

```
▸ Notes (2) click to expand
────────────────────────────────────────────
> _
```

## Requirements

Claude Code 2.1.287 or later (check with `claude --version`, upgrade with `claude update`).

## Install

At the Claude Code prompt, type:

```
/plugin install session-notes --marketplace jackmel030/claude-session-notes
```

Answer `y` when asked to add the marketplace, then pick the user scope (the default).

## Usage

| Action | How |
| --- | --- |
| Open the notes | Opens automatically when a session starts |
| Collapse the panel | Press `◂ Collapse` at the panel's top right, type `/notes`, or use the shortcut |
| Expand the panel | Press `▸ Notes (N)` above the prompt, type `/notes`, or use the shortcut |
| Add | Fill in a title (optional) and a body, press Enter in either field |
| Collapse / expand one note | Press `▸` / `▾` on its title row |
| Collapse / expand all | Press `[ Collapse all ]` / `[ Expand all ]` |
| Edit | Press `✎`, then Enter or `[ Save ]` to save; saving with both fields empty deletes the note |
| Delete | Press `✕` (no confirmation) |
| Keyboard | `ctrl+x tab` to focus the panel, Tab to move, ↑↓ to scroll, Esc to return to the prompt |

- In fullscreen the panel docks beside the transcript; otherwise it sits above the prompt. Opening automatically needs a terminal at least 144 columns wide; narrower terminals show the expand row instead.
- Notes live in the current session only and are cleared when it ends.

## Shortcut (optional)

Add one line to the `Global` block of `~/.claude/keybindings.json` to toggle the panel with `ctrl+x ctrl+n`:

```json
{
  "context": "Global",
  "bindings": {
    "ctrl+x ctrl+n": "app:cycleDiffBase"
  }
}
```

- If you already have a `Global` block, merge the line into it rather than replacing it; restart the session to apply.
- Both keystrokes carry `ctrl`, so the chord also works with a CJK input method active (bare letters get captured by the IME for composition).
- How it works: the panel's collapse/expand buttons are attached to the `app:cycleDiffBase` action and receive it whenever the engine is not handling it; while the `/diff` panel is open, the chord cycles the diff base instead.

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

Disable: `/plugin` → Installed tab → toggle it off.
