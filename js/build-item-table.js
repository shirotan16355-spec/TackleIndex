document.addEventListener("DOMContentLoaded", function () {
    // 左サイドバーは全ページ共通で生成
    buildSiteNavSidebar();

    // ハンバーガーメニューと連動させる
    setupMobileMenu();
    // ▼ 左側（階層一覧）用ハンバーガーメニューの制御
    function setupMobileMenu() {
        const btn = document.querySelector(".mobile-menu-button");
        const nav = document.querySelector(".site-nav");
        if (!btn || !nav) return;

        btn.addEventListener("click", () => {
            nav.classList.toggle("is-open");
        });

        nav.addEventListener("click", (e) => {
            if (e.target.tagName.toLowerCase() === "a") {
                nav.classList.remove("is-open");
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth >= 600) {
                nav.classList.remove("is-open");
            }
        });
    }
    // ▼ 右側（シリーズ一覧）用ハンバーガーメニューの制御
    function setupRightMenu() {
        const btn = document.querySelector(".right-menu-button");
        const rightNav = document.querySelector(".series-index");

        if (!btn) return;

        // そのページにシリーズサイドバーがなければボタンを隠す
        if (!rightNav) {
            btn.style.display = "none";
            return;
        }

        btn.addEventListener("click", () => {
            rightNav.classList.toggle("is-open");
        });

        // 画面が広くなったら（PC幅）、右サイドバーを普通のレイアウトに戻す
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 600 && rightNav) {
                rightNav.classList.remove("is-open");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        buildSiteNavSidebar();
        setupMobileMenu();
        layoutSidebar();
        // …以下は今のままでOK
    });

    // 一度レイアウト計算（サイドバーの高さなど）
    layoutSidebar();

    // ここから下は「番手テーブルがあるページだけ」の処理
    const source = document.getElementById("item-source");
    const table = document.getElementById("item-table");

    if (!source || !table) {
        // 番手テーブルがないページ（トップページ・カテゴリ一覧など）はここで終了
        return;
    }

    insertSearchBox();

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    const z2h = (str) => {
        return str
            .replace(/[Ａ-Ｚａ-ｚ０-９－]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            )
            .replace(/\u3000/g, " ");
    };

    const getSeriesName = (txt) => {
        const t = txt.trim();

        // 先頭から1つ目の全角スペースまでをシリーズ名にする
        const idx = t.indexOf("　");  // 全角スペース

        if (idx !== -1) {
            return t.substring(0, idx).trim();
        }

        // 全角スペースがない場合は、最初の語だけシリーズ扱い
        const parts = t.split(/\s+/);
        return parts[0] || "";
    };

    // ★ 元テキスト（z2h前）
    const rawText = source.textContent || "";

    // ★ 行ごとの「元テキスト」と「z2h後テキスト」を両方持つ
    const rawLines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    // ▼ シリーズごとにグルーピング（登場順保持）
    const seriesOrder = [];
    const seriesMap = new Map();

    rawLines.forEach((raw) => {
        const series = getSeriesName(raw); // ← 全角スペース判定は raw でやる
        const normalized = z2h(raw);       // ← 表示・検索用には z2h 済みを使う

        if (!seriesMap.has(series)) {
            seriesMap.set(series, []);
            seriesOrder.push(series);
        }
        seriesMap.get(series).push(normalized);
    });

    // ★★ 五十音順ソート ★★
    seriesOrder.sort((a, b) => a.localeCompare(b, "ja"));
    seriesOrder.forEach((series) => {
        const items = seriesMap.get(series);
        if (items) {
            items.sort((a, b) => a.localeCompare(b, "ja"));
        }
    });

    const seriesInfo = new Map();   // series → { header, rows[] }
    const seriesState = new Map();  // series → true(展開)/false(折りたたみ)

    tbody.innerHTML = "";

    // ▼ テーブル生成（見出し＋アイテム）
    seriesOrder.forEach((series) => {
        const items = seriesMap.get(series);

        const headerTr = document.createElement("tr");
        headerTr.classList.add("series-header", "collapsed"); // 初期＝閉じる
        headerTr.dataset.series = series;

        const headerTd = document.createElement("td");
        headerTd.colSpan = 1;
        headerTd.textContent = series;
        headerTr.appendChild(headerTd);
        tbody.appendChild(headerTr);

        const itemRows = [];

        items.forEach((txt) => {
            const tr = document.createElement("tr");
            const td = document.createElement("td");

            const a = document.createElement("a");
            a.href = "https://www.google.com/search?q=" + encodeURIComponent(txt);
            a.textContent = txt;
            a.className = "search-link";
            a.target = "_blank";

            td.appendChild(a);
            tr.appendChild(td);
            tbody.appendChild(tr);

            itemRows.push(tr);
        });

        seriesInfo.set(series, { header: headerTr, rows: itemRows });
        seriesState.set(series, false); // 初期＝折りたたみ
    });

    const searchInput = document.getElementById("item-search");

    function updateHeaderIcon(series) {
        const info = seriesInfo.get(series);
        const header = info.header;
        const expanded = seriesState.get(series);

        header.classList.remove("expanded", "collapsed");
        header.classList.add(expanded ? "expanded" : "collapsed");
    }

    function filterRows() {
        const raw = searchInput ? (searchInput.value || "") : "";
        const query = z2h(raw).toLowerCase();
        const hasQuery = !!query;

        seriesInfo.forEach((info, series) => {
            const { header, rows } = info;
            const seriesText = z2h(series.toLowerCase());

            let anyMatch = false;

            rows.forEach((tr) => {
                const text = z2h(tr.textContent.toLowerCase());
                const match = !query || text.includes(query);

                if (match) anyMatch = true;

                if (!hasQuery) {
                    const expanded = seriesState.get(series);
                    tr.style.display = expanded ? "" : "none";
                } else {
                    tr.style.display = match ? "" : "none";
                }
            });

            if (!hasQuery) {
                header.style.display = "";
            } else {
                const headerMatch = seriesText.includes(query);
                header.style.display = (headerMatch || anyMatch) ? "" : "none";
            }

            updateHeaderIcon(series);
        });
    }

    // ▼ 見出しクリックで開閉
    seriesInfo.forEach((info, series) => {
        const header = info.header;
        header.addEventListener("click", () => {
            const current = !!seriesState.get(series);
            seriesState.set(series, !current);
            updateHeaderIcon(series);
            filterRows();
        });
    });

    // ▼ 検索イベント
    if (searchInput) {
        searchInput.addEventListener("input", filterRows);
    }

    // ▼ 右側にシリーズ一覧サイドバーを自動生成
    buildSeriesIndexSidebar(seriesOrder, seriesInfo);

    // 初期描画（全シリーズ折りたたみ＋見出しだけ表示）
    filterRows();

    // 右ハンバーガーボタンと連動させる
    setupRightMenu();
});

// ▼ 検索ボックス自動挿入
function insertSearchBox() {
    const container = document.querySelector(".table-container");
    if (!container) return;
    if (document.getElementById("item-search")) return;

    const box = document.createElement("div");
    box.className = "search-box";

    box.innerHTML = `
        <input
          type="text"
          id="item-search"
          placeholder="キーワードで絞り込み"
        />
    `;

    container.parentNode.insertBefore(box, container);
}

// ▼ シリーズ一覧サイドバーを作る
function buildSeriesIndexSidebar(seriesOrder, seriesInfo) {
    if (!seriesOrder || seriesOrder.length === 0) return;

    const sidebar = document.createElement("div");
    sidebar.className = "series-index";

    const title = document.createElement("div");
    title.className = "series-index-title";
    title.textContent = "シリーズ一覧";
    sidebar.appendChild(title);

    const ul = document.createElement("ul");

    seriesOrder.forEach((series) => {
        const info = seriesInfo.get(series);
        if (!info) return;

        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = series;

        // ★ シリーズをクリックしたら対応する見出しを「クリック」して展開し、
        //   その位置までスクロールする
        btn.addEventListener("click", () => {
            const header = info.header;
            if (!header) return;

            // 1) 閉じている場合だけ click() して展開
            if (header.classList.contains("collapsed")) {
                header.click();   // ← 見出しクリックと同じ処理（seriesState＋filterRows）が走る
            }

            // 2) スクロールビュー内で見出し行までスクロール
            const container = document.querySelector(".table-container");
            if (container) {
                const headerPos = header.offsetTop;
                container.scrollTo({
                    top: headerPos - 20,
                    behavior: "smooth"
                });
            }
        });

        li.appendChild(btn);
        ul.appendChild(li);
    });

    sidebar.appendChild(ul);
    document.body.appendChild(sidebar);
}

// ▼ サイト全体のページ階層ナビ（左サイドバー）を作る
function buildSiteNavSidebar() {
    // 今のページのパスを取得
    const path = window.location.pathname;

    // ルートから 1 階層下( /rod/ や /reel/ )にいるかどうか
    const isUnderSubdir = path.includes("/rod/") || path.includes("/reel/");

    // ルートへのプレフィックス
    //   top.html   → "./" からスタート
    //   rod/*.html → "../" からスタート
    const root = isUnderSubdir ? ".." : ".";

    // level: 階層（0 が親、1 がその子…）
    // isTitle: 親見出し（リンク無し）
    const navItems = [
        { label: "トップページ", href: root + "/index.html", level: 0 },

        { label: "ロッド", isTitle: true, level: 0 },
        { label: "ロッドカテゴリ一覧", href: root + "/rod/rod_category.html", level: 1 },
        { label: "ロッドメーカー一覧\n　〜スピニングロッド〜", href: root + "/rod/rod_spinning.html", level: 2 },
        { label: "ロッドメーカー一覧\n　〜ベイトロッド〜", href: root + "/rod/rod_bait.html", level: 2 },

        { label: "リール", isTitle: true, level: 0 },
        { label: "リールカテゴリ一覧", href: root + "/reel/reel_category.html", level: 1 },
        { label: "リールメーカー一覧\n　〜スピニングリール〜", href: root + "/reel/reel_spinning.html", level: 2 },
        { label: "リールメーカー一覧\n　〜ベイトリール〜", href: root + "/reel/reel_bait.html", level: 2 }
    ];

    if (!navItems || navItems.length === 0) return;

    const sidebar = document.createElement("nav");
    sidebar.className = "site-nav";

    const title = document.createElement("div");
    title.className = "site-nav-title";
    title.textContent = "ページ一覧";
    sidebar.appendChild(title);

    const ul = document.createElement("ul");

    navItems.forEach((item) => {
        const li = document.createElement("li");
        li.dataset.level = item.level;   // ★ 階層情報を data-level に入れる

        if (item.isTitle) {
            // 親見出し（リンクなし、太字）
            li.classList.add("nav-section");
            li.textContent = item.label;
        } else {
            const a = document.createElement("a");
            a.innerHTML = item.label.replace(/\n/g, "<br>");
            a.href = item.href;
            li.appendChild(a);
        }

        ul.appendChild(li);
    });

    sidebar.appendChild(ul);

    // ★ 著作権表記を追加
    const cpr = document.createElement("div");
    cpr.className = "site-nav-copyright";
    cpr.innerHTML = "&copy; 2025 TackleIndex〜釣具モデル検索〜 / Sho Sasaki";
    sidebar.appendChild(cpr);

    document.body.appendChild(sidebar);
}

function layoutSidebar() {
    const rightSidebar = document.querySelector(".series-index");
    const leftSidebar = document.querySelector(".site-nav");
    const header = document.querySelector(".page-header");
    const footer = document.querySelector(".footer-links");
    const tableContainer = document.querySelector(".table-container");

    // ヘッダーがなければ何もしない
    if (!header) return;
    if (!rightSidebar && !leftSidebar) return;

    // スマホ幅ではサイドバーを解除
    if (window.innerWidth < 600) {
        if (rightSidebar) {
            rightSidebar.style.position = "";
            rightSidebar.style.top = "";
            rightSidebar.style.bottom = "";
            rightSidebar.style.height = "";
            rightSidebar.style.maxHeight = "";
        }
        if (leftSidebar) {
            leftSidebar.style.position = "";
            leftSidebar.style.top = "";
            leftSidebar.style.bottom = "";
            leftSidebar.style.height = "";
            leftSidebar.style.maxHeight = "";
        }
        if (tableContainer) {
            tableContainer.style.maxHeight = "";
        }
        return;
    }

    const headerRect = header.getBoundingClientRect();

    // フッターがあればそこまで。なければ画面下端まで。
    let sidebarBottom = window.innerHeight;
    if (footer) {
        const footerRect = footer.getBoundingClientRect();
        sidebarBottom = footerRect.top;
    }

    const sidebarTop = headerRect.bottom;
    const sidebarHeight = Math.max(0, sidebarBottom - sidebarTop);

    // --- 右サイドバー ---
    if (rightSidebar) {
        rightSidebar.style.position = "fixed";
        rightSidebar.style.top = sidebarTop + "px";
        rightSidebar.style.right = "0";
        rightSidebar.style.height = sidebarHeight + "px";
        rightSidebar.style.maxHeight = sidebarHeight + "px";
    }

    // --- 左サイドバー ---
    if (leftSidebar) {
        leftSidebar.style.position = "fixed";
        leftSidebar.style.top = sidebarTop + "px";
        leftSidebar.style.left = "0";
        leftSidebar.style.height = sidebarHeight + "px";
        leftSidebar.style.maxHeight = sidebarHeight + "px";
    }

    // --- 中央リストの高さ調整（テーブルがあるときだけ） ---
    if (tableContainer && footer) {
        const tableRect = tableContainer.getBoundingClientRect();
        const gapCenter = 8; // ← お好みで調整（中央リスト専用の隙間）
        const tableHeight = Math.max(0, footer.getBoundingClientRect().top - tableRect.top - gapCenter);
        tableContainer.style.maxHeight = tableHeight + "px";
    }
}

// 初期表示・リサイズ・スクロールのたびに再計算
window.addEventListener("load", layoutSidebar);
window.addEventListener("resize", layoutSidebar);
//window.addEventListener("scroll", layoutSidebar);
