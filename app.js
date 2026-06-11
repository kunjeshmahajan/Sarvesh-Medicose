const STORE_CONFIG = {
  name: "Sarvesh Medicose",
  address: "4, Nutan Nagar Colony, Khargone, Madhya Pradesh — 451001",
  business: "Wholesale medical shop",
  hours: "9:00 AM to 9:00 PM",
  phones: [
    { label: "Shop", number: "07282-235161" },
    { label: "Sarvesh Mahajan", number: "9425089161" },
    { label: "Giriraj Mahajan", number: "9424049761" },
    { label: "Vallabh Mahajan", number: "7769899001" },
    { label: "Yash Mahajan", number: "8989190484" },
  ],
  foundedYear: 1997,
  yearsInBusiness: 30,
};

const PAGE_SIZE = 15;

let allProducts = [];
let allCompanies = [];
let allLocations = [];

let productVisibleCount = PAGE_SIZE;
let companyVisibleCount = PAGE_SIZE;
let locationVisibleCount = PAGE_SIZE;

let productSearchQuery = "";
let productCategoryFilter = "";
let companySearchQuery = "";
let locationSearchQuery = "";
let locationTypeFilter = "";

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function formatCount(n) {
  return Number(n).toLocaleString("en-IN");
}

function setSectionCount(id, count) {
  const el = document.getElementById(id);
  if (el) el.textContent = count ? `(${formatCount(count)})` : "";
}

function updatePagination(wrapId, metaId, lessBtnId, moreBtnId, visible, total) {
  const wrap = document.getElementById(wrapId);
  const meta = document.getElementById(metaId);
  const lessBtn = document.getElementById(lessBtnId);
  const moreBtn = document.getElementById(moreBtnId);
  if (!wrap) return;

  const hasMore = visible < total;
  const canShowLess = visible > PAGE_SIZE;

  wrap.classList.toggle("hidden", total <= PAGE_SIZE);
  lessBtn?.classList.toggle("hidden", !canShowLess);
  moreBtn?.classList.toggle("hidden", !hasMore);
  if (meta) {
    meta.textContent =
      total > 0 ? `Showing ${formatCount(visible)} of ${formatCount(total)}` : "";
  }
}

function stockClass(stock) {
  if (stock === "in") return "in-stock";
  if (stock === "low") return "low-stock";
  return "out-of-stock";
}

function stockLabel(stock) {
  if (stock === "in") return "In stock";
  if (stock === "low") return "Low stock";
  return "Out of stock";
}

function filterProducts(products, search = "", category = "") {
  const q = search.trim().toLowerCase();
  return products.filter((p) => {
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });
}

function filterCompanies(companies, search = "") {
  const q = search.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter((c) => {
    const hay = `${c.name} ${c.division || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function filterLocations(locations, search = "", type = "") {
  const q = search.trim().toLowerCase();
  return locations.filter((loc) => {
    const matchSearch =
      !q ||
      loc.name.toLowerCase().includes(q) ||
      (loc.district && loc.district.toLowerCase().includes(q));
    const matchType = !type || loc.type === type;
    return matchSearch && matchType;
  });
}

function renderProducts(resetVisible = false) {
  const grid = document.getElementById("productsGrid");
  const empty = document.getElementById("productsEmpty");
  const loading = document.getElementById("productsLoading");

  if (loading) loading.classList.add("hidden");
  if (resetVisible) productVisibleCount = PAGE_SIZE;

  const filtered = filterProducts(
    allProducts,
    productSearchQuery,
    productCategoryFilter
  );
  const visible = filtered.slice(0, productVisibleCount);

  grid.innerHTML = visible
    .map(
      (p) => `
    <article class="product-card" role="listitem">
      <span class="product-category">${escapeHtml(p.category)}</span>
      <h3>${escapeHtml(p.name)}</h3>
      ${p.description ? `<p class="product-meta">${escapeHtml(p.description)}</p>` : ""}
      ${p.price ? `<div class="product-price">${escapeHtml(p.price)}</div>` : ""}
      <div class="product-stock ${stockClass(p.stock)}">${stockLabel(p.stock)}</div>
    </article>
  `
    )
    .join("");

  empty.classList.toggle("hidden", filtered.length > 0);
  updatePagination(
    "productsLoadMoreWrap",
    "productsLoadMeta",
    "productsShowLess",
    "productsLoadMore",
    visible.length,
    filtered.length
  );
}

function populateCategories(products) {
  const select = document.getElementById("categoryFilter");
  const cats = [...new Set(products.map((p) => p.category))].sort();
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function renderHistory(items) {
  const timeline = document.getElementById("historyTimeline");
  timeline.innerHTML = items
    .sort((a, b) => b.year - a.year)
    .map(
      (item) => `
    <article class="timeline-item" role="listitem">
      <div class="timeline-year">${escapeHtml(String(item.yearLabel || item.year))}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function yearsServing(history) {
  const fromConfig = STORE_CONFIG.foundedYear;
  if (fromConfig) return new Date().getFullYear() - fromConfig;
  if (!history.length) return 0;
  const oldest = Math.min(...history.map((h) => h.year));
  return new Date().getFullYear() - oldest;
}

function updateHeroStats(stats, companies, locations, products) {
  document.getElementById("statProducts").textContent = formatCount(
    stats?.products ?? products?.length ?? 0
  );
  document.getElementById("statCompanies").textContent = formatCount(
    stats?.companies ?? companies?.length ?? 0
  );
  document.getElementById("statTerritories").textContent = formatCount(
    stats?.territories ?? locations?.length ?? 0
  );
  document.getElementById("statYears").textContent =
    STORE_CONFIG.yearsInBusiness ?? yearsServing([]);
}

function renderCompanies(resetVisible = false) {
  const list = document.getElementById("companiesList");
  const empty = document.getElementById("companiesEmpty");
  const searchInput = document.getElementById("companySearch");
  const loadWrap = document.getElementById("companiesLoadMoreWrap");

  if (resetVisible) companyVisibleCount = PAGE_SIZE;

  if (!allCompanies.length) {
    list.innerHTML = "";
    if (loadWrap) loadWrap.classList.add("hidden");
    empty.textContent =
      "Company list will be added soon. We will publish all pharma companies and divisions for which we hold stockist authorization.";
    empty.classList.remove("hidden");
    if (searchInput) searchInput.disabled = true;
    return;
  }

  if (searchInput) searchInput.disabled = false;

  const filtered = filterCompanies(allCompanies, companySearchQuery);
  const visible = filtered.slice(0, companyVisibleCount);

  list.innerHTML = visible
    .map((c) => {
      const label = c.division
        ? `${escapeHtml(c.name)} · ${escapeHtml(c.division)}`
        : escapeHtml(c.name);
      return `<span class="chip" role="listitem">${label}</span>`;
    })
    .join("");

  empty.classList.toggle("hidden", filtered.length > 0);
  if (filtered.length === 0) {
    empty.textContent = "No companies match your search.";
    empty.classList.remove("hidden");
  }
  updatePagination(
    "companiesLoadMoreWrap",
    "companiesLoadMeta",
    "companiesShowLess",
    "companiesLoadMore",
    visible.length,
    filtered.length
  );
}

function renderLocations(resetVisible = false) {
  const list = document.getElementById("locationsList");
  const empty = document.getElementById("locationsEmpty");
  const searchInput = document.getElementById("locationSearch");
  const typeFilter = document.getElementById("locationTypeFilter");
  const loadWrap = document.getElementById("locationsLoadMoreWrap");

  if (resetVisible) locationVisibleCount = PAGE_SIZE;

  if (!allLocations.length) {
    list.innerHTML = "";
    if (loadWrap) loadWrap.classList.add("hidden");
    empty.textContent =
      "Area list will be added soon. We will publish villages and cities where we actively do wholesale business.";
    empty.classList.remove("hidden");
    if (searchInput) searchInput.disabled = true;
    if (typeFilter) typeFilter.disabled = true;
    return;
  }

  if (searchInput) searchInput.disabled = false;
  if (typeFilter) typeFilter.disabled = false;

  const filtered = filterLocations(
    allLocations,
    locationSearchQuery,
    locationTypeFilter
  );
  const visible = filtered.slice(0, locationVisibleCount);

  list.innerHTML = visible
    .map(
      (loc) => `
    <article class="location-card" role="listitem">
      <span class="location-type">${escapeHtml(loc.type === "city" ? "City" : "Village")}</span>
      <h3>${escapeHtml(loc.name)}</h3>
      ${loc.district ? `<p class="location-district">${escapeHtml(loc.district)} district</p>` : ""}
    </article>
  `
    )
    .join("");

  empty.classList.toggle("hidden", filtered.length > 0);
  if (filtered.length === 0) {
    empty.textContent = "No areas match your search.";
    empty.classList.remove("hidden");
  }
  updatePagination(
    "locationsLoadMoreWrap",
    "locationsLoadMeta",
    "locationsShowLess",
    "locationsLoadMore",
    visible.length,
    filtered.length
  );
}

function renderTeam(team) {
  const root = document.getElementById("teamSection");
  if (!root) return;

  const leadership = team.leadership
    .map(
      (m) => `
    <article class="team-card">
      <p class="team-role">${escapeHtml(m.role)}</p>
      <h3>${escapeHtml(m.name)}</h3>
      <p class="team-qual">${escapeHtml(m.qualification)}</p>
    </article>
  `
    )
    .join("");

  const accountants = team.accountants.map((a) => escapeHtml(a.name)).join(", ");
  const advisors = team.advisors
    .map(
      (a) => `
    <li><strong>${escapeHtml(a.role)}:</strong> ${escapeHtml(a.name)}</li>
  `
    )
    .join("");

  root.innerHTML = `
    <div class="team-grid">${leadership}</div>
    <div class="team-support card-muted">
      <p><strong>Number of employees:</strong> ${team.employeeCount}</p>
      <p><strong>Accountants:</strong> ${accountants}</p>
      <ul class="team-advisors">${advisors}</ul>
    </div>
  `;
}

function initNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function initProductControls() {
  const searchInput = document.getElementById("productSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const loadMoreBtn = document.getElementById("productsLoadMore");
  const showLessBtn = document.getElementById("productsShowLess");

  const refresh = (reset = true) => {
    productSearchQuery = searchInput.value;
    productCategoryFilter = categoryFilter.value;
    renderProducts(reset);
  };

  searchInput.addEventListener("input", debounce(() => refresh(true)));
  categoryFilter.addEventListener("change", () => refresh(true));

  loadMoreBtn?.addEventListener("click", () => {
    productVisibleCount += PAGE_SIZE;
    renderProducts(false);
  });

  showLessBtn?.addEventListener("click", () => {
    productVisibleCount = PAGE_SIZE;
    renderProducts(false);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function initCompanyControls() {
  const searchInput = document.getElementById("companySearch");
  const loadMoreBtn = document.getElementById("companiesLoadMore");
  const showLessBtn = document.getElementById("companiesShowLess");

  searchInput.addEventListener("input", debounce(() => {
    companySearchQuery = searchInput.value;
    renderCompanies(true);
  }));

  loadMoreBtn?.addEventListener("click", () => {
    companyVisibleCount += PAGE_SIZE;
    renderCompanies(false);
  });

  showLessBtn?.addEventListener("click", () => {
    companyVisibleCount = PAGE_SIZE;
    renderCompanies(false);
    document.getElementById("companies")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function initLocationControls() {
  const searchInput = document.getElementById("locationSearch");
  const typeFilter = document.getElementById("locationTypeFilter");
  const loadMoreBtn = document.getElementById("locationsLoadMore");
  const showLessBtn = document.getElementById("locationsShowLess");

  const refresh = (reset = true) => {
    locationSearchQuery = searchInput.value;
    locationTypeFilter = typeFilter.value;
    renderLocations(reset);
  };

  searchInput.addEventListener("input", debounce(() => refresh(true)));
  typeFilter.addEventListener("change", () => refresh(true));

  loadMoreBtn?.addEventListener("click", () => {
    locationVisibleCount += PAGE_SIZE;
    renderLocations(false);
  });

  showLessBtn?.addEventListener("click", () => {
    locationVisibleCount = PAGE_SIZE;
    renderLocations(false);
    document.getElementById("locations")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function loadProductsCatalog() {
  try {
    allProducts = await loadJson("data/products.json");
    populateCategories(allProducts);
    renderProducts(true);
    initProductControls();

    setSectionCount("productsSectionCount", allProducts.length);
    document.getElementById("statProducts").textContent = formatCount(allProducts.length);
  } catch (err) {
    console.error(err);
    const loading = document.getElementById("productsLoading");
    if (loading) {
      loading.textContent =
        "Could not load products. Refresh the page or check the local server is running.";
    }
  }
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("contactAddress").textContent = STORE_CONFIG.address;
  document.getElementById("contactBusiness").textContent = STORE_CONFIG.business;
  document.getElementById("contactHours").textContent = STORE_CONFIG.hours;

  const phonesEl = document.getElementById("contactPhones");
  const phonesRow = document.getElementById("contactPhonesRow");
  if (phonesEl && STORE_CONFIG.phones?.length) {
    phonesEl.innerHTML = STORE_CONFIG.phones
      .map(
        (p) =>
          `<a href="tel:${p.number.replace(/\s/g, "")}">${escapeHtml(p.number)}</a> (${escapeHtml(p.label)})`
      )
      .join("<br>");
  } else if (phonesRow) {
    phonesRow.hidden = true;
  }

  initNav();

  try {
    const [stats, history, team, companies, locations] = await Promise.all([
      loadJson("data/stats.json").catch(() => null),
      loadJson("data/history.json"),
      loadJson("data/team.json"),
      loadJson("data/companies.json"),
      loadJson("data/locations.json"),
    ]);

    allCompanies = companies;
    allLocations = locations;

    updateHeroStats(stats, companies, locations, null);
    setSectionCount("companiesSectionCount", stats?.companies ?? companies.length);
    setSectionCount("locationsSectionCount", stats?.territories ?? locations.length);
    if (stats?.products) setSectionCount("productsSectionCount", stats.products);

    renderCompanies(true);
    renderLocations(true);
    initCompanyControls();
    initLocationControls();
    renderHistory(history);
    renderTeam(team);

    await loadProductsCatalog();
  } catch (err) {
    console.error(err);
    const loading = document.getElementById("productsLoading");
    if (loading) {
      loading.textContent =
        "Could not load data. Open this site with a local server (see README).";
    }
  }
}

init();
