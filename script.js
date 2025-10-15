const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

let allRows = [];
let currentCategory = "";

// URLから言語を取得
const params = new URLSearchParams(window.location.search);
let currentLang = params.get("lang") === "en" ? "en" : "jp"; // デフォルトjp

function yen(v) {
  const n = Number(v);
  return isNaN(n) ? v : n.toLocaleString("ja-JP");
}

const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
function get(row, wanted) {
  const key = Object.keys(row).find(k => norm(k) === norm(wanted));
  return key ? String(row[key]).trim() : "";
}

function getCategory(row) {
  const g = get(row, "Group");
  if (g) return g;
  return get(row, "Category");
}

// --- ヘッダーを言語に応じて切り替え ---
function renderHeader() {
  const header = document.getElementById("header");

  if (currentLang === "en") {
    header.innerHTML = `
      <h1>Ichinoya Menu<br><span class="en">Unagi Restaurant Menu</span></h1>
    `;
  } else {
    header.innerHTML = `
      <h1>いちのや料理メニュー<br><span class="en">うなぎ料理専門店</span></h1>
    `;
  }
}

// --- カード描画 ---
function cardHTML(row) {
  const cat = getCategory(row);
  const sub = get(row, "Category");
  const jp = get(row, "Name (JP)");
  const en = get(row, "Name (EN)");
  const djp = get(row, "Description (JP)");
  const den = get(row, "Description (EN)");
  const pr = get(row, "Price");
  const imgU = get(row, "Image URL");
  const take = get(row, "Takeout");

  const img = imgU ? `<img src="${imgU}" alt="${en || jp || ""}">` : "";
  const takeBadge =
    take && take.match(/(OK)/i)
      ? `<span class="takeout-badge">${
          currentLang === "jp" ? "テイクアウト可" : "Takeout OK"
        }</span>`
      : "";

  const title = currentLang === "jp" ? jp : en;
  const desc = currentLang === "jp" ? djp : den;

  // --- 価格整形（複数対応＋グラス/ボトル名残す）---
  let prText = "";
  if (pr) {
    if (pr.includes("/")) {
      const parts = pr.split("/");
      prText = parts
        .map(p => {
          const part = p.trim();
          const formatted = part.replace(/(\d[\d,]*)/g, "￥$1");
          return `<div class="price">${formatted}</div>`;
        })
        .join("");
    } else {
      const formatted = pr.trim().replace(/(\d[\d,]*)/g, "￥$1");
      prText = `<p class="price">${formatted}</p>`;
    }
  }

  // --- カテゴリ名を言語に応じて切り替え ---
  const catLabel =
    currentLang === "en" && CATEGORY_TRANSLATION[cat]
      ? CATEGORY_TRANSLATION[cat]
      : cat;

  return `
    <div class="menu-item">
      <div class="menu-img">${img}</div>
      <div class="menu-text">
        ${cat ? `<div class="cat">${catLabel}${sub && sub !== cat ? " - " + sub : ""}</div>` : ""}
        <h2>${title}</h2>
        ${takeBadge}
        <p>${desc}</p>
        ${prText}
      </div>
    </div>`;
}

// --- カテゴリ名翻訳 ---
const CATEGORY_TRANSLATION = {
  "季節のお料理": "Seasonal Dishes",
  "うなぎ料理": "Unagi Dishes",
  "コース料理": "Course Meals",
  "お料理": "Dishes",
  "サラダ": "Salads",
  "ビール": "Beer",
  "日本酒": "Sake",
  "焼酎": "Shochu",
  "ウイスキー": "Whisky",
  "サワー類": "Sours",
  "ジャパニーズジン": "Japanese Gin",
  "ソフトドリンク": "Soft Drinks",
  "デザート": "Dessert",
};

// --- カテゴリ順序 ---
const CATEGORY_ORDER = [
  "季節のお料理",
  "うなぎ料理",
  "コース料理",
  "お料理",
  "サラダ",
  "ビール",
  "日本酒",
  "焼酎",
  "ウイスキー",
  "サワー類",
  "ジャパニーズジン",
  "ソフトドリンク",
  "デザート",
];

function renderTabs(categories) {
  const tabsEl = document.getElementById("tabs");
  const ordered = CATEGORY_ORDER.filter(c => categories.includes(c)).concat(
    categories.filter(c => !CATEGORY_ORDER.includes(c))
  );

  tabsEl.innerHTML = ordered
    .map(cat => {
      const label =
        currentLang === "en" && CATEGORY_TRANSLATION[cat]
          ? CATEGORY_TRANSLATION[cat]
          : cat;
      return `<div class="tab ${
        cat === currentCategory ? "active" : ""
      }" onclick="showCategory('${cat}')">${label}</div>`;
    })
    .join("");
}

function showCategory(cat) {
  currentCategory = cat;
  renderTabs([...new Set(allRows.map(r => getCategory(r)))]);
  const filtered = allRows.filter(r => getCategory(r) === cat);

  const noteHTML = `
    <div class="note">
      ${
        currentLang === "jp"
          ? "※ 表示価格は税込みです。写真はイメージです。ご飯大盛りは160円です。"
          : "※ Prices include tax. Photos are for illustration only. Large rice +¥160."
      }
    </div>`;

  document.getElementById("menu").innerHTML =
    noteHTML + filtered.map(cardHTML).join("");
}

// --- CSV読み込み ---
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => {
    renderHeader();

    allRows = res.data.filter(r => {
      const vis = get(r, "Visible").trim().toLowerCase();
      return !(vis && vis.match(/^(×|✗|x|no|0|false)$/i));
    });
    const categories = [...new Set(allRows.map(r => getCategory(r)))];
    if (categories.length > 0) showCategory(categories[0]);
  },
  error: err => {
    document.getElementById("menu").innerHTML =
      "<p>メニューの読み込みに失敗しました。</p>";
  },
});

