/* =============================================================
   ★ 設定區：請填入你自己的 Google OAuth Client ID 與試算表 ID
============================================================= */
const CONFIG = {
  // 1. Google Cloud Console → OAuth 2.0 用戶端 ID
  CLIENT_ID: "1042838511340-ct3qutc6pf8g1sp1og9243b1lg8r40n4.apps.googleusercontent.com",                           // ← 填入你的 Client ID

  // 2. Google 試算表網址中的 ID (spreadsheets/d/{ID}/edit)
  SPREADSHEET_ID: "1gl7JAWEikdYZMr8685KQP-u5nJodTqZgv0_N9mVQMDk",                      // ← 填入你的試算表 ID

  // 工作表名稱 (與試算表底部分頁名稱相同)
  SHEET_RECORDS: "記帳紀錄",
  SHEET_FIELDS:  "欄位表",

  // OAuth 授權範圍
  SCOPES: "https://www.googleapis.com/auth/spreadsheets"
};

/* =============================================================
   全域狀態
============================================================= */
let accessToken = "";
let tokenClient = null;
let gisReady = false;

let fieldOptions = {
  typeToCategories: {},
  typeToPayments:   {}
};

let currentMonth = "";
let records = [];

/* =============================================================
   DOM 取得
============================================================= */
const $ = (sel) => document.querySelector(sel);

const btnSignIn   = $("#btnSignIn");
const btnSignOut  = $("#btnSignOut");
const btnReload   = $("#btnReload");
const btnRefresh  = $("#btnRefresh");
const btnSubmit   = $("#btnSubmit");
const btnPrevMonth = $("#btnPrevMonth");
const btnNextMonth = $("#btnNextMonth");
const statusEl    = $("#status");

const recordForm  = $("#recordForm");
const fDate       = $("#fDate");
const fType       = $("#fType");
const fCategory   = $("#fCategory");
const fPayment    = $("#fPayment");
const fAmount     = $("#fAmount");
const fDescription = $("#fDescription");

const monthPicker      = $("#monthPicker");
const monthLabel       = $("#monthLabel");
const sumIncome        = $("#sumIncome");
const sumExpense       = $("#sumExpense");
const sumNet           = $("#sumNet");
const categoryBreakdown = $("#categoryBreakdown");
const recordsTbody     = $("#recordsTbody");

const userInfo  = $("#userInfo");
const userAvatar = $("#userAvatar");
const userName  = $("#userName");

/* =============================================================
   初始化（DOM 就緒後立即執行）
============================================================= */
initDefaults();
bindEvents();
setUiSignedOut();
setStatus("等待 Google 登入元件載入中…", false);

/* =============================================================
   GIS onload 回呼（由 index.html script 標籤的 onload 觸發）
============================================================= */
window.onGisLoaded = function onGisLoaded() {
  gisReady = true;

  if (!window.google?.accounts?.oauth2) {
    setStatus("Google 登入元件載入異常，請確認網路或 CSP 設定", true);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: async (resp) => {
      if (!resp?.access_token) {
        setStatus("登入失敗，未取得 access token", true);
        return;
      }
      accessToken = resp.access_token;
      setStatus("登入成功，正在讀取資料…", false);
      await afterSignedIn();
    }
  });

  btnSignIn.disabled = false;
  setStatus("已就緒，請點擊「登入 Google」開始使用", false);
};

/* =============================================================
   預設值
============================================================= */
function initDefaults() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");

  fDate.value   = `${yyyy}-${mm}-${dd}`;
  currentMonth  = `${yyyy}-${mm}`;
  monthPicker.value = currentMonth;
  syncMonthLabel();

  // 預設 fType 的 value（確保對應 select 第一個選項）
  fType.value = "支出";
}

/* =============================================================
   事件綁定
============================================================= */
function bindEvents() {
  btnSignIn.addEventListener("click", () => {
    if (!gisReady || !tokenClient) {
      setStatus("Google 登入元件尚未就緒，請稍後再試", true);
      return;
    }
    if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID.trim() === "") {
      setStatus("請先在 app.js 的 CONFIG 中填入 CLIENT_ID", true);
      return;
    }
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.trim() === "") {
      setStatus("請先在 app.js 的 CONFIG 中填入 SPREADSHEET_ID", true);
      return;
    }
    tokenClient.requestAccessToken({ prompt: "consent" });
  });

  btnSignOut.addEventListener("click", () => {
    if (!accessToken) { setStatus("尚未登入", false); return; }

    if (window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(accessToken, () => {
        resetAll();
        setStatus("已成功登出", false);
      });
    } else {
      resetAll();
      setStatus("已成功登出", false);
    }
  });

  fType.addEventListener("change", () => {
    applySelectOptionsForType(fType.value);
  });

  monthPicker.addEventListener("change", async () => {
    currentMonth = monthPicker.value;
    syncMonthLabel();
    await reloadMonth();
  });

  btnPrevMonth.addEventListener("click", () => navigateMonth(-1));
  btnNextMonth.addEventListener("click", () => navigateMonth(+1));

  btnReload.addEventListener  ("click", reloadMonth);
  btnRefresh.addEventListener ("click", reloadMonth);

  recordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitRecord();
  });
}

/* =============================================================
   重置
============================================================= */
function resetAll() {
  accessToken = "";
  records = [];
  fieldOptions = { typeToCategories: {}, typeToPayments: {} };

  fCategory.innerHTML = "";
  fPayment.innerHTML  = "";

  renderTable([]);
  renderSummary([]);
  renderBreakdown([]);
  setUserDisplay(null);
  setUiSignedOut();
}

/* =============================================================
   UI 啟停
============================================================= */
function setUiSignedIn() {
  btnSignIn.disabled    = true;
  btnSignOut.disabled   = false;
  btnReload.disabled    = false;
  btnRefresh.disabled   = false;
  btnSubmit.disabled    = false;
  monthPicker.disabled  = false;
  btnPrevMonth.disabled = false;
  btnNextMonth.disabled = false;
}

function setUiSignedOut() {
  btnSignIn.disabled    = false;
  btnSignOut.disabled   = true;
  btnReload.disabled    = true;
  btnRefresh.disabled   = true;
  btnSubmit.disabled    = true;
  monthPicker.disabled  = true;
  btnPrevMonth.disabled = true;
  btnNextMonth.disabled = true;
}

/* =============================================================
   User 資訊顯示（從 JWT id_token 解析，若無則用預設）
============================================================= */
function setUserDisplay(name) {
  if (!name) {
    userInfo.classList.remove("visible");
    userAvatar.textContent = "?";
    userName.textContent   = "未登入";
    return;
  }
  userAvatar.textContent = name.charAt(0).toUpperCase();
  userName.textContent   = name;
  userInfo.classList.add("visible");
}

/* =============================================================
   登入後流程
============================================================= */
async function afterSignedIn() {
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.trim() === "") {
    setStatus("請先在 app.js 填入 SPREADSHEET_ID", true);
    return;
  }

  try {
    setUiSignedIn();
    setUserDisplay("Google 用戶");   // 基本顯示；若有 id_token 可再解析

    setStatus(`<span class="spinner"></span>讀取欄位表中…`, false, true);
    await loadFieldTable();
    applySelectOptionsForType(fType.value);

    await reloadMonth();
  } catch (err) {
    console.error(err);
    setStatus(`初始化失敗：${err.message || String(err)}`, true);
  }
}

/* =============================================================
   月份導航輔助
============================================================= */
function syncMonthLabel() {
  if (!monthLabel) return;
  if (!currentMonth) { monthLabel.textContent = "選擇月份"; return; }
  const [y, m] = currentMonth.split("-");
  monthLabel.textContent = `${y} / ${m}`;
}

async function navigateMonth(delta) {
  if (!accessToken) return;
  const [y, m] = currentMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  currentMonth      = `${yyyy}-${mm}`;
  monthPicker.value = currentMonth;
  syncMonthLabel();
  await reloadMonth();
}

/* =============================================================
   Google Sheets API 工具函式
============================================================= */
async function apiFetch(url, options = {}) {
  if (!accessToken) throw new Error("尚未登入或沒有 access token");

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type",  "application/json");

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API 錯誤 ${res.status}：${text || res.statusText}`);
  }
  return res.json();
}

function valuesGetUrl(rangeA1) {
  const range = encodeURIComponent(rangeA1);
  return `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${range}`;
}

function valuesAppendUrl(rangeA1) {
  const range = encodeURIComponent(rangeA1);
  return `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
}

/* =============================================================
   讀取「欄位表」
============================================================= */
async function loadFieldTable() {
  const range = `${CONFIG.SHEET_FIELDS}!A:C`;
  const data  = await apiFetch(valuesGetUrl(range), { method: "GET" });
  const rows  = data.values || [];

  const types = ["支出", "收入"];
  const typeToCategories = { 支出: new Set(), 收入: new Set() };
  const typeToPayments   = { 支出: new Set(), 收入: new Set() };

  for (let i = 1; i < rows.length; i++) {
    const [tRaw, cRaw, pRaw] = rows[i];
    const t = (tRaw || "").trim();
    const c = (cRaw || "").trim();
    const p = (pRaw || "").trim();

    // 若 Type 空白 → 兩種類型都加入
    const targets = types.includes(t) ? [t] : types;

    if (c) targets.forEach((tt) => typeToCategories[tt].add(c));
    if (p) targets.forEach((tt) => typeToPayments[tt].add(p));
  }

  // 至少一個預設值
  types.forEach((t) => {
    if (typeToCategories[t].size === 0) typeToCategories[t].add("其他雜項");
    if (typeToPayments[t].size === 0)   typeToPayments[t].add("現金 (Cash)");
  });

  fieldOptions = { typeToCategories, typeToPayments };
  setStatus("欄位表已載入 ✓", false);
}

function applySelectOptionsForType(type) {
  const cats = Array.from(fieldOptions.typeToCategories[type] || []);
  const pays = Array.from(fieldOptions.typeToPayments[type]   || []);

  fCategory.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  fPayment.innerHTML  = pays.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
}

/* =============================================================
   讀取「記帳紀錄」並依月份篩選
============================================================= */
async function reloadMonth() {
  if (!accessToken) { setStatus("請先登入", true); return; }

  try {
    setStatus(`<span class="spinner"></span>讀取記帳紀錄中…`, false, true);
    renderLoadingRows();

    const range = `${CONFIG.SHEET_RECORDS}!A:G`;
    const data  = await apiFetch(valuesGetUrl(range), { method: "GET" });
    const rows  = data.values || [];

    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      const [id, date, type, category, amount, desc, payment] = rows[i];
      if (!date) continue;
      parsed.push({
        ID:          id || "",
        Date:        (date     || "").trim(),
        Type:        (type     || "").trim(),
        Category:    (category || "").trim(),
        Amount:      Number(amount || 0),
        Description: (desc     || "").trim(),
        Payment:     (payment  || "").trim()
      });
    }

    records = filterByMonth(parsed, currentMonth);
    renderTable(records);
    renderSummary(records);
    renderBreakdown(records);

    setStatus(`本月共 ${records.length} 筆紀錄`, false);
  } catch (err) {
    console.error(err);
    setStatus(`讀取失敗：${err.message || String(err)}`, true);
  }
}

function filterByMonth(items, yyyyMm) {
  if (!yyyyMm) return items;
  return items.filter((r) => String(r.Date).startsWith(yyyyMm));
}

/* =============================================================
   新增一筆記帳
============================================================= */
async function submitRecord() {
  if (!accessToken) { setStatus("請先登入", true); return; }

  const date      = fDate.value;
  const type      = fType.value;
  const category  = fCategory.value;
  const payment   = fPayment.value;
  const amountNum = Number(fAmount.value);
  const desc      = fDescription.value.trim();

  if (!date) return setStatus("請選擇日期", true);
  if (!["收入", "支出"].includes(type)) return setStatus("類型只能是「收入」或「支出」", true);
  if (!Number.isFinite(amountNum) || amountNum < 0) return setStatus("金額需為非負整數", true);
  if (!desc) return setStatus("請填寫說明", true);

  const id = String(Date.now());
  const row = [id, date, type, category, amountNum, desc, payment];

  try {
    setStatus(`<span class="spinner"></span>寫入試算表中…`, false, true);
    btnSubmit.disabled = true;

    const appendRange = `${CONFIG.SHEET_RECORDS}!A:G`;
    await apiFetch(valuesAppendUrl(appendRange), {
      method: "POST",
      body: JSON.stringify({ values: [row] })
    });

    setStatus("✅ 新增成功！", false);
    fAmount.value = "";
    fDescription.value = "";

    await reloadMonth();
  } catch (err) {
    console.error(err);
    setStatus(`新增失敗：${err.message || String(err)}`, true);
  } finally {
    btnSubmit.disabled = false;
  }
}

/* =============================================================
   UI 渲染：表格
============================================================= */
function renderTable(items) {
  if (items.length === 0) {
    recordsTbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          本月尚無記帳資料
        </div>
      </td></tr>
    `;
    return;
  }

  const sorted = items.slice().sort((a, b) => (a.Date > b.Date ? 1 : -1));
  const html = sorted.map((r) => {
    const isIncome  = r.Type === "收入";
    const badgeCls  = isIncome ? "income" : "expense";
    const typeLabel = isIncome ? "💰 收入" : "💸 支出";
    const amtCls    = isIncome ? "amount-income" : "amount-expense";
    const sign      = isIncome ? "+" : "-";
    const amt       = formatMoney(r.Amount);

    return `
      <tr>
        <td>${escapeHtml(r.Date)}</td>
        <td><span class="badge ${badgeCls}">${typeLabel}</span></td>
        <td>${escapeHtml(r.Category)}</td>
        <td class="right ${amtCls}">${sign}${escapeHtml(amt)}</td>
        <td>${escapeHtml(r.Description)}</td>
        <td style="color:var(--text-2)">${escapeHtml(r.Payment)}</td>
      </tr>
    `;
  }).join("");

  recordsTbody.innerHTML = html;
}

/* 讀取中的骨架列 */
function renderLoadingRows() {
  recordsTbody.innerHTML = Array(4).fill(`
    <tr class="loading-row">
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
    </tr>
  `).join("");
}

/* =============================================================
   UI 渲染：每月概覽
============================================================= */
function renderSummary(items) {
  let income  = 0;
  let expense = 0;

  for (const r of items) {
    const amt = Number(r.Amount || 0);
    if (r.Type === "收入") income  += amt;
    if (r.Type === "支出") expense += amt;
  }

  const net = income - expense;

  sumIncome.textContent  = formatMoney(income);
  sumExpense.textContent = formatMoney(expense);
  sumNet.textContent     = formatMoney(Math.abs(net));
  sumNet.className       = "big " + (net >= 0 ? "positive" : "negative");
  sumNet.textContent     = (net < 0 ? "-" : "+") + formatMoney(Math.abs(net));
}

/* =============================================================
   UI 渲染：支出分類統計
============================================================= */
function renderBreakdown(items) {
  const map = new Map();
  let total = 0;

  for (const r of items) {
    if (r.Type !== "支出") continue;
    const key = r.Category || "未分類";
    const amt = Number(r.Amount || 0);
    total += amt;
    map.set(key, (map.get(key) || 0) + amt);
  }

  if (map.size === 0) {
    categoryBreakdown.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💤</div>
        本月尚無支出紀錄
      </div>
    `;
    return;
  }

  const list = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // 先渲染，再觸發動畫
  categoryBreakdown.innerHTML = list.map(([cat, amt]) => {
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    return `
      <div class="barRow">
        <div class="cat-label">${escapeHtml(cat)}</div>
        <div class="bar-track">
          <div class="bar-fill" data-pct="${pct}" style="width:0%"></div>
        </div>
        <div class="bar-amt">
          ${escapeHtml(formatMoney(amt))}
          <div class="bar-pct">${pct}%</div>
        </div>
      </div>
    `;
  }).join("");

  // 動畫：下一幀才設定真實 width，讓 CSS transition 生效
  requestAnimationFrame(() => {
    categoryBreakdown.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = el.dataset.pct + "%";
    });
  });
}

/* =============================================================
   工具函式
============================================================= */
/**
 * @param {string} msg
 * @param {boolean} isError
 * @param {boolean} [isHtml]  若為 true 則使用 innerHTML（僅內部用）
 */
function setStatus(msg, isError, isHtml = false) {
  if (isHtml) {
    statusEl.innerHTML = msg;
  } else {
    statusEl.textContent = msg;
  }
  statusEl.style.color = isError ? "var(--danger)" : "var(--text-2)";
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&",  "&amp;")
    .replaceAll("<",  "&lt;")
    .replaceAll(">",  "&gt;")
    .replaceAll('"',  "&quot;")
    .replaceAll("'",  "&#039;");
}