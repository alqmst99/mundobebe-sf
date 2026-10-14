# Mundo Bebé SF — Tienda online

Sitio multi-página para tienda de ropa y accesorios de bebé, inspirado en el estilo elegante de [Bell Vita](https://www.bell-vita.com/) y con la lógica de carrito + WhatsApp del [Pet_Shop](https://github.com/alqmst99/Pet_Shop).

## Características

- **Home** con hero premium, destacados, nosotros y contacto
- **Catálogo** con filtros por categoría, búsqueda y paginación
- **Carrito** en localStorage → pedido prearmado por WhatsApp
- **Términos y condiciones** y **Política de privacidad**
- **robots.txt**, **sitemap.xml** y **llms.txt** (indexación para buscadores y LLMs)
- Catálogo en JSON (`data/catalog.json`) — mismo esquema que e-commerce de referencia
- Colores pasteles suaves (blush, sky, mint, cream) acordes a tienda de bebé

## Estructura

```
mundobebe-sf/
├── index.html
├── robots.txt
├── sitemap.xml
├── llms.txt
├── css/style.css
├── js/
│   ├── config.js      ← número WhatsApp, nombre, horarios, IG
│   ├── store.js       ← carga catalog.json + localStorage
│   └── main.js        ← carrito, UI, WhatsApp
├── data/catalog.json  ← productos y categorías
└── pages/
    ├── catalogo.html
    ├── terminos.html
    └── privacidad.html
```

## Configuración rápida

1. Abrí `js/config.js` y cambiá:
   - `whatsappNumber`: número con código de país, sin + ni espacios (ej. `5493421234567`)
   - `instagram`, `email`, `address`, `hours`
2. Editá productos en `data/catalog.json` (o reemplazá las imágenes de Unsplash por fotos reales).
3. Subí la carpeta a cualquier hosting estático (Netlify, GitHub Pages, Vercel, cPanel).

## Instagram del cliente

- [https://www.instagram.com/mundobebe.sf/](https://www.instagram.com/mundobebe.sf/)
- Bio: ropa, mantitas y accesorios · pedidos por DM · envíos a domicilio

## Notas

- No hay Facebook asociado.
- Las imágenes de muestra son de Unsplash (uso libre). Reemplazalas por fotos propias del stock.
- El dominio en sitemap/robots/canonical es placeholder `https://mundobebe.sf/` — actualizalo al dominio real al publicar.
