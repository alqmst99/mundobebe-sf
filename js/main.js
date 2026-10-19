(function () {
  const CART_KEY = "mundobebe_sf_cart_v1";

  function productUrl(id) {
    const inPages = location.pathname.includes("/pages/");
    return inPages
      ? "producto.html?id=" + encodeURIComponent(id)
      : "pages/producto.html?id=" + encodeURIComponent(id);
  }

function getImageBase() {
  // Si estamos dentro de /pages/ necesitamos subir un nivel
  if (location.pathname.includes("/pages/")) {
    return "../";
  }
  return "./";
}

function resolveImage(src) {
  if (!src) return "";
  // URLs absolutas o data URI no se tocan
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  // Quitamos posibles "./", "../" o "/" del inicio para recalcular según la página actual
  let clean = String(src).replace(/^(\.\/|\/)+/, "");
  while (clean.startsWith("../")) clean = clean.slice(3);
  return getImageBase() + clean;
}

  let activeCategory = "all";
  let searchQuery = "";
  let visibleCount = 24;
  let heroSlideIndex = 0;
  let heroSlideTimer = null;
  let heroSlidePaused = false;
  const PAGE_SIZE = 24;
  let CFG = Store.getConfig();

  function paintConfig() {
    const brand = document.getElementById("brand-name");
    if (brand) brand.textContent = CFG.businessName;
    const footerBrand = document.getElementById("footer-brand");
    if (footerBrand) footerBrand.textContent = CFG.businessName;
    const topbar = document.getElementById("topbar-hours");
    if (topbar) topbar.textContent = CFG.hours;
    const addr = document.getElementById("contact-address");
    if (addr) addr.textContent = CFG.address;
    const hours = document.getElementById("contact-hours");
    if (hours) hours.textContent = CFG.hours;
    const email = document.getElementById("contact-email");
    if (email) email.textContent = CFG.email;
    const ig = document.getElementById("contact-ig");
    if (ig) {
      ig.href = CFG.instagram;
      ig.textContent = "@mundobebe.sf";
    }
    const fEmail = document.getElementById("footer-email");
    if (fEmail) fEmail.textContent = CFG.email;
    const fAddr = document.getElementById("footer-address");
    if (fAddr) fAddr.textContent = CFG.address;
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function resolveProduct(lineOrId) {
    if (typeof lineOrId === "object" && lineOrId) {
      const pid = lineOrId.productId || String(lineOrId.id || "").split("|")[0];
      return Store.getProduct(pid) || lineOrId;
    }
    const id = String(lineOrId || "");
    return Store.getProduct(id) || Store.getProduct(id.split("|")[0]);
  }

  function money(n) {
    return CFG.currency + Number(n).toLocaleString("es-AR");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartBadge();
    renderDrawer();
    window.dispatchEvent(new Event("cart-updated"));
  }
  function addToCart(productId) {
    const product = Store.getProduct(productId);
    if (!product || product.stock <= 0) return;
    const cart = getCart();
    const line = cart.find((i) => i.id === productId);
    const currentQty = line ? line.qty : 0;
    if (currentQty >= product.stock) {
      showToast("No hay más stock disponible de este producto");
      return;
    }
    if (line) {
      line.qty += 1;
    } else {
      const rawImg = product.image || (product.images && product.images[0]) || "";
      cart.push({
        id: productId,
        productId: productId,
        qty: 1,
        name: product.name,
        price: product.price,
        image: String(rawImg || "").replace(/^(\.\/|\/)+/, "").replace(/^(\.\.\/)+/, ""),
        category: product.category,
      });
    }
    setCart(cart);
    showToast(`Agregado: ${product.name}`);
  }
  function changeQty(productId, delta) {
    const product = resolveProduct(productId);
    const cart = getCart();
    const line = cart.find((i) => i.id === productId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      setCart(cart.filter((i) => i.id !== productId));
    } else if (product && product.stock && line.qty > product.stock) {
      showToast("No hay más stock disponible");
      line.qty -= delta;
    } else {
      setCart(cart);
    }
  }
  function removeFromCart(productId) {
    setCart(getCart().filter((i) => i.id !== productId));
  }
  function cartTotal(cart) {
    return cart.reduce((sum, line) => {
      const p = resolveProduct(line);
      const price = line.price != null ? line.price : p ? p.price : 0;
      return sum + price * line.qty;
    }, 0);
  }

  function renderCategories() {
    const wrap = document.getElementById("cat-scroll");
    if (!wrap) return;
    const cats = Store.getCategories();
    wrap.innerHTML =
      `<button class="cat-chip active" data-cat="all">Todos</button>` +
      cats
        .map(
          (c) =>
            `<button class="cat-chip" data-cat="${c.id}"><span class="emoji">${CATEGORY_ICONS[c.id] || "👶"}</span>${c.name}</button>`,
        )
        .join("");

    wrap.querySelectorAll(".cat-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        visibleCount = PAGE_SIZE;
        wrap
          .querySelectorAll(".cat-chip")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderProducts();
      });
    });
  }

  function filteredProducts() {
    let products = Store.getProducts();
    if (activeCategory !== "all")
      products = products.filter((p) => p.category === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      products = products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q),
      );
    }
    return products;
  }

  function renderProducts() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const products = filteredProducts();
    const countEl = document.getElementById("product-count");
    if (countEl)
      countEl.textContent =
        products.length + " producto" + (products.length === 1 ? "" : "s");

    if (products.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--ink-soft)">No hay productos con ese filtro.</p>`;
      return;
    }

    const slice = products.slice(0, visibleCount);
    grid.innerHTML = slice
      .map((p) => {
        const img = resolveImage(p.image || placeholderImage(p.category, p.name));
        const out = p.stock <= 0;
        const safeName = (p.name || "").replace(/"/g, "&quot;");
        const hasSale =
          p.salePrice != null &&
          p.regularPrice != null &&
          p.salePrice < p.regularPrice;
        const href = productUrl(p.id);
        return `
      <article class="card reveal in">
        <a class="card-link" href="${href}">
          <div class="card-media">
            <img src="${img}" alt="${safeName}" loading="lazy" referrerpolicy="no-referrer">
            <span class="badge-stock ${out ? "badge-out" : ""}">${out ? "Sin stock" : "Disponible"}</span>
            ${hasSale ? '<span class="badge-sale">Oferta</span>' : ""}
          </div>
          <div class="card-body">
            <span class="card-cat">${Store.getCategoryName(p.category)}</span>
            <h3 class="card-title">${p.name}</h3>
            <p class="card-desc">${(p.description || "").slice(0, 90)}${(p.description || "").length > 90 ? "…" : ""}</p>
            <div class="card-footer">
              <span class="card-price">${hasSale ? `<span class="old">${money(p.regularPrice)}</span>` : ""}${money(p.price)}</span>
            </div>
          </div>
        </a>
        <div class="card-footer" style="padding:0 18px 18px;margin-top:-4px">
          <button class="add-btn" data-add="${p.id}" ${out ? "disabled" : ""} aria-label="Agregar al carrito" style="margin-left:auto">+</button>
        </div>
      </article>`;
      })
      .join("");

    if (products.length > visibleCount) {
      grid.innerHTML += `<div class="load-more-wrap"><button class="btn btn-secondary" id="load-more-btn">Ver más (${products.length - visibleCount} restantes)</button></div>`;
      document.getElementById("load-more-btn").addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        renderProducts();
      });
    }

    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(btn.dataset.add);
      });
    });
  }

  function renderFeatured() {
    const grid = document.getElementById("featured-grid");
    if (!grid) return;
    const products = Store.getFeatured().slice(0, 4);
    if (products.length === 0) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML = products
      .map((p) => {
        const img = resolveImage(p.image || placeholderImage(p.category, p.name));
        const out = p.stock <= 0;
        const safeName = (p.name || "").replace(/"/g, "&quot;");
        const href = productUrl(p.id);
        return `
      <article class="card reveal in">
        <a class="card-link" href="${href}">
          <div class="card-media">
            <img src="${img}" alt="${safeName}" loading="lazy" referrerpolicy="no-referrer">
            <span class="badge-stock ${out ? "badge-out" : ""}">${out ? "Sin stock" : "Disponible"}</span>
          </div>
          <div class="card-body">
            <span class="card-cat">${Store.getCategoryName(p.category)}</span>
            <h3 class="card-title">${p.name}</h3>
            <div class="card-footer">
              <span class="card-price">${money(p.price)}</span>
            </div>
          </div>
        </a>
        <div class="card-footer" style="padding:0 18px 18px;margin-top:-4px">
          <button class="add-btn" data-add="${p.id}" ${out ? "disabled" : ""} aria-label="Agregar al carrito" style="margin-left:auto">+</button>
        </div>
      </article>`;
      })
      .join("");
    grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(btn.dataset.add);
      });
    });
  }

  async function renderHeroCarousel() {
    const carousel = document.getElementById("hero-carousel");
    const stage = document.getElementById("hero-carousel-stage");
    const dots = document.getElementById("hero-carousel-dots");
    if (!carousel || !stage) return;

    let products = [];
    try {
      const response = await fetch("data/instagram-featured.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      products = Array.isArray(data.products) ? data.products.slice(0, 4) : [];
    } catch (error) {
      console.warn(
        "[Hero] No se pudieron cargar las publicaciones destacadas.",
        error,
      );
    }
    if (!products.length) {
      carousel.closest(".hero-art").hidden = true;
      return;
    }

    stage.innerHTML = products
      .map((product, index) => {
        const title = (product.title || "Producto destacado").replace(
          /"/g,
          "&quot;",
        );
        return `
        <a class="hero-slide ${index === 0 ? "active" : ""}" href="${product.postUrl}" target="_blank" rel="noopener" role="group" aria-roledescription="diapositiva" aria-label="${index + 1} de ${products.length}" aria-hidden="${index !== 0}" tabindex="${index === 0 ? "0" : "-1"}">
          <img src="${product.image}" alt="${title}" loading="eager" decoding="async">
          <span class="hero-slide-badge">Producto destacado</span>
          <span class="hero-slide-caption">
            <span class="hero-slide-category">${Store.getCategoryName(product.category)}</span>
            <strong>${title}</strong>
            <span class="hero-slide-description">${product.description || "Consultá por talles y disponibilidad."}</span>
          </span>
        </a>`;
      })
      .join("");

    if (dots) {
      dots.innerHTML = products
        .map(
          (_, index) => `
        <button type="button" class="hero-carousel-dot ${index === 0 ? "active" : ""}" data-hero-slide="${index}" aria-label="Ir al producto ${index + 1}" aria-pressed="${index === 0}"></button>
      `,
        )
        .join("");
    }

    const slides = [...stage.querySelectorAll(".hero-slide")];
    const dotButtons = dots
      ? [...dots.querySelectorAll(".hero-carousel-dot")]
      : [];
    const setSlide = (index) => {
      heroSlideIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === heroSlideIndex;
        slide.classList.toggle("active", active);
        slide.setAttribute("aria-hidden", String(!active));
        slide.tabIndex = active ? 0 : -1;
      });
      dotButtons.forEach((dot, i) => {
        const active = i === heroSlideIndex;
        dot.classList.toggle("active", active);
        dot.setAttribute("aria-pressed", String(active));
      });
    };
    const stopTimer = () => {
      clearInterval(heroSlideTimer);
      heroSlideTimer = null;
    };
    const startTimer = () => {
      stopTimer();
      if (
        products.length < 2 ||
        heroSlidePaused ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      heroSlideTimer = setInterval(() => setSlide(heroSlideIndex + 1), 5000);
    };

    document.getElementById("hero-prev")?.addEventListener("click", () => {
      setSlide(heroSlideIndex - 1);
      startTimer();
    });
    document.getElementById("hero-next")?.addEventListener("click", () => {
      setSlide(heroSlideIndex + 1);
      startTimer();
    });
    dotButtons.forEach((dot) =>
      dot.addEventListener("click", () => {
        setSlide(Number(dot.dataset.heroSlide));
        startTimer();
      }),
    );

    const toggle = document.getElementById("hero-toggle");
    toggle?.addEventListener("click", () => {
      heroSlidePaused = !heroSlidePaused;
      toggle.textContent = heroSlidePaused ? "▶" : "Ⅱ";
      toggle.setAttribute(
        "aria-label",
        heroSlidePaused ? "Reanudar carrusel" : "Pausar carrusel",
      );
      startTimer();
    });
    carousel.addEventListener("mouseenter", stopTimer);
    carousel.addEventListener("mouseleave", startTimer);
    carousel.addEventListener("focusin", stopTimer);
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) startTimer();
    });
    startTimer();
  }

  function renderCartBadge() {
    const cart = getCart();
    const count = cart.reduce((s, l) => s + l.qty, 0);
    [
      document.getElementById("cart-badge"),
      document.getElementById("cart-badge-2"),
    ].forEach((el) => {
      if (!el) return;
      el.textContent = count;
      el.classList.toggle("show", count > 0);
    });
  }

  function renderDrawer() {
    const cart = getCart();
    const wrap = document.getElementById("drawer-items");
    if (!wrap) return;
    if (cart.length === 0) {
      wrap.innerHTML = `<div class="drawer-empty"><span class="emoji">👶</span>Tu carrito está vacío.<br>¡Agregá productos del catálogo!</div>`;
    } else {
      wrap.innerHTML = cart
        .map((line) => {
          const p = resolveProduct(line) || {};
          if (!p.id && !line.name && !line.image) return "";
          const rawImg =
            line.image ||
            p.image ||
            (p.images && p.images[0]) ||
            "";
          const img = resolveImage(
            rawImg || placeholderImage(p.category || "bodies", p.name || line.name || "")
          );
          const titleExtra = [line.size, line.color]
            .filter(Boolean)
            .join(" · ");
          const displayName =
            (p.name || line.name || "Producto") +
            (titleExtra ? " (" + titleExtra + ")" : "");
          const price = line.price != null ? line.price : (p.price != null ? p.price : 0);
          return `
        <div class="cart-item">
          <img src="${img}" alt="${displayName}">
          <div class="ci-info">
            <div class="ci-title">${displayName}</div>
            <div class="ci-price">${money(price)} c/u</div>
            <div class="qty-control">
              <button data-dec="${line.id}" aria-label="Restar">−</button>
              <span>${line.qty}</span>
              <button data-inc="${line.id}" aria-label="Sumar">+</button>
              <button class="remove-item" data-remove="${line.id}">Quitar</button>
            </div>
          </div>
        </div>`;
        })
        .join("");

      wrap
        .querySelectorAll("[data-inc]")
        .forEach((b) =>
          b.addEventListener("click", () => changeQty(b.dataset.inc, 1)),
        );
      wrap
        .querySelectorAll("[data-dec]")
        .forEach((b) =>
          b.addEventListener("click", () => changeQty(b.dataset.dec, -1)),
        );
      wrap
        .querySelectorAll("[data-remove]")
        .forEach((b) =>
          b.addEventListener("click", () => removeFromCart(b.dataset.remove)),
        );
    }
    const totalEl = document.getElementById("drawer-total");
    if (totalEl) totalEl.textContent = money(cartTotal(cart));
  }

  function waLink(message) {
    return `https://wa.me/${CFG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function buildOrderMessage() {
    const cart = getCart();
    const lines = cart.map((line) => {
      const p = resolveProduct(line);
      const name = (p && p.name) || line.name || "Producto";
      const extra = [line.size, line.color].filter(Boolean).join(", ");
      const price = line.price != null ? line.price : p ? p.price : 0;
      return `• ${line.qty} x ${name}${extra ? " (" + extra + ")" : ""} — ${money(price * line.qty)}`;
    });
    const total = money(cartTotal(cart));
    return [
      CFG.orderMessagePrefix,
      "",
      ...lines,
      "",
      `Total: ${total}`,
      "",
      "¿Me confirmás disponibilidad y forma de envío/pago?",
    ].join("\n");
  }

  function openDrawer() {
    renderCartBadge();
    renderDrawer();
    document.getElementById("cart-drawer")?.classList.add("open");
    document.getElementById("overlay")?.classList.add("open");
  }
  function closeDrawer() {
    document.getElementById("cart-drawer")?.classList.remove("open");
    document.getElementById("overlay")?.classList.remove("open");
  }

  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function setupReveal() {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => obs.observe(el));
  }

  function setupEntryScreen() {
    const screen = document.getElementById("entry-screen");
    const enterButton = document.getElementById("entry-enter");
    if (!screen || !enterButton) return;

    const storageKey = "mundobebe_entry_seen_v1";
    try {
      if (sessionStorage.getItem(storageKey)) {
        screen.hidden = true;
        return;
      }
    } catch (error) {}

    document.body.classList.add("entry-open");
    enterButton.focus();
    enterButton.addEventListener(
      "click",
      () => {
        screen.classList.add("is-leaving");
        screen.setAttribute("aria-hidden", "true");
        try {
          sessionStorage.setItem(storageKey, "true");
        } catch (error) {}
        setTimeout(() => {
          screen.hidden = true;
          document.body.classList.remove("entry-open");
        }, 550);
      },
      { once: true },
    );
  }

  async function init() {
    setupEntryScreen();
    const loading = document.getElementById("catalog-loading");
    const grid = document.getElementById("product-grid");
    try {
      await Store.init();
    } finally {
      if (loading) loading.style.display = "none";
      if (grid) grid.style.display = "";
    }
    CFG = Store.getConfig();
    paintConfig();
    renderCategories();
    renderProducts();
    renderFeatured();
    await renderHeroCarousel();
    renderCartBadge();
    renderDrawer();
    setupReveal();

    const searchInput = document.getElementById("product-search");
    if (searchInput) {
      let t;
      searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          searchQuery = searchInput.value;
          visibleCount = PAGE_SIZE;
          renderProducts();
        }, 200);
      });
    }

    document
      .getElementById("cart-open-btn")
      ?.addEventListener("click", openDrawer);
    document.getElementById("fab-cart")?.addEventListener("click", openDrawer);
    document
      .getElementById("drawer-close")
      ?.addEventListener("click", closeDrawer);
    document.getElementById("overlay")?.addEventListener("click", closeDrawer);

    document.getElementById("fab-whatsapp")?.addEventListener("click", () => {
      window.open(
        waLink(CFG.contactMessagePrefix + " Quiero más información."),
        "_blank",
      );
    });

    document.getElementById("checkout-btn")?.addEventListener("click", () => {
      const cart = getCart();
      if (cart.length === 0) {
        showToast("Tu carrito está vacío");
        return;
      }
      window.open(waLink(buildOrderMessage()), "_blank");
    });

    document.getElementById("contact-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("cf-name").value.trim();
      const msg = document.getElementById("cf-msg").value.trim();
      const full = `${CFG.contactMessagePrefix}\n\nNombre: ${name}\nMensaje: ${msg}`;
      window.open(waLink(full), "_blank");
    });

    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    if (menuToggle && navLinks) {
      menuToggle.addEventListener("click", () =>
        navLinks.classList.toggle("open"),
      );
      navLinks
        .querySelectorAll("a")
        .forEach((a) =>
          a.addEventListener("click", () => navLinks.classList.remove("open")),
        );
    }

    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY || e.key === "mundobebe_sf_db_v1") {
        renderCartBadge();
        renderDrawer();
        if (e.key === "mundobebe_sf_db_v1") {
          renderCategories();
          renderProducts();
          if (typeof renderFeatured === "function") renderFeatured();
        }
      }
      if (e.key === "mundobebe_sf_config_v1") {
        CFG = Store.getConfig();
        paintConfig();
        renderDrawer();
      }
    });

    window.addEventListener("cart-updated", () => {
      renderCartBadge();
      renderDrawer();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
