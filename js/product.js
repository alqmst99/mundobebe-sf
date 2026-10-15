/**
 * Ficha de producto — detalle completo e-commerce ropa bebé
 */



/**
 * Devuelve el prefijo correcto según la página actual.
 * Raíz → "./"
 * Subpáginas (producto.html, etc.) → "../"
 */
function getImageBase() {
  const path = location.pathname;

  if (
    path === "/" ||
    path.endsWith("/") ||
    path.endsWith("/index.html") ||
    path.endsWith("index.html")
  ) {
    return "./";
  }
  return "../";
}

/**
 * Normaliza cualquier ruta de imagen para que funcione en la página actual.
 */
function resolveImage(src) {
  if (!src) return "";
  // Si ya es URL absoluta o data URI, no la tocamos
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  // Quitamos posibles "./" o "/" del inicio
  const clean = src.replace(/^\.?\/+/, "");
  return getImageBase() + clean;
}


(function () {
  if (!document.getElementById("pdp-root")) return;

  const params = new URLSearchParams(location.search);
  const productId = params.get("id");
  let selectedSize = null;
  let selectedColor = null;
  let qty = 1;
  let currentImg = 0;
  let product = null;

  function money(n) {
    const CFG = Store.getConfig();
    return CFG.currency + Number(n).toLocaleString("es-AR");
  }

  function waLink(message) {
    const CFG = Store.getConfig();
    return `https://wa.me/${CFG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  }

  // Reuse cart from main if available via localStorage key
  const CART_KEY = "mundobebe_sf_cart_v1";
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // trigger main.js re-render via storage event won't fire same tab — dispatch custom
    window.dispatchEvent(new Event("cart-updated"));
    // also update badges manually if main already painted
    const count = cart.reduce((s, l) => s + l.qty, 0);
    document.querySelectorAll(".cart-badge").forEach((el) => {
      el.textContent = count;
      el.classList.toggle("show", count > 0);
    });
  }

  function addVariantToCart() {
    if (!product || product.stock <= 0) return;
    if (product.sizes && product.sizes.length && !selectedSize) {
      showToast("Elegí un talle");
      return;
    }
    if (product.colors && product.colors.length && !selectedColor) {
      showToast("Elegí un color");
      return;
    }
    // Line id includes size/color so variants don't merge incorrectly
    const lineId = product.id + (selectedSize ? "|" + selectedSize : "") + (selectedColor ? "|" + selectedColor : "");
    const cart = getCart();
    const line = cart.find((i) => i.id === lineId);
    const currentQty = line ? line.qty : 0;
    if (currentQty + qty > product.stock) {
      showToast("No hay más stock disponible");
      return;
    }
    if (line) line.qty += qty;
    else {
      cart.push({
        id: lineId,
        productId: product.id,
        qty,
        size: selectedSize,
        color: selectedColor,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }
    setCart(cart);
    showToast(`Agregado: ${product.name}${selectedSize ? " · " + selectedSize : ""}${selectedColor ? " · " + selectedColor : ""}`);
  }

  function buyNowWhatsApp() {
    if (!product) return;
    if (product.sizes && product.sizes.length && !selectedSize) {
      showToast("Elegí un talle");
      return;
    }
    if (product.colors && product.colors.length && !selectedColor) {
      showToast("Elegí un color");
      return;
    }
    const CFG = Store.getConfig();
    const lines = [
      CFG.orderMessagePrefix,
      "",
      `• ${qty} x ${product.name}`,
      selectedSize ? `  Talle: ${selectedSize}` : null,
      selectedColor ? `  Color: ${selectedColor}` : null,
      `  ${money(product.price * qty)}`,
      "",
      `Total: ${money(product.price * qty)}`,
      "",
      "¿Me confirmás disponibilidad y forma de envío/pago?",
    ].filter(Boolean);
    window.open(waLink(lines.join("\n")), "_blank");
  }

function renderGallery(p) {
  const imgs = [...new Set([...(p.images || []), p.image].filter(Boolean))]
    .map(resolveImage);   // ← acá se corrigen las rutas

  if (!imgs.length) {
    imgs.push(resolveImage(placeholderImage(p.category, p.name)));
  }

  currentImg = Math.min(currentImg, imgs.length - 1);
  const main = imgs[currentImg] || resolveImage(placeholderImage(p.category, p.name));

  return `
    <div class="pdp-gallery">
      <div class="pdp-main-img">
        <img id="pdp-main-photo" src="${main}" alt="${p.name}" referrerpolicy="no-referrer">
        ${imgs.length > 1 ? `
        <button type="button" class="pdp-gallery-nav prev" data-gallery-step="-1" aria-label="Ver foto anterior">‹</button>
        <button type="button" class="pdp-gallery-nav next" data-gallery-step="1" aria-label="Ver foto siguiente">›</button>
        <span class="pdp-gallery-count" id="pdp-gallery-count" aria-live="polite">${currentImg + 1} / ${imgs.length}</span>
        ` : ""}
      </div>
      ${imgs.length > 1 ? `
      <div class="pdp-thumbs">
        ${imgs.map((src, i) => `
          <button type="button" class="pdp-thumb ${i === currentImg ? "active" : ""}" data-thumb="${i}" aria-label="Foto ${i + 1}">
            <img src="${src}" alt="" referrerpolicy="no-referrer">
          </button>
        `).join("")}
      </div>` : ""}
    </div>
  `;
}

  function renderInfo(p) {
    const out = p.stock <= 0;
    const hasSale = p.salePrice != null && p.regularPrice != null && p.salePrice < p.regularPrice;
    const sizes = p.sizes || [];
    const colors = p.colors || [];
    if (sizes.length && !selectedSize) selectedSize = sizes[0];
    if (colors.length && !selectedColor) selectedColor = colors[0].name;

    return `
      <div class="pdp-info">
        <div class="pdp-cat">${Store.getCategoryName(p.category)}${p.brand ? " · " + p.brand : ""}</div>
        <h1>${p.name}</h1>
        <div class="pdp-price-row">
          ${hasSale ? `<span class="pdp-price-old">${money(p.regularPrice)}</span>` : ""}
          <span class="pdp-price">${money(p.price)}</span>
        </div>
        <div class="pdp-stock ${out ? "out" : ""}">${out ? "Sin stock" : "Disponible · " + p.stock + " en stock"}</div>
        <p class="pdp-desc">${p.description || ""}</p>

        ${sizes.length ? `
        <div class="pdp-option">
          <label>Talle${selectedSize ? ": <strong>" + selectedSize + "</strong>" : ""}</label>
          <div class="pdp-sizes">
            ${sizes.map(sz => `
              <button type="button" class="pdp-size-btn ${selectedSize === sz ? "active" : ""}" data-size="${sz}">${sz}</button>
            `).join("")}
          </div>
        </div>` : ""}

        ${colors.length ? `
        <div class="pdp-option">
          <label>Color${selectedColor ? ": <strong>" + selectedColor + "</strong>" : ""}</label>
          <div class="pdp-colors">
            ${colors.map(c => `
              <button type="button" class="pdp-color-btn ${selectedColor === c.name ? "active" : ""}" data-color="${c.name}" title="${c.name}" aria-label="${c.name}">
                <span style="background:${c.hex}"></span>
              </button>
            `).join("")}
          </div>
        </div>` : ""}

        <div class="pdp-option">
          <label>Cantidad</label>
          <div class="pdp-qty">
            <button type="button" id="qty-dec" aria-label="Restar">−</button>
            <span id="qty-val">${qty}</span>
            <button type="button" id="qty-inc" aria-label="Sumar">+</button>
          </div>
        </div>

        <div class="pdp-actions">
          <button type="button" class="btn btn-primary" id="pdp-add" ${out ? "disabled" : ""}>Agregar al carrito</button>
          <button type="button" class="btn btn-whatsapp" id="pdp-buy" ${out ? "disabled" : ""}>Comprar por WhatsApp</button>
        </div>

        <dl class="pdp-meta">
          ${p.sku ? `<div class="pdp-meta-row"><dt>SKU</dt><dd>${p.sku}</dd></div>` : ""}
          ${p.material ? `<div class="pdp-meta-row"><dt>Material</dt><dd>${p.material}</dd></div>` : ""}
          ${p.care ? `<div class="pdp-meta-row"><dt>Cuidado</dt><dd>${p.care}</dd></div>` : ""}
        </dl>

        ${p.details ? `
        <div class="pdp-tabs">
          <h2>Detalles</h2>
          <p>${p.details}</p>
        </div>` : ""}
      </div>
    `;
  }

  function bindPdpEvents(p) {
    const imgs = [...new Set([...(p.images || []), p.image].filter(Boolean))];
    const showImage = (index) => {
      if (!imgs.length) return;
      currentImg = (index + imgs.length) % imgs.length;
      const photo = document.getElementById("pdp-main-photo");
      if (photo) photo.src = imgs[currentImg];
      document.querySelectorAll(".pdp-thumb").forEach((thumb, i) => {
        thumb.classList.toggle("active", i === currentImg);
      });
      const count = document.getElementById("pdp-gallery-count");
      if (count) count.textContent = `${currentImg + 1} / ${imgs.length}`;
    };

    document.querySelectorAll("[data-thumb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showImage(Number(btn.dataset.thumb));
      });
    });
    document.querySelectorAll("[data-gallery-step]").forEach((btn) => {
      btn.addEventListener("click", () => showImage(currentImg + Number(btn.dataset.galleryStep)));
    });
    document.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSize = btn.dataset.size;
        document.querySelectorAll(".pdp-size-btn").forEach((b) => b.classList.toggle("active", b.dataset.size === selectedSize));
        const lab = document.querySelector(".pdp-option label");
        // refresh label text for size
        document.querySelectorAll(".pdp-option").forEach((opt) => {
          const l = opt.querySelector("label");
          if (l && l.textContent.startsWith("Talle")) l.innerHTML = `Talle: <strong>${selectedSize}</strong>`;
        });
      });
    });
    document.querySelectorAll("[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedColor = btn.dataset.color;
        document.querySelectorAll(".pdp-color-btn").forEach((b) => b.classList.toggle("active", b.dataset.color === selectedColor));
        document.querySelectorAll(".pdp-option").forEach((opt) => {
          const l = opt.querySelector("label");
          if (l && l.textContent.startsWith("Color")) l.innerHTML = `Color: <strong>${selectedColor}</strong>`;
        });
      });
    });
    document.getElementById("qty-dec")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      const el = document.getElementById("qty-val");
      if (el) el.textContent = qty;
    });
    document.getElementById("qty-inc")?.addEventListener("click", () => {
      qty = Math.min(product.stock, qty + 1);
      const el = document.getElementById("qty-val");
      if (el) el.textContent = qty;
    });
    document.getElementById("pdp-add")?.addEventListener("click", addVariantToCart);
    document.getElementById("pdp-buy")?.addEventListener("click", buyNowWhatsApp);
  }

function renderRelated(p) {
  const related = Store.getProducts()
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);

  const wrap = document.getElementById("pdp-related");
  const grid = document.getElementById("related-grid");

  if (!related.length || !grid) {
    if (wrap) wrap.style.display = "none";
    return;
  }

  wrap.style.display = "";
  grid.innerHTML = related.map((r) => {
    const img = resolveImage(r.image || placeholderImage(r.category, r.name)); // ← acá también
    const safe = (r.name || "").replace(/"/g, "&quot;");
    return `
      <article class="card">
        <a class="card-link" href="producto.html?id=${encodeURIComponent(r.id)}">
          <div class="card-media">
            <img src="${img}" alt="${safe}" loading="lazy" referrerpolicy="no-referrer">
          </div>
          <div class="card-body">
            <span class="card-cat">${Store.getCategoryName(r.category)}</span>
            <h3 class="card-title">${r.name}</h3>
            <div class="card-footer">
              <span class="card-price">${money(r.price)}</span>
            </div>
          </div>
        </a>
      </article>`;
  }).join("");
}

  async function init() {
    await Store.init();
    const loading = document.getElementById("pdp-loading");
    const root = document.getElementById("pdp-root");
    product = productId ? Store.getProduct(productId) : null;

    if (!product) {
      if (loading) loading.textContent = "Producto no encontrado.";
      return;
    }

    document.title = product.name + " — Mundo Bebé SF";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = product.description || product.name;

    const bc = document.getElementById("bc-name");
    if (bc) bc.textContent = product.name;

    root.innerHTML = `
      <div class="pdp-grid">
        ${renderGallery(product)}
        ${renderInfo(product)}
      </div>
    `;
    if (loading) loading.style.display = "none";
    root.style.display = "";
    bindPdpEvents(product);
    renderRelated(product);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Wait a tick so main.js can also init cart UI
    setTimeout(init, 50);
  });
})();
