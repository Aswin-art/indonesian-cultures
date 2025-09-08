// src/map/markers.js
export function addProvinceMarkers({
  map,
  provinces,
  assets,
  H,
  W,
  onSelect,
  fadeBorder,
  audioCtl,
  computeOffsetCenter,
}) {
  const createdMarkers = [];

  provinces.forEach((p) => {
    const lat = p.y * H,
      lng = p.x * W;

    const el = document.createElement("div");
    el.className = "prov-icon";
    el.innerHTML = `<img src="${assets.icons[p.id]}" alt="${p.id}">`;

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: el,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
      pane: "icons",
      riseOnHover: true,
    }).addTo(map);

    // === Tooltip permanen; kita kontrol visibilitas via class ===
    const tt = L.tooltip({
      permanent: true, // selalu terpasang ke marker (anchor fix)
      direction: "top", // di atas ikon
      offset: [0, -28], // jarak dari ikon
      className: "prov-label", // styling & animasi di CSS
      opacity: 1, // biar diatur CSS
      sticky: false, // penting: JANGAN mengikuti kursor
    }).setContent(
      `<span class="label-text">${p.id}</span><span class="reveal-line"></span>`
    );

    marker.bindTooltip(tt);

    // Saat marker sudah ada di map, set awal: hidden
    marker.on("add", () => {
      const el = marker.getTooltip()?.getElement();
      if (el) el.classList.add("is-hidden");
    });

    marker.on("mouseover", () => {
      fadeBorder?.(p.id, 1);
      audioCtl?.playHoverSfx?.();
      const el = marker.getTooltip()?.getElement();
      if (el) {
        el.classList.remove("is-hidden");
        el.classList.add("is-visible");
      }
    });

    // Sedikit delay agar transisi keluar terasa halus
    let hideT;
    marker.on("mouseout", () => {
      fadeBorder?.(p.id, 0);
      clearTimeout(hideT);
      hideT = setTimeout(() => {
        const el = marker.getTooltip()?.getElement();
        if (el) {
          el.classList.remove("is-visible");
          el.classList.add("is-hidden");
        }
      }, 80);
    });

    marker.on("click", () => {
      audioCtl?.playClickSfx?.();
      const zMax = map.getMaxZoom();
      const centerMax = computeOffsetCenter([lat, lng], zMax);
      map.flyTo(centerMax, zMax, {
        animate: true,
        duration: 0.85,
        easeLinearity: 0.24,
      });
      map.once("moveend", () => onSelect?.(p));
    });

    createdMarkers.push(marker);
  });

  return createdMarkers;
}
