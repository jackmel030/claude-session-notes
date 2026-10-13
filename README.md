# session-notes

Claude Code 的側邊欄記事便籤（mod）：在目前的 session 裡隨手記事，可新增、編輯、刪除、收合。

```
┌──────────────────────────┐
│ 新增記事                  │
│ 標題 [選填          ]     │
│ 內容 [輸入後按 Enter]     │
└──────────────────────────┘
共 2 則 [ 全部展開 ] [ 全部收合 ]

╭──────────────────────────╮
│ ▾ 1. 採買          ✎  ✕  │
│ 牛奶、雞蛋                │
╰──────────────────────────╯
╭──────────────────────────╮
│ ▸ 2. 回覆 MR       ✎  ✕  │
╰──────────────────────────╯
```

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
| 收合面板 | 按面板右上 `◂ 收合`，或輸入 `/notes` |
| 展開面板 | 按 prompt 上方的 `▸ 記事 N 則`，或輸入 `/notes` |
| 新增 | 填標題（選填）與內容，在任一欄按 Enter |
| 收合／展開單則 | 按標題列 `▸` / `▾` |
| 全部收合／展開 | 按 `[ 全部收合 ]` / `[ 全部展開 ]` |
| 編輯 | 按 `✎`，改完按 Enter 或 `[ 儲存 ]`；標題與內容都清空再存等於刪除 |
| 刪除 | 按 `✕`（不再確認） |
| 鍵盤操作便籤 | `ctrl+x tab` 進入，Tab 移動、↑↓ 捲動，Esc 回到 prompt |

- 終端機全螢幕時便籤停靠在側邊，否則顯示在 prompt 上方。自動打開需要終端寬度 ≥ 144 欄，較窄時改顯示展開列。
- 記事只存在當下 session，關閉後清空。

## 開發

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

停用：`/plugin` → Installed 分頁切換開關。
