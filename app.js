// ===== Waggle Expense Tracker =====
const STORAGE_KEY = "waggle_expenses_v1";
const CATEGORY_KEY = "waggle_categories_v1";
const THEME_KEY = "waggle_theme_v1";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Other"];
const CATEGORY_COLORS = {
  Food: "#d6362e", Transport: "#f4b942", Housing: "#3f9d5c", Utilities: "#4a90d9",
  Entertainment: "#a860c9", Health: "#e0679b", Shopping: "#d99a1f", Other: "#7a8a99"
};
const FALLBACK_PALETTE = ["#d6362e", "#f4b942", "#3f9d5c", "#4a90d9", "#a860c9", "#e0679b", "#d99a1f", "#7a8a99", "#5ec2c9", "#c96a3a"];

function fmtMoney(n) {
  return "$" + Number(n || 0).toFixed(2);
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------- Storage ----------
function getExpenses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
}
function saveExpenses(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function getCategories() {
  try {
    const c = JSON.parse(localStorage.getItem(CATEGORY_KEY));
    if (Array.isArray(c) && c.length) return c;
  } catch (e) {}
  return DEFAULT_CATEGORIES.slice();
}
function saveCategories(list) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(list));
}
function categoryColor(cat, idx) {
  return CATEGORY_COLORS[cat] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------- Tabs ----------
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "reports") renderReports();
      if (btn.dataset.tab === "journal") renderJournal();
      if (btn.dataset.tab === "dashboard") renderDashboard();
    });
  });
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  document.body.dataset.theme = saved;
  updateThemeBtn();
  document.getElementById("themeToggle").addEventListener("click", () => {
    const cur = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = cur;
    localStorage.setItem(THEME_KEY, cur);
    updateThemeBtn();
    renderReports();
  });
}
function updateThemeBtn() {
  const btn = document.getElementById("themeToggle");
  btn.textContent = document.body.dataset.theme === "dark" ? "🌙 Dark" : "☀️ Light";
}

// ---------- Category selects ----------
function refreshCategorySelects() {
  const cats = getCategories();
  const catSel = document.getElementById("category");
  const filterSel = document.getElementById("filterCategory");
  const prevCat = catSel.value;
  const prevFilter = filterSel.value;
  catSel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  filterSel.innerHTML = `<option value="">All</option>` + cats.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (cats.includes(prevCat)) catSel.value = prevCat;
  if (cats.includes(prevFilter)) filterSel.value = prevFilter;
}

// ---------- Form ----------
function initForm() {
  document.getElementById("date").value = todayISO();
  const form = document.getElementById("expenseForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("amount").value);
    if (isNaN(amount) || amount < 0) { toast("Enter a valid amount"); return; }
    let category = document.getElementById("category").value;
    const newCat = document.getElementById("newCategory").value.trim();
    if (newCat) {
      category = newCat;
      const cats = getCategories();
      if (!cats.includes(newCat)) {
        cats.push(newCat);
        saveCategories(cats);
        refreshCategorySelects();
      }
    }
    const date = document.getElementById("date").value || todayISO();
    const notes = document.getElementById("notes").value.trim();
    const editId = document.getElementById("editId").value;

    let list = getExpenses();
    if (editId) {
      list = list.map((x) => (x.id === editId ? { ...x, amount, category, date, notes } : x));
      toast("Expense updated 🐾");
    } else {
      list.push({ id: uid(), amount, category, date, notes, createdAt: Date.now() });
      toast("Expense saved 🐾");
    }
    saveExpenses(list);
    resetForm();
    renderAll();
  });

  document.getElementById("cancelEdit").addEventListener("click", resetForm);
}
function resetForm() {
  document.getElementById("expenseForm").reset();
  document.getElementById("date").value = todayISO();
  document.getElementById("editId").value = "";
  document.getElementById("submitBtn").textContent = "🐾 Save Expense";
  document.getElementById("cancelEdit").style.display = "none";
}
function editExpense(id) {
  const item = getExpenses().find((x) => x.id === id);
  if (!item) return;
  document.getElementById("editId").value = item.id;
  document.getElementById("amount").value = item.amount;
  document.getElementById("category").value = item.category;
  document.getElementById("date").value = item.date;
  document.getElementById("notes").value = item.notes || "";
  document.getElementById("submitBtn").textContent = "🐾 Update Expense";
  document.getElementById("cancelEdit").style.display = "inline-block";
  document.querySelector('.tab-btn[data-tab="add"]').click();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  saveExpenses(getExpenses().filter((x) => x.id !== id));
  toast("Deleted");
  renderAll();
}
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;

// ---------- Dashboard ----------
function renderDashboard() {
  const list = getExpenses();
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const today = todayISO();

  const monthTotal = list.filter((x) => x.date.slice(0, 7) === monthKey).reduce((s, x) => s + x.amount, 0);
  const todayTotal = list.filter((x) => x.date === today).reduce((s, x) => s + x.amount, 0);
  const allTotal = list.reduce((s, x) => s + x.amount, 0);

  const catTotals = {};
  list.filter((x) => x.date.slice(0, 7) === monthKey).forEach((x) => {
    catTotals[x.category] = (catTotals[x.category] || 0) + x.amount;
  });
  const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  document.getElementById("statMonth").textContent = fmtMoney(monthTotal);
  document.getElementById("statToday").textContent = fmtMoney(todayTotal);
  document.getElementById("statTotal").textContent = fmtMoney(allTotal);
  document.getElementById("statTop").textContent = top ? top[0] : "—";

  const recent = list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8);
  const tbody = document.querySelector("#recentTable tbody");
  tbody.innerHTML = recent.map(rowHtml).join("");
  document.getElementById("recentEmpty").style.display = recent.length ? "none" : "block";
}

function rowHtml(x, withActions) {
  const actions = withActions
    ? `<td class="row-actions">
         <button class="btn small" onclick="editExpense('${x.id}')">✏️</button>
         <button class="btn small danger" onclick="deleteExpense('${x.id}')">🗑️</button>
       </td>`
    : "";
  return `<tr>
    <td>${x.date}</td>
    <td><span class="chip">${escapeHtml(x.category)}</span></td>
    <td>${escapeHtml(x.notes || "—")}</td>
    <td class="amount">${fmtMoney(x.amount)}</td>
    ${actions}
  </tr>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Journal ----------
function renderJournal() {
  refreshCategorySelects();
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;
  const cat = document.getElementById("filterCategory").value;

  let list = getExpenses();
  if (from) list = list.filter((x) => x.date >= from);
  if (to) list = list.filter((x) => x.date <= to);
  if (cat) list = list.filter((x) => x.category === cat);
  list = list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const tbody = document.querySelector("#journalTable tbody");
  tbody.innerHTML = list.map((x) => rowHtml(x, true)).join("");
  document.getElementById("journalEmpty").style.display = list.length ? "none" : "block";
}
function initJournalFilters() {
  ["filterFrom", "filterTo", "filterCategory"].forEach((id) =>
    document.getElementById(id).addEventListener("change", renderJournal)
  );
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("filterFrom").value = "";
    document.getElementById("filterTo").value = "";
    document.getElementById("filterCategory").value = "";
    renderJournal();
  });
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
}

function exportCsv() {
  const list = getExpenses().slice().sort((a, b) => a.date.localeCompare(b.date));
  const header = ["Date", "Category", "Notes", "Amount"];
  const rows = list.map((x) => [x.date, x.category, (x.notes || "").replace(/"/g, '""'), x.amount.toFixed(2)]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  downloadFile(csv, `waggle-expenses-${todayISO()}.csv`, "text/csv");
  toast("CSV exported ⬇️");
}
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Reports ----------
function renderReports() {
  const list = getExpenses();
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);

  const catTotals = {};
  list.filter((x) => x.date.slice(0, 7) === monthKey).forEach((x) => {
    catTotals[x.category] = (catTotals[x.category] || 0) + x.amount;
  });
  drawDonut(catTotals);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthTotals = months.map((m) => list.filter((x) => x.date.slice(0, 7) === m).reduce((s, x) => s + x.amount, 0));
  drawTrend(months, monthTotals);
}

function isLight() {
  return document.body.dataset.theme === "light";
}

function drawDonut(catTotals) {
  const canvas = document.getElementById("categoryChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 320;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + "px"; canvas.style.height = size + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const legend = document.getElementById("categoryLegend");

  if (!total) {
    ctx.fillStyle = isLight() ? "#0f1720" : "#f6f1e4";
    ctx.font = "700 16px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No spending this month yet 🐾", size / 2, size / 2);
    legend.innerHTML = "";
    return;
  }

  const cx = size / 2, cy = size / 2, rOuter = 140, rInner = 78;
  let start = -Math.PI / 2;
  legend.innerHTML = "";
  entries.forEach(([cat, val], i) => {
    const angle = (val / total) * Math.PI * 2;
    const color = categoryColor(cat, i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rOuter, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isLight() ? "#0f1720" : "#000";
    ctx.stroke();
    start += angle;

    const li = document.createElement("div");
    li.className = "legend-item";
    li.innerHTML = `<span class="swatch" style="background:${color}"></span> ${escapeHtml(cat)} — ${fmtMoney(val)} (${Math.round((val / total) * 100)}%)`;
    legend.appendChild(li);
  });

  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fillStyle = isLight() ? "#ffffff" : "#1c2836";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isLight() ? "#0f1720" : "#000";
  ctx.stroke();

  ctx.fillStyle = isLight() ? "#0f1720" : "#f6f1e4";
  ctx.textAlign = "center";
  ctx.font = "700 13px Nunito, sans-serif";
  ctx.fillText("This Month", cx, cy - 6);
  ctx.font = "800 18px 'Space Mono', monospace";
  ctx.fillText(fmtMoney(total), cx, cy + 16);
}

function drawTrend(months, totals) {
  const canvas = document.getElementById("trendChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 860, h = 260;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 60, r: 20, t: 20, b: 40 };
  const max = Math.max(...totals, 1);
  const barW = (w - pad.l - pad.r) / months.length * 0.55;
  const step = (w - pad.l - pad.r) / months.length;

  ctx.strokeStyle = isLight() ? "rgba(15,23,32,0.15)" : "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (h - pad.t - pad.b) * (i / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    const val = max - (max * (i / 4));
    ctx.fillStyle = isLight() ? "#0f1720" : "#c9c2ab";
    ctx.font = "600 11px 'Space Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("$" + Math.round(val), pad.l - 8, y + 4);
  }

  months.forEach((m, i) => {
    const val = totals[i];
    const barH = (val / max) * (h - pad.t - pad.b);
    const x = pad.l + step * i + (step - barW) / 2;
    const y = h - pad.b - barH;
    const grad = ctx.createLinearGradient(0, y, 0, h - pad.b);
    grad.addColorStop(0, "#f4b942");
    grad.addColorStop(1, "#d6362e");
    ctx.fillStyle = grad;
    ctx.strokeStyle = isLight() ? "#0f1720" : "#000";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, barW, Math.max(barH, 1), 6);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = isLight() ? "#0f1720" : "#f6f1e4";
    ctx.font = "700 11px Nunito, sans-serif";
    ctx.textAlign = "center";
    const label = new Date(m + "-02").toLocaleDateString(undefined, { month: "short" });
    ctx.fillText(label, x + barW / 2, h - pad.b + 18);
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- Backup ----------
function initBackup() {
  document.getElementById("exportBackupBtn").addEventListener("click", () => {
    const payload = {
      app: "waggle-expense-tracker",
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: getExpenses(),
      categories: getCategories(),
    };
    downloadFile(JSON.stringify(payload, null, 2), `waggle-backup-${todayISO()}.json`, "application/json");
    toast("Backup exported ⬇️");
  });

  document.getElementById("importBackupInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.expenses)) throw new Error("bad file");
        const merge = confirm("Merge with existing data? Click Cancel to REPLACE all data instead.");
        if (merge) {
          const existing = getExpenses();
          const existingIds = new Set(existing.map((x) => x.id));
          const merged = existing.concat(data.expenses.filter((x) => !existingIds.has(x.id)));
          saveExpenses(merged);
          const cats = new Set(getCategories().concat(data.categories || []));
          saveCategories(Array.from(cats));
        } else {
          saveExpenses(data.expenses);
          if (Array.isArray(data.categories)) saveCategories(data.categories);
        }
        toast("Backup imported ✅");
        refreshCategorySelects();
        renderAll();
      } catch (err) {
        alert("Couldn't read that file. Make sure it's a Waggle backup JSON file.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (!confirm("This will permanently delete ALL expenses on this device. Continue?")) return;
    saveExpenses([]);
    toast("All data cleared");
    renderAll();
  });
}

// ---------- Install banner ----------
function initInstallBanner() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const dismissed = localStorage.getItem("waggle_install_dismissed");
  if (!isStandalone && !dismissed) {
    document.getElementById("installBanner").classList.add("show");
  }
  document.getElementById("dismissInstall").addEventListener("click", () => {
    document.getElementById("installBanner").classList.remove("show");
    localStorage.setItem("waggle_install_dismissed", "1");
  });
}

// ---------- Service worker ----------
function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// ---------- Boot ----------
function renderAll() {
  renderDashboard();
  renderJournal();
  renderReports();
}
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  refreshCategorySelects();
  initForm();
  initJournalFilters();
  initBackup();
  initInstallBanner();
  initServiceWorker();
  renderAll();
});
