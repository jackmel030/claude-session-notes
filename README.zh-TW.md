# session-notes

[English](README.md) | **繁體中文**

Claude Code 的側邊欄記事便籤（mod）：在目前的 session 裡隨手記事，可新增、編輯、刪除、收合。

**展開時**（全螢幕下停靠在對話旁）：

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
│ │ ▾ 1. 採買                       ✎  ✕ │ │
│ │ 牛奶、雞蛋                           │ │
│ ╰──────────────────────────────────────╯ │
│                                          │
│ ╭──────────────────────────────────────╮ │
│ │ ▸ 2. 回覆 MR                    ✎  ✕ │ │
│ ╰──────────────────────────────────────╯ │
└──────────────────────────────────────────┘
```

**收合時**（prompt 上方只留一行，按一下或用快捷鍵展開）：

```
▸ Notes (2) click to expand
────────────────────────────────────────────
> _
```

介面文字為英文；記事內容可輸入任何語言。

## 需求

Claude Code 2.1.287 以上（`claude --version` 確認，`claude update` 升級）。

## 安裝

在 Claude Code 的 prompt 輸入：

```
/plugin install session-notes --marketplace jackmel030/claude-session-notes
```

詢問是否加入 marketplace 時按 `y`，scope 選 user（預設）即可。

## 使用

| 動作 | 操作 |
| --- | --- |
| 開啟便籤 | 每個 session 開始時自動打開 |
| 收合面板 | 按面板右上 `◂ Collapse`、輸入 `/notes`，或按快捷鍵 |
| 展開面板 | 按 prompt 上方的 `▸ Notes (N)`、輸入 `/notes`，或按快捷鍵 |
| 新增 | 填標題（選填）與內容，在任一欄按 Enter；超出欄寬的文字會在欄位下方換行顯示全文 |
| 收合／展開單則 | 按標題列 `▸` / `▾` |
| 全部收合／展開 | 按 `[ Collapse all ]` / `[ Expand all ]` |
| 編輯 | 按 `✎`，改完按 Enter 或 `[ Save ]`；標題與內容都清空再存等於刪除 |
| 刪除 | 按 `✕`（不再確認） |
| 鍵盤操作便籤 | `ctrl+x tab` 進入，Tab 移動、↑↓ 捲動，Esc 回到 prompt |

- 終端機全螢幕時便籤停靠在側邊，否則顯示在 prompt 上方。自動打開需要終端寬度 ≥ 144 欄，較窄時改顯示展開列。
- 記事只存在當下 session，關閉後清空。

## 快捷鍵（選用）

在 `~/.claude/keybindings.json` 的 `Global` 區塊加一行，就能用 `ctrl+x ctrl+n` 切換面板收合／展開：

```json
{
  "context": "Global",
  "bindings": {
    "ctrl+x ctrl+n": "app:cycleDiffBase"
  }
}
```

- 已有 `Global` 區塊就把這一行併進去，不要整段覆蓋；改完重開 session 生效。
- 組合鍵兩下都帶 `ctrl`，中文輸入法下也能用（不帶修飾鍵的字母會被輸入法攔去組字）。
- 原理：便籤的收合／展開按鈕掛在 `app:cycleDiffBase` 這個動作上，引擎沒在處理它時就交給便籤；開著 `/diff` 面板時這組鍵會改為切換 diff 比較基準。

## 開發

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

停用：`/plugin` → Installed 分頁切換開關。
