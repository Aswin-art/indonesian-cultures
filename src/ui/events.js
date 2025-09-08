// src/ui/events.js

/* ===== helpers ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const trim = (txt, n = 200) =>
  (txt || "").length > n ? txt.slice(0, n).trimEnd() + "…" : (txt || "");

const IDR = (v) =>
  (v ?? 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

/* ===== DOM refs ===== */
let eModal, eScrim, eCloseBtn, eBody;

/* ===== STATE ===== */
let ALL_EVENTS = [];
let FILTERS = { tag: "all", province: "all" }; // yang sedang aktif di UI utama
let TMP = { ...FILTERS }; // buffer sementara di popover (dibawa antar buka-tutup)
let filterPopover = null;
let removeOutsideListener = null;

/* ===== LOAD DATA via Vite (tanpa fetch/public) ===== */
function loadProvinceJsons() {
  try {
    const modules = import.meta.glob("/src/data/thedata/*.json", {
      eager: true,
      import: "default",
    });
    const all = [];
    for (const [path, payload] of Object.entries(modules)) {
      const slug = path.split("/").pop().replace(".json", "");
      if (Array.isArray(payload)) {
        payload.forEach((item, idx) => {
          all.push(toEventLike(item, slug, idx));
        });
      }
    }
    return all;
  } catch (err) {
    console.error("[events] gagal load via import.meta.glob:", err);
    return [];
  }
}

/* mapping item budaya -> event-like */
function toEventLike(item, provinceSlug, idx) {
  const image =
    item?.featuredImage ||
    (Array.isArray(item?.images) && item.images.length ? item.images[0] : "");

  return {
    id: `${provinceSlug}-${idx}`,
    title: item?.name ?? "Tanpa Judul",
    desc: item?.description ?? "",
    image,
    province: provinceSlug,
    city: "",
    venue: "",
    tags: [item?.category].filter(Boolean),
    link: item?.youtubeLink || "",
    priceFrom: 0,
  };
}

/* ===== render ===== */
function card(ev) {
  const loc = [ev.venue, ev.city, ev.province].filter(Boolean).join(" • ");
  const linkIsYoutube = (ev.link || "").includes("youtu");

  return `
  <article class="evt2">
    <div class="evt2-img">
      ${
        ev.image
          ? `<img src="${ev.image}" alt="${ev.title}" loading="lazy" />`
          : `<div class="ph"></div>`
      }
    </div>
    <div class="evt2-main">
      <div class="evt2-title">${ev.title}</div>
      ${loc ? `<div class="evt2-loc">${loc}</div>` : ""}
      <!-- FULL: tampilkan semua deskripsi, tanpa trim() -->
      <p class="evt2-desc">${ev.desc || ""}</p>
      <div class="evt2-tags">
        ${(ev.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="evt2-foot">
        <span class="evt2-price">${
          ev.priceFrom === 0 ? "Gratis" : `Mulai ${IDR(ev.priceFrom)}`
        }</span>
        ${
          ev.link
            ? `<a class="gbtn${linkIsYoutube ? " yt" : ""}" href="${ev.link}" target="_blank" rel="noopener">
                 ${linkIsYoutube ? "Tonton" : "Detail"}
               </a>`
            : ""
        }
      </div>
    </div>
  </article>`;
}

function renderEventList(list) {
  if (!eBody) return;

  if (!Array.isArray(list) || list.length === 0) {
    eBody.innerHTML = `
      <div class="evt2-empty">
        <div class="hintbox">
          <h4>Tidak ada data</h4>
          <p>Belum ada item yang bisa ditampilkan dari <code>src/data/thedata/*.json</code>.
          Pastikan file berisi array objek budaya.</p>
        </div>
      </div>
    `;
    return;
  }

  const left = `
    <div class="evt2-list" id="evtList" tabindex="0" aria-label="Daftar event">
      ${list.map(card).join("")}
    </div>
  `;
  eBody.innerHTML = `<div class="evt2-wrap">${left}</div>`;
}

/* ===== filtering ===== */
function applyFilters() {
  const filtered = ALL_EVENTS.filter((ev) => {
    const okTag =
      FILTERS.tag === "all" ? true : (ev.tags || []).includes(FILTERS.tag);
    const okProv =
      FILTERS.province === "all" ? true : ev.province === FILTERS.province;
    return okTag && okProv;
  });
  renderEventList(filtered);
}

const unique = (arr) => Array.from(new Set(arr)).filter(Boolean);

/* ====== Filter Popover ====== */
function buildFilterPopover(anchorBtn) {
  // opsi
  const tags = unique(ALL_EVENTS.flatMap((e) => e.tags || [])).sort();
  const provinces = unique(ALL_EVENTS.map((e) => e.province)).sort();

  // sinkronkan TMP (jaga state antar buka-tutup)
  TMP = { ...FILTERS };

  // buat node
  const pop = document.createElement("div");
  pop.setAttribute("id", "evtFilters");
  Object.assign(pop.style, {
    position: "absolute",
    zIndex: 2000,
    minWidth: "280px",
    maxWidth: "92vw",
    background: "rgba(15,19,28,0.9)",
    border: "1px solid rgba(200,170,110,0.28)",
    borderRadius: "12px",
    boxShadow: "0 24px 80px rgba(0,0,0,.5)",
    padding: "12px",
    backdropFilter: "blur(8px)",
  });

  pop.innerHTML = `
    <div style="display:grid;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong style="color:#f2ecd5;font:800 14px/1 Inter">Filter</strong>
        <button type="button" class="btn" id="fltClose">Close</button>
      </div>

      <label class="flabel" style="color:#b9c7da;font:700 12px/1 Inter">Tag</label>
      <select id="fltTag" class="input" style="padding:10px 12px">
        <option value="all">Semua</option>
        ${tags.map((t) => `<option value="${t}">${t}</option>`).join("")}
      </select>

      <label class="flabel" style="color:#b9c7da;font:700 12px/1 Inter">Provinsi</label>
      <select id="fltProv" class="input" style="padding:10px 12px">
        <option value="all">Semua</option>
        ${provinces.map((p) => `<option value="${p}">${p}</option>`).join("")}
      </select>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
        <button class="btn" id="fltReset" type="button">Reset</button>
        <button class="btn gold" id="fltApply" type="button">Apply</button>
      </div>
    </div>
  `;

  document.body.appendChild(pop);

  // posisi
  const r = anchorBtn.getBoundingClientRect();
  const top = window.scrollY + r.bottom + 8;
  const left = Math.min(
    window.scrollX + r.left,
    window.scrollX + window.innerWidth - pop.offsetWidth - 12
  );
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;

  // set nilai awal UI
  $("#fltTag", pop).value = TMP.tag;
  $("#fltProv", pop).value = TMP.province;

  // update TMP (belum apply)
  $("#fltTag", pop).addEventListener("change", () => {
    TMP.tag = $("#fltTag", pop).value;
  });
  $("#fltProv", pop).addEventListener("change", () => {
    TMP.province = $("#fltProv", pop).value;
  });

  // APPLY: commit TMP -> FILTERS + render (JANGAN close)
  $("#fltApply", pop).addEventListener("click", (e) => {
    e.stopPropagation();
    FILTERS = { ...TMP };
    applyFilters();
    const btn = e.currentTarget;
    const old = btn.textContent;
    btn.textContent = "Applied ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = old;
      btn.disabled = false;
    }, 700);
  });

  // RESET: defaultkan + terapkan (TIDAK close)
  $("#fltReset", pop).addEventListener("click", (e) => {
    e.stopPropagation();
    TMP.tag = "all";
    TMP.province = "all";
    $("#fltTag", pop).value = "all";
    $("#fltProv", pop).value = "all";
    FILTERS = { ...TMP };
    applyFilters();
  });

  // CLOSE
  $("#fltClose", pop).addEventListener("click", (e) => {
    e.stopPropagation();
    hideFilterPopover();
  });

  // klik di luar = close
  if (removeOutsideListener) removeOutsideListener();
  const outside = (ev) => {
    if (!pop.contains(ev.target) && ev.target !== anchorBtn) {
      hideFilterPopover();
    }
  };
  window.addEventListener("click", outside, { capture: true });
  removeOutsideListener = () =>
    window.removeEventListener("click", outside, { capture: true });

  filterPopover = pop;
}

function hideFilterPopover() {
  if (filterPopover && filterPopover.parentNode) {
    filterPopover.parentNode.removeChild(filterPopover);
  }
  filterPopover = null;
  if (removeOutsideListener) {
    removeOutsideListener();
    removeOutsideListener = null;
  }
}

function toggleFilters(anchorBtn) {
  if (filterPopover) hideFilterPopover();
  else buildFilterPopover(anchorBtn);
}

/* ===== open/close ===== */
export function closeEvents() {
  $("#escrim")?.setAttribute("aria-hidden", "true");
  $("#emodal")?.setAttribute("aria-hidden", "true");
  hideFilterPopover();
}

export function openEvents() {
  if (ALL_EVENTS.length === 0) {
    ALL_EVENTS = loadProvinceJsons();
  }
  applyFilters(); // render sesuai FILTERS aktif
  $("#escrim")?.setAttribute("aria-hidden", "false");
  $("#emodal")?.setAttribute("aria-hidden", "false");
  $("#evtList")?.focus();
}

/* ===== init ===== */
export function registerEventsUI() {
  eModal = $("#emodal");
  eScrim = $("#escrim");
  eCloseBtn = $("#eCloseBtn");
  eBody = eModal?.querySelector(".gbody");
  if (!eModal || !eBody) return;

  eCloseBtn?.addEventListener("click", closeEvents);
  eScrim?.addEventListener("click", closeEvents);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && eModal.getAttribute("aria-hidden") === "false")
      closeEvents();
  });

  // buka modal Event (trigger global)
  document.addEventListener("click", (e) => {
    const opener = e.target.closest('[data-open="events"]');
    if (opener) {
      if (opener.tagName === "A") e.preventDefault();
      openEvents();
    }
  });

  // tombol Filter (header emodal)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-open="evt-filters"]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      toggleFilters(btn);
    }
  });

  // expose optional
  window.openEvents = openEvents;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", registerEventsUI);
} else {
  registerEventsUI();
}
