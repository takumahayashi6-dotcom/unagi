const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

let allRows = [];
let currentCategory = "";
let currentLang = "jp"; // デフォルト：日本語

// 言語切り替え
function setLang(lang) {
  currentLang = lang;
  document.getElementById("btn-jp").classList.toggle("active", lang === "jp");
  document.getElementById("btn-en").classList.toggle("active", lang === "en");

  if (currentCategory) showCategory(currentCategory);
}

function yen(v){ const n = Number(v); return isNaN(n) ? v : n.toLocaleString("ja-JP"); }

const norm = s => String(s||"").trim().toLowerCase().replace(/\s+/g," ");
function get(row, wanted){
  const key = Object.keys(row).find(k => norm(k) === norm(wanted));
  return key ? String(row[key]).trim() : "";
}

function getCategory(row) {
  const g = get(row, "Group");
  if (g) return g;
  return get(row, "Category");
}

// 複数価格対応
function formatPrice(pr) {
  if (!pr) return "";
  if (pr.includes("/")) {
    const parts = pr.split("/");
    return parts.map(p => `<div class="price">${p.trim()}</div>`).join("");
  }
  return `<p class="price">￥${yen(pr)}</p>`;
}

function cardHTML(row) {
  const cat  = getCategory(row);
  const sub  = get(row, "Category");
  const jp   = get(row, "Name (JP)");
  const en   = get(row, "Name (EN)");
  const djp  = get(row, "Description (JP)");
  const den  = get(row, "Description (EN)");
  const pr   = get(row, "Price");
  const imgU = get(row, "Image URL");
  const take = get(row, "Takeout");

  const img  = imgU ? `<img src="${imgU}" alt="${en||jp||""}">` : "";
  const takeBadge = take && take.match(/(OK)/i)
    ? `<span class="takeout-badge">${currentLang === "jp" ? "テイクアウト可" : "Takeout OK"}</span>`
    : "";

  const title = currentLang === "jp" ? jp : en;
  const desc = currentLang === "jp" ? djp : den;
  const prText = formatPrice(pr);

  return `
    <div class="menu-item">
      <div class="menu-img">${img}</div>
      <div class="menu-text">
        ${cat ? `<div class="cat">${cat}${sub && sub!==cat ? " - " + sub : ""}</div>` : ""}
        <h2>${title}</h2>
        ${takeBadge}
        <p>${desc}</p>
        ${prText}
      </div>
    </div>`;
}

const CATEGORY_ORDER = [
  "季節のお料理", "うなぎ料理", "コース料理", "お料理",
  "サラダ", "ビール", "日本酒", "焼酎", "ウイスキー",
  "サワー類", "ジャパニーズジン", "ソフトドリンク", "デザート"
];

function renderTabs(categories) {
  const tabsEl = document.getElementById("tabs");
  const ordered = CATEGORY_ORDER.filter(c => categories.includes(c))
    .concat(categories.filter(c => !CATEGORY_ORDER.includes(c)));

  tabsEl.innerHTML = ordered.map(cat =>
    `<div class="tab ${cat===currentCategory ? "active" : ""}" onclick="showCategory('${cat}')">${cat}</div>`
  ).join("");
}

function showCategory(cat) {
  currentCategory = cat;
  renderTabs([...new Set(allRows.map(r => getCategory(r)))]);
  const filtered = allRows.filter(r => getCategory(r) === cat);

  const noteHTML = `
    <div class="note">
      ${currentLang === "jp"
        ? "※ 表示価格は消費税込みです。写真はイメージです。ご飯大盛りは160円です。"
        : "※ Prices include tax. Photos are for illustration only. Large rice +¥160."}
    </div>`;

  document.getElementById("menu").innerHTML =
    noteHTML + filtered.map(cardHTML).join("");
}

// CSV読込
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (res) => {
    allRows = res.data.filter(r => {
      const vis = get(r, "Visible").trim().toLowerCase();
      return !(vis && vis.match(/^(×|✗|x|no|0|false)$/i));
    });

    const categories = [...new Set(allRows.map(r => getCategory(r)))];
    if (categories.length > 0) {
      showCategory(categories[0]);
    }
  },
  error: (err) => {
    document.getElementById("menu").innerHTML = "<p>メニューの読み込みに失敗しました。</p>";
    console.error(err);
  }
});
