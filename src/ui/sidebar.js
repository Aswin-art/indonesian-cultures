// src/ui/sidebar.js
// Sidebar + LoL-like Lightbox (vertical slides: image left + info right)

import { formatCategory } from '../utils/string.util'

export function initSidebar({ assets }) {
  const backdrop = document.getElementById("backdrop");
  const sidebar = document.getElementById("sidebar");
  const sbIcon = document.getElementById("sbIcon");
  const sbTitle = document.getElementById("sbTitle");
  const sbSubtitle = document.getElementById("sbSubtitle");
  const sbList = document.getElementById("sbList");

  // panel sidebar
  const sbHero = document.getElementById("sbHero");
  const sbDesc = document.getElementById("sbDesc");
  const sbGallery = document.getElementById("sbGallery");
  const sbYoutube = document.getElementById("sbYoutube");

  // lightbox (markup sudah ada di HTML)
  const iScrim = document.getElementById("iscrim");
  const iModal = document.getElementById("imodal");
  const imgClose = document.getElementById("imgClose");
  const imgStream = document.getElementById("imgStream");

  let _lightbox = { index: 0 };
  let _obs = null;

  /* -----------------------------------------
     Normalisasi slides per-budaya:
     item boleh {cover|featuredImage|images[0]|image, title|name, desc|description,
                 category, images[], youtubeLink}
  ----------------------------------------- */
  function getSlidesOf(prov) {
    if (Array.isArray(prov.slides) && prov.slides.length) {
      return prov.slides
        .map((s) => {
          const images =
            Array.isArray(s.images) && s.images.length
              ? s.images.filter(Boolean)
              : (s.image ? [s.image] : []);
          // cover prioritas, lalu featuredImage, lalu images[0]
          const cover =
            s.cover ||
            s.featuredImage ||
            (images.length ? images[0] : "") ||
            "";

          return {
            cover,
            title: s.title || s.name || prov.id,
            desc: s.desc || s.description || prov.desc || "",
            category: s.category || s.kategori || "",
            images,
            youtube: s.youtubeLink || s.youtube || s.yt || "",
            province: prov.id,
          };
        })
        .filter((s) => !!s.cover);
    }

    // fallback lama (pakai featuredImage + images level provinsi)
    const imgs = [];
    if (prov.featuredImage) imgs.push(prov.featuredImage);
    if (Array.isArray(prov.images)) imgs.push(...prov.images);

    return imgs.map((src) => ({
      cover: src,
      title: prov.id,
      desc: prov.desc || "",
      category: "",
      images: [src],
      youtube: "",
      province: prov.id,
    }));
  }

  /* ---------- Sidebar render ---------- */
  function renderChips(prov) {
    sbList.innerHTML = "";
    (prov.culture || []).forEach((it) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<img src="${assets?.icons?.[prov.id] || ""}" alt="">
        <strong>${it.t}</strong> ${it.d}`;
      sbList.appendChild(chip);
    });
  }

  function renderGallery(prov) {
    const slides = getSlidesOf(prov);
    sbGallery.innerHTML = "";

    const setActiveCard = (idx) => {
      sbGallery.querySelectorAll(".nox-card").forEach((el, i) => {
        el.classList.toggle("is-active", i === idx);
      });
    };

    slides.forEach((s, i) => {
      const card = document.createElement("a");
      card.href = "#";
      card.className = "nox-card";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveCard(i);
        openLightbox(prov, i);
      });

      const bg = document.createElement("img");
      bg.src = s.cover;
      bg.alt = s.title || "Gallery image";
      bg.className = "nox-card__bg";

      console.log(s);
      const budayaCategory = s.category || "BUDAYA & WARISAN";

      const content = document.createElement("div");
      content.className = "nox-card__content";
      const sub = document.createElement("div");
      sub.className = "nox-sub"; sub.textContent = formatCategory(budayaCategory);
      const ttl = document.createElement("div");
      ttl.className = "nox-title"; ttl.textContent = (s.title || prov.id).toUpperCase();

      content.append(sub, ttl);
      card.append(bg, content);
      sbGallery.appendChild(card);
    });
  }

  function openSidebar(prov) {
    const slides = getSlidesOf(prov);

    // header
    sbIcon.src = assets?.icons?.[prov.id] || "";
    sbTitle.textContent = prov.id;
    sbSubtitle.textContent = "Budaya & Warisan • " + prov.id;

    // hero (klik => buka lightbox)
    if (slides.length) {
      sbHero.src = slides[0].cover;
      sbHero.style.display = "block";
      sbHero.onclick = () => openLightbox(prov, 0);
    } else if (prov.featuredImage) {
      sbHero.src = prov.featuredImage;
      sbHero.style.display = "block";
      sbHero.onclick = () => openLightbox(prov, 0);
    } else {
      sbHero.removeAttribute("src");
      sbHero.style.display = "none";
      sbHero.onclick = null;
    }

    // desc + youtube
    sbDesc.textContent = prov.desc || "";
    if (prov.linkYt) {
      sbYoutube.href = prov.linkYt;
      sbYoutube.style.display = "inline-block";
    } else {
      sbYoutube.style.display = "none";
    }

    renderGallery(prov);
    renderChips(prov);

    // show sidebar
    backdrop.classList.add("active");
    if (window.anime) {
      window.anime({
        targets: sidebar,
        translateX: ["-110%", "0%"],
        duration: 420,
        easing: "easeOutCubic",
      });
    } else {
      sidebar.style.transform = "translateX(0%)";
    }
  }

  function closeSidebar() {
    if (!backdrop.classList.contains("active")) return;
    if (window.anime) {
      window.anime({
        targets: sidebar,
        translateX: ["0%", "-110%"],
        duration: 360,
        easing: "easeInCubic",
        complete: () => backdrop.classList.remove("active"),
      });
    } else {
      sidebar.style.transform = "translateX(-110%)";
      backdrop.classList.remove("active");
    }
  }
  backdrop.addEventListener("click", closeSidebar);

  /* ---------- Lightbox (LoL-like, vertical stream) ---------- */
  const pad = (n) => String(n).padStart(2, "0");

  // helper swap: ganti gambar utama dalam 1 slide
  function swapImageInSlide(slideEl, newIdx) {
    try {
      const photos = JSON.parse(slideEl.dataset.photos || "[]");
      if (!photos.length) return;
      const idx = Math.max(0, Math.min(newIdx, photos.length - 1));
      const img = slideEl.querySelector(".img-wrap img");
      if (img) img.src = photos[idx];

      // update active state pada thumbs
      slideEl.querySelectorAll(".img-thumbs .thumb").forEach((b, i) => {
        b.classList.toggle("is-active", i === idx);
      });

      slideEl.dataset.current = String(idx);
    } catch (e) {
      // ignore
    }
  }

  // build 1 SLIDE per item (thumbs menukar gambar di slide yang sama)
  function buildSlide({
    i, total, title, desc, category, province, youtube, thumbs = []
  }) {
    const slide = document.createElement("article");
    slide.className = "slide";
    slide.dataset.index = i;
    slide.dataset.photos = JSON.stringify(thumbs);
    slide.dataset.current = "0";

    // kiri: gambar (pakai thumbs[0]) + tombol nav antar-ITEM (bukan antar-foto)
    const wrap = document.createElement("div");
    wrap.className = "img-wrap";

    const img = document.createElement("img");
    img.src = thumbs[0] || "";
    img.alt = title || "";
    wrap.appendChild(img);

    if (i > 0) {
      const prev = document.createElement("button");
      prev.className = "img-nav left";
      prev.setAttribute("aria-label", "Sebelumnya");
      prev.textContent = "‹";
      prev.addEventListener("click", () => scrollToIndex(i - 1));
      wrap.appendChild(prev);
    }
    if (i < total - 1) {
      const next = document.createElement("button");
      next.className = "img-nav right";
      next.setAttribute("aria-label", "Berikutnya");
      next.textContent = "›";
      next.addEventListener("click", () => scrollToIndex(i + 1));
      wrap.appendChild(next);
    }

    // kanan: meta + thumbs
    const meta = document.createElement("aside");
    meta.className = "img-meta";

    const locLine = province || "BUDAYA & WARISAN";
    const chips = [
      category ? `<span class="pill">${category}</span>` : "",
      thumbs.length > 1 ? `<span class="pill ghost">${thumbs.length} Foto</span>` : "",
    ].join("");

    const thumbsHtml = thumbs.length > 1
      ? `<div class="img-thumbs" role="list" aria-label="Foto terkait">
           ${thumbs.map((t, ti) =>
        `<button class="thumb ${ti === 0 ? "is-active" : ""}"
                      data-pidx="${ti}" aria-label="Foto ${ti + 1}">
                <img src="${t}" alt="" loading="lazy" />
              </button>`).join("")}
         </div>`
      : "";

    meta.innerHTML = `
      <div class="img-count">${pad(i + 1)} / ${pad(total)}</div>
      <h3 class="img-title">${(title || "").toUpperCase()}</h3>
      <div class="img-sub">${locLine}</div>
      <div class="img-chips">${chips}</div>
      <p class="img-desc">${desc || ""}</p>
      ${thumbsHtml}
      ${youtube
        ? `<div class="img-actions">
               <a class="btn yt" href="${youtube}" target="_blank" rel="noopener">Tonton Video</a>
             </div>`
        : ""
      }
    `;

    slide.appendChild(wrap);
    slide.appendChild(meta);
    return slide;
  }

  function openLightbox(prov, startIndex = 0) {
    const items = getSlidesOf(prov);
    if (!items.length) return;

    _lightbox.index = Math.max(0, Math.min(startIndex, items.length - 1));

    // build stream: 1 item = 1 slide, thumbs = images (dedup cover + images)
    imgStream.innerHTML = "";
    const total = items.length;

    items.forEach((s, i) => {
      const base = [];
      if (s.cover) base.push(s.cover);
      if (Array.isArray(s.images)) {
        for (const x of s.images) if (x && !base.includes(x)) base.push(x);
      }
      imgStream.appendChild(
        buildSlide({
          i, total,
          title: s.title || prov.id,
          desc: s.desc ?? prov.desc ?? "",
          category: s.category || "",
          province: s.province || prov.id,
          youtube: s.youtube || "",
          thumbs: base.length ? base : [s.cover],
        })
      );
    });

    // tampilkan
    iScrim.classList.add("active");
    iModal.classList.add("active");

    attachObserver();
    requestAnimationFrame(() => scrollToIndex(_lightbox.index, false));

    document.addEventListener("keydown", onKey);
  }

  function attachObserver() {
    if (_obs) _obs.disconnect();
    const slides = imgStream.querySelectorAll(".slide");
    _obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            _lightbox.index = Number(en.target.dataset.index || 0);
          }
        });
      },
      { root: imgStream, threshold: 0.6 }
    );
    slides.forEach((s) => _obs.observe(s));
  }

  function scrollToIndex(i, smooth = true) {
    const slides = imgStream.querySelectorAll(".slide");
    if (!slides.length) return;
    const idx = Math.max(0, Math.min(i, slides.length - 1));
    _lightbox.index = idx;
    slides[idx].scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "start",
    });
  }

  function onKey(e) {
    if (e.key === "Escape") return closeLightbox();
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      return scrollToIndex(_lightbox.index + 1);
    if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      return scrollToIndex(_lightbox.index - 1);
  }

  function closeLightbox() {
    iScrim.classList.remove("active");
    iModal.classList.remove("active");
    document.removeEventListener("keydown", onKey);
    if (_obs) { _obs.disconnect(); _obs = null; }
  }

  // bindings
  iScrim.addEventListener("click", closeLightbox);
  imgClose.addEventListener("click", closeLightbox);

  // delegasi klik thumbnail → ganti gambar pada slide yang sama
  document.addEventListener("click", (e) => {
    const t = e.target.closest(".img-thumbs .thumb");
    if (!t) return;
    const slide = t.closest(".slide");
    if (!slide) return;
    const idx = Number(t.getAttribute("data-pidx"));
    if (!Number.isFinite(idx)) return;
    swapImageInSlide(slide, idx);
  });

  // API
  return {
    openSidebar,
    closeSidebar,
    isOpen: () => backdrop.classList.contains("active"),
    backdropEl: backdrop,
  };
}
