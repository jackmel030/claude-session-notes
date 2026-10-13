# session-notes

[繁體中文](README.md) | **English**

A sidebar sticky-notes mod for Claude Code: jot down notes for the current session, then edit, delete or collapse them.

```
┌──────────────────────────┐
│ New note                  │
│ Title [optional     ]     │
│ Body  [press Enter  ]     │
└──────────────────────────┘
2 notes [ Expand all ] [ Collapse all ]

╭──────────────────────────╮
│ ▾ 1. Groceries     ✎  ✕  │
│ Milk, eggs                │
╰──────────────────────────╯
╭──────────────────────────╮
│ ▸ 2. Reply to MR   ✎  ✕  │
╰──────────────────────────╯
```

The interface text is in Traditional Chinese; the sketch above is translated for reference.

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
| Collapse the panel | Press `◂ 收合` at the panel's top right, or type `/notes` |
| Expand the panel | Press `▸ 記事 N 則` above the prompt, or type `/notes` |
| Add | Fill in a title (optional) and a body, press Enter in either field |
| Collapse / expand one note | Press `▸` / `▾` on its title row |
| Collapse / expand all | Press `[ 全部收合 ]` / `[ 全部展開 ]` |
| Edit | Press `✎`, then Enter or `[ 儲存 ]` to save; saving with both fields empty deletes the note |
| Delete | Press `✕` (no confirmation) |
| Keyboard | `ctrl+x tab` to focus the panel, Tab to move, ↑↓ to scroll, Esc to return to the prompt |

- In fullscreen the panel docks beside the transcript; otherwise it sits above the prompt. Opening automatically needs a terminal at least 144 columns wide; narrower terminals show the expand row instead.
- Notes live in the current session only and are cleared when it ends.

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

Disable: `/plugin` → Installed tab → toggle it off.
