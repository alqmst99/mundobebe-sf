/**
 * CAPA DE DATOS — localStorage + catálogo JSON
 * Misma lógica que el e-commerce de referencia (Pet_Shop).
 */
const DB_KEY = "mundobebe_sf_db_v1";
const CONFIG_OVERRIDE_KEY = "mundobebe_sf_config_v1";
// Detect if we are in /pages/ and adjust path
const CATALOG_URL = (typeof location !== "undefined" && location.pathname.includes("/pages/"))
  ? "../data/catalog.json"
  : "data/catalog.json";

const CATEGORY_ICONS = {
  bodies: "👶",
  conjuntos: "🧸",
  pijamas: "🌙",
  accesorios: "🎀",
  mantitas: "☁️",
  calzado: "👟",
};

const DEFAULT_CATEGORIES = [
  { id: "bodies", name: "Bodies & Enterizos" },
  { id: "conjuntos", name: "Conjuntos" },
  { id: "pijamas", name: "Pijamas" },
  { id: "accesorios", name: "Accesorios" },
  { id: "mantitas", name: "Mantitas & Textiles" },
  { id: "calzado", name: "Calzado" },
];

const SEED_PRODUCTS = [
  {
    id: "p1",
    name: "Body algodón orgánico",
    category: "bodies",
    price: 8900,
    stock: 12,
    description: "Suave y hipoalergénico para pieles sensibles.",
    image: "",
    active: true,
  },
];

let _dbCache = null;
let _catalogPromise = null;

function loadDB() {
  if (_dbCache) return _dbCache;
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      _dbCache = JSON.parse(raw);
      return _dbCache;
    } catch (e) {}
  }
  _dbCache = { categories: DEFAULT_CATEGORIES, products: [] };
  return _dbCache;
}

function saveDB(db) {
  _dbCache = db;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

async function initCatalog(forceReload = false) {
  let existingDB = null;
  if (!forceReload) {
    const existing = localStorage.getItem(DB_KEY);
    if (existing) {
      try {
        existingDB = JSON.parse(existing);
      } catch (e) {}
    }
  }

  if (_catalogPromise && !forceReload) return _catalogPromise;

  _catalogPromise = (async () => {
    try {
      const res = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (existingDB && existingDB.catalogVersion === data.catalogVersion && existingDB.products?.length >= 8) {
        _dbCache = existingDB;
        return existingDB;
      }
      const categories = data.categories && data.categories.length
        ? data.categories
        : DEFAULT_CATEGORIES;
      const products = (data.products || []).map(normalizeProduct);
      const db = { catalogVersion: data.catalogVersion, categories, products };
      saveDB(db);
      console.info("[Store] Catálogo cargado:", products.length, "productos");
      return db;
    } catch (err) {
      console.warn("[Store] No se pudo cargar catalog.json, usando seed.", err);
      if (existingDB && existingDB.products?.length) {
        _dbCache = existingDB;
        return existingDB;
      }
      const db = { categories: DEFAULT_CATEGORIES, products: SEED_PRODUCTS };
      saveDB(db);
      return db;
    }
  })();

  return _catalogPromise;
}

function normalizeProduct(p) {
  const images = Array.isArray(p.images) && p.images.length
    ? p.images
    : (p.image ? [p.image] : []);
  return {
    id: String(p.id || "p" + Date.now()),
    name: p.name || "Sin nombre",
    category: p.category || "accesorios",
    price: Number(p.price) || 0,
    stock: typeof p.stock === "number" ? p.stock : p.stock ? 10 : 0,
    description: p.description || "",
    image: p.image || images[0] || "",
    images,
    active: p.active !== false,
    featured: !!p.featured,
    sku: p.sku || null,
    brand: p.brand || null,
    regularPrice: p.regularPrice != null ? Number(p.regularPrice) : null,
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    material: p.material || "",
    care: p.care || "",
    details: p.details || "",
  };
}

const Store = {
  init: initCatalog,

  getCategories() {
    return loadDB().categories;
  },

  getCategoryName(id) {
    const c = this.getCategories().find((c) => c.id === id);
    return c ? c.name : id;
  },

  getProducts({ onlyActive = true } = {}) {
    const db = loadDB();
    return onlyActive ? db.products.filter((p) => p.active) : db.products;
  },

  getProduct(id) {
    return loadDB().products.find((p) => p.id === id);
  },

  getFeatured() {
    return this.getProducts().filter((p) => p.featured);
  },

  saveProduct(product) {
    const db = loadDB();
    if (product.id) {
      const idx = db.products.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        db.products[idx] = { ...db.products[idx], ...product };
      } else {
        db.products.push(normalizeProduct(product));
      }
    } else {
      product.id = "p" + Date.now();
      db.products.push(normalizeProduct(product));
    }
    saveDB(db);
    return product;
  },

  deleteProduct(id) {
    const db = loadDB();
    db.products = db.products.filter((p) => p.id !== id);
    saveDB(db);
  },

  setStock(id, stock) {
    const db = loadDB();
    const p = db.products.find((p) => p.id === id);
    if (p) {
      p.stock = Math.max(0, stock);
      saveDB(db);
    }
  },

  exportJSON() {
    return JSON.stringify(loadDB(), null, 2);
  },

  importJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed.categories || !parsed.products) throw new Error("Formato inválido");
    parsed.products = parsed.products.map(normalizeProduct);
    saveDB(parsed);
  },

  async resetToCatalog() {
    localStorage.removeItem(DB_KEY);
    _dbCache = null;
    _catalogPromise = null;
    return initCatalog(true);
  },

  getConfig() {
    const raw = localStorage.getItem(CONFIG_OVERRIDE_KEY);
    const override = raw ? JSON.parse(raw) : {};
    return { ...SITE_CONFIG, ...override };
  },

  setConfig(partial) {
    const current = this.getConfig();
    const updated = { ...current, ...partial };
    localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(updated));
  },
};

const CATEGORY_COLORS = {
  bodies: "#E8A0BF",
  conjuntos: "#A8D5E5",
  pijamas: "#C9B1FF",
  accesorios: "#F7C59F",
  mantitas: "#B8E0D2",
  calzado: "#F2D0A4",
};

function placeholderImage(category, name) {
  const color = CATEGORY_COLORS[category] || "#E8A0BF";
  const icon = CATEGORY_ICONS[category] || "👶";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <rect width="400" height="400" fill="${color}" opacity="0.25"/>
      <circle cx="200" cy="160" r="70" fill="${color}" opacity="0.35"/>
      <text x="200" y="185" font-size="70" text-anchor="middle">${icon}</text>
      <text x="200" y="260" font-size="15" fill="#5a4a5a" text-anchor="middle" font-family="sans-serif" opacity="0.75">Foto próximamente</text>
    </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
