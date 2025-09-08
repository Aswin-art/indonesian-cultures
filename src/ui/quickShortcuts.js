// src/ui/quickShortcuts.js
// UI & logic Quick Shortcuts: build data dari PROVINCES, filter, navigasi keyboard,
// flyTo dengan offset center, dan buka sidebar.

import { formatCategory } from "../utils/string.util.js";

export function initQuickShortcuts({
  map,
  H,
  W,
  assets,
  provinces,
  audioCtl,
  showModal,
  hideModal,
  computeOffsetCenter,
  openSidebar, // callback untuk membuka sidebar setelah fly anim selesai
}) {
  const qscrim = document.getElementById("qscrim");
  const qmodal = document.getElementById("qmodal");
  const qinput = document.getElementById("qinput");
  const qlist = document.getElementById("qlist");

  // Build quick shortcuts dari PROVINCES (1 item per budaya)
  const SHORTCUTS = provinces.flatMap((p) =>
    (p.slides || []).map((c, idx) => ({
      id: `${p.id}::${c.category}::${idx}`,
      title: `${formatCategory(c.category)} — ${c.title}`,
      provId: p.id,
      prov: p,
      lat: p.y * H,
      lng: p.x * W,
      meta: c,
    }))
  );

  let filtered = SHORTCUTS.slice();
  let activeIndex = 0;

  function renderList(items, active = 0) {
    if (!qlist) return;
    qlist.innerHTML = "";
    if (!items || items.length === 0) return;

    items.forEach((it, i) => {
      const el = document.createElement("div");
      el.className = "qitem";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-selected", i === active ? "true" : "false");
      el.innerHTML = `
        <div class="qicon"><img style="width:100%;" src="${assets.icons[it.provId] || ""
        }" alt="${it.provId}"></div>
        <div class="qtitle">${it.title}</div>
        <div class="qdesc">${it.provId}</div>
      `;
      el.addEventListener("click", () => selectIndex(i));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") selectIndex(i);
      });
      qlist.appendChild(el);
    });

    activeIndex = Math.max(0, Math.min(active, items.length - 1));
    qlist.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  function filterList(q) {
    if (!q || !q.trim()) filtered = SHORTCUTS.slice();
    else {
      const qq = q.trim().toLowerCase();
      filtered = SHORTCUTS.filter((it) =>
        `${it.title} ${it.provId}`.toLowerCase().includes(qq)
      );
    }
    renderList(filtered, 0);
  }

  function selectIndex(i) {
    const it = filtered[i];
    if (!it) return;
    const target = L.latLng(it.lat, it.lng);
    const desiredZoom = Math.min(
      map.getMaxZoom(),
      (map.getMinZoom() + map.getMaxZoom()) / 2 + 1.2
    );

    map.flyTo(computeOffsetCenter(target, desiredZoom), desiredZoom, {
      animate: true,
      duration: 1.0,
    });
    audioCtl?.playClickSfx?.();
    hideModal("qmodal");
    setTimeout(() => openSidebar?.(it.prov), 1050);
  }

  // Public open() jika ingin memunculkan modal + fokus input
  function open() {
    if (!qinput) return;
    qinput.value = "";
    filterList("");
    showModal("qmodal");
    setTimeout(() => qinput?.focus(), 80);
  }

  // Wiring events
  qscrim?.addEventListener("click", () => hideModal("qmodal"));
  qinput?.addEventListener("input", (e) => filterList(e.target.value));

  window.addEventListener("keydown", (e) => {
    if (!qmodal || !qmodal.classList.contains("active")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, filtered.length - 1);
      setActive(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeIndex - 1, 0);
      setActive(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectIndex(activeIndex);
    }
  });

  function setActive(i) {
    if (!qlist) return;
    const prev = qlist.children[activeIndex];
    if (prev) prev.setAttribute("aria-selected", "false");
    activeIndex = i;
    const cur = qlist.children[activeIndex];
    if (cur) {
      cur.setAttribute("aria-selected", "true");
      cur.scrollIntoView({ block: "nearest" });
    }
  }

  document.addEventListener("focusin", (e) => {
    const isActive = qmodal && qmodal.classList.contains("active");
    if (!isActive) return;
    if (!qmodal.contains(e.target)) qinput?.focus(); // trap fokus di input
  });

  // Render awal (kosong -> semua)
  renderList(filtered, 0);

  return { open };
}

