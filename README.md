# 💰 記帳工具 — Google 試算表串接版

個人記帳工具，以純前端（HTML + CSS + JavaScript）實作，透過 **Google OAuth 2.0** 直接讀寫你自己的 Google 試算表，無需後端伺服器。

---

## 📁 專案結構

```
AI-coding-sample-Expense-Tracker2026/
├── index.html   # 頁面結構
├── styles.css   # 樣式（輕快暖系翠綠風格）
├── app.js       # 所有邏輯：OAuth、Sheets API、UI 渲染
└── README.md    # 本說明文件
```

---

## 🚀 快速開始

### 1. 準備 Google 試算表

在你的 Google 試算表中建立兩個工作表：

**工作表一：`記帳紀錄`**

| ID            | Date       | Type | Category | Amount | Description | Payment                            |
| ------------- | ---------- | ---- | -------- | ------ | ----------- | ---------------------------------- |
| （timestamp） | 2026-01-01 | 收入 | 其他雜項 | 55000  | 1 月份薪資  | 簽帳金融卡 (Debit Card / ATM 轉帳) |
| ...           | ...        | 支出 | 餐飲食品 | 120    | 早餐店蛋餅  | 現金 (Cash)                        |

**工作表二：`欄位表`**

| Type     | Category | Payment                                  |
| -------- | -------- | ---------------------------------------- |
| 支出     | 餐飲食品 | 現金 (Cash)                              |
| 收入     | 交通運輸 | 信用卡 (Credit Card)                     |
| （空白） | 居家生活 | 簽帳金融卡 (Debit Card / ATM 轉帳)       |
|          | 休閒娛樂 | 電子支付 (LINE Pay, Apple Pay, 街口支付) |
|          | 學習成長 | 電子票證 (悠遊卡, 一卡通)                |
|          | 醫療保健 |                                          |
|          | 購物服飾 |                                          |
|          | 其他雜項 |                                          |

> **提示**：`Type` 欄留白表示該選項「支出」與「收入」共用。

---

### 2. 申請 Google OAuth Client ID

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立（或選擇）一個專案
3. 啟用 **Google Sheets API**：
   - 搜尋「Google Sheets API」→ 啟用
4. 建立 OAuth 憑證：
   - 前往「API 和服務」→「憑證」→「建立憑證」→「OAuth 2.0 用戶端 ID」
   - 應用程式類型選「**網路應用程式**」
   - 在「**授權的 JavaScript 來源**」加入：
     ```
     http://127.0.0.1:5500
     ```
5. 複製產生的 **用戶端 ID（Client ID）**

---

### 3. 填入設定（`app.js` 開頭）

開啟 `app.js`，找到最上方的 `CONFIG` 物件並填入：

```js
const CONFIG = {
  CLIENT_ID: "your-client-id.apps.googleusercontent.com", // ← 貼上 Client ID
  SPREADSHEET_ID: "your-spreadsheet-id", // ← 貼上試算表 ID

  SHEET_RECORDS: "記帳紀錄", // 工作表名稱（與分頁標籤一致）
  SHEET_FIELDS: "欄位表",

  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
};
```

**如何取得 `SPREADSHEET_ID`？**

試算表網址格式如下，複製 `{ID}` 的部分：

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

---

### 4. 啟動本地伺服器

使用 VS Code 的 **Live Server** 擴充套件：

1. 安裝 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. 在 VS Code 中開啟專案資料夾
3. 右鍵點選 `index.html` → **Open with Live Server**
4. 瀏覽器自動開啟 `http://127.0.0.1:5500`

> ⚠️ Google OAuth 不允許直接開啟 `file://` 路徑，必須透過本地 HTTP 伺服器（Live Server）存取。

---

## 🎯 功能

| 功能           | 說明                                         |
| -------------- | -------------------------------------------- |
| 🔐 Google 登入 | 透過 OAuth 2.0 授權，安全存取個人試算表      |
| ✏️ 新增記帳    | 填寫日期、類型、分類、付款方式、金額、說明   |
| 📊 每月概覽    | 顯示當月收入、支出、結餘，以及支出分類長條圖 |
| 📋 本月明細    | 表格列出當月所有帳務，收入/支出以顏色區分    |
| 📅 切換月份    | 支援 `‹` `›` 按鈕快速切換，或點擊標籤透過原生選擇器跳轉任意月份 |

---

## 🗂 資料欄位說明

| 欄位          | 格式              | 說明                     |
| ------------- | ----------------- | ------------------------ |
| `ID`          | 數字（timestamp） | 自動產生，作為唯一識別碼 |
| `Date`        | `YYYY-MM-DD`      | 記帳日期                 |
| `Type`        | `收入` / `支出`   | 類型，固定兩個選項       |
| `Category`    | 文字              | 從「欄位表」動態讀取     |
| `Amount`      | 整數              | 金額（新台幣）           |
| `Description` | 文字              | 說明描述                 |
| `Payment`     | 文字              | 從「欄位表」動態讀取     |

---

## 🛠 技術架構

- **純前端**：HTML5 + Vanilla CSS + Vanilla JavaScript（無框架、無打包工具）
- **Google Identity Services (GIS)**：OAuth 2.0 Token 授權
- **Google Sheets API v4**：直接透過 REST API 讀寫試算表
- **設計**：輕快暖系翠綠主題 + 現代化卡片陰影 + Google Fonts（Inter + Noto Sans TC）

---

## ❓ 常見問題

**Q：登入時出現「redirect_uri_mismatch」錯誤？**

> 請確認 Google Cloud Console 的「授權的 JavaScript 來源」已加入 `http://127.0.0.1:5500`。

**Q：登入後顯示「API 錯誤 403」？**

> 請確認已在 Google Cloud Console 啟用「Google Sheets API」。

**Q：分類與付款方式的下拉選單是空的？**

> 請確認試算表中有「欄位表」工作表，且名稱與 `app.js` 的 `SHEET_FIELDS` 設定一致。

**Q：可以部署到正式環境嗎？**

> 可以，但需在 Google Cloud Console 的授權來源中加入你的正式網域（例如 `https://your-domain.com`），並在 OAuth 同意畫面完成驗證。
