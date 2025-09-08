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
    const lat = p.y * H;
    const lng = p.x * W;

    // === Ikon + Label inline (posisi fix di atas ikon) ===
    const el = document.createElement("div");
    el.className = "prov-icon";
    el.innerHTML = `
      <img class="prov-img" src="${assets.icons[p.id]}" alt="${p.id}" />
      <div class="prov-label-inline" aria-hidden="true">
        <span class="label-text">${p.id}</span>
        <span class="reveal-line"></span>
      </div>
    `;

    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: el,
        className: "", // biar pakai kelas custom kita
        iconSize: [40, 40],
        iconAnchor: [20, 20], // anchor di tengah ikon (40/2,40/2)
      }),
      pane: "icons",
      riseOnHover: true,
    }).addTo(map);

    // Hover efek (border + audio). Label dihandle oleh CSS :hover
    marker.on("mouseover", () => {
      fadeBorder?.(p.id, 1);
      audioCtl?.playHoverSfx?.();
    });

    marker.on("mouseout", () => {
      fadeBorder?.(p.id, 0);
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
