# Diseño: Mobile-responsive + rendimiento de carga en Ecopia Tienda

Fecha: 2026-08-04
Estado: Aprobado por el usuario el 2026-08-04 ("Ejecuta")
Repo: `/mnt/homelab/projects/tienda` (branch `master`)

## Contexto y problemas

Frontend estático Vite + React 18 + Tailwind 3, desplegado a GitHub Pages. Datos en
Supabase, media servida desde `media.githubusercontent.com` (repo raw `Flamering/fish-media`).
Todo el estado vive en `src/App.jsx` (621 líneas, un solo componente).

Problemas reportados:

1. **Mobile no funcional por completo**: el scroll principal con carga de elementos
   (`IntersectionObserver` + `visibleCount`) falla porque `h-screen` (100vh) sobredimensiona
   el área de scroll en móviles (barra del navegador), y el nav `fixed bottom-0` tapa el
   loader "Cargando más..." y las últimas filas, por lo que el sentinel nunca entra en vista.
2. **Carga lenta/pesada**: fetch completo de `peces` + `catalogo_productos_proveedor.select('*')`
   en una sola llamada; imágenes servidas a resolución completa sin resize, compresión,
   `aspect-ratio` ni prioridad de carga.
3. **Diseño poco adaptado a mobile**: cards con texto diminuto, sin safe-area iOS, sin
   fallback de viewport dinámico.

Hallazgos adicionales del diagnóstico:

- Componentes `Carousel`, `ProductModal`, `CartDrawer`, `ProductCard`, `ProductTableRow`
  se definen DENTRO de `App` → React los desmonta/remonta en cada render (pérdida de estado,
  el carrusel se resetea, el video se reinicia).
- Dead code: carrito/checkout completo (`HIDE_CART=true`, `HIDE_PRICES=true`), `buttonsDisabled`
  (nunca cambia), ramas duplicadas de render grid/list, y 6 de 8 exports sin uso en
  `src/lib/githubMedia.jsx` (`getVideoUrl`, `getVideoPosterUrl`, `parseMultipleUrls`,
  `formatMediaUrl`, `isGithubMediaUrl`, `MediaRenderer`).

## Decisiones de alcance (aprobadas)

1. **Alcance**: diagnóstico + worktree + plan, y ejecución tras aprobación. El usuario
   aprobó y ordenó ejecutar.
2. **Media**: usar proxy `images.weserv.nl` (resize + webp on-the-fly) como implementación
   primaria; documentar pre-generación de thumbnails en `fish-media` como fase 2 opcional.
3. **Paginación**: server-side con `supabase.range()`; búsqueda y categoría como filtros
   server-side.
4. **Dead code**: remover carrito/checkout y todo el código muerto asociado.

## Diseño

### 1. Layout mobile

- `src/App.jsx:496` `h-screen` → `min-h-dvh` con fallback `min-h-screen` (los navegadores
  modernos respetan `dvh`; el fallback cubre los antiguos).
- `main` recibe `pb-[calc(4rem+env(safe-area-inset-bottom))]` para que el nav inferior no
  oculte el loader ni la última fila.
- `index.html`: agregar `viewport-fit=cover` al meta viewport.
- `BottomNav`: `pb-[env(safe-area-inset-bottom)]`.

### 2. Paginación server-side + scroll infinito

- `src/hooks/usePeces.js`: estado `peces`, `hasMore`, `loading`, `loadingMore`, `error`.
  - Consulta: `supabase.from('peces').select('id, nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url, estado')`
    `.eq('eliminado', false).eq('estado', 'Activo')`
    `.order('nombre_comun')`
    `.range(from, to)` con pageSize 12 (y 8 por carga adicional).
  - Búsqueda: `.ilike` sobre `nombre_comun` + `.or()` con `nombre_cientifico` y `clasificacion`.
  - Categoría: `.eq('clasificacion', cat)`.
  - `hasMore = data.length === pageSize`.
- `src/hooks/useDebounce.js`: debounce 300ms para búsqueda.
- `src/hooks/useInfiniteScroll.js`: `IntersectionObserver` con `root` = contenedor `main`,
  `rootMargin: '0px 0px -80px 0px'`, `threshold: 0.1`; dispara `onLoadMore` solo si
  `hasMore && !loadingMore`.
- Precios: NO se consultan ni se muestran. `HIDE_PRICES=true` los mantenía ocultos; se
  elimina tanto el fetch de `catalogo_productos_proveedor` como la lógica de render para
  no reintroducir dead code. Re-activarlos requiere una consulta y un span (cambio pequeño,
  documentado en el plan).

### 3. Optimización de media

- `src/lib/media.js` (reemplaza `githubMedia.jsx`):
  - `getImageUrl(filename, { w = 400, q = 75 } = {})` → proxy wsrv.nl:
    `https://images.weserv.nl/?url=${encodeURIComponent(BASE_URL + filename)}&w=${w}&output=webp&q=${q}`.
  - `getMediaUrl(filename)` para video (sin proxy, mantiene URL raw).
  - Fallback: en `onError` del `<img>`, `e.target.src = getMediaUrl(filename)` (URL original).
- Cards: `aspect-[4/3]`, `decoding="async"`, `fetchpriority="low"`.
- Modal/carousel: imágenes a `w=1000`.
- Fase 2 (no bloqueante, documentada): pre-generar `thumbs/` en `fish-media` y usarla si
  `filename` está disponible; controlado por constante `MEDIA_MODE`.

### 4. Refactor de componentes

- `src/components/Header.jsx`
- `src/components/SearchBar.jsx`
- `src/components/CategoryFilter.jsx`
- `src/components/ProductGrid.jsx` (grid y list)
- `src/components/ProductCard.jsx`
- `src/components/ProductModal.jsx`
- `src/components/Carousel.jsx`
- `src/components/BottomNav.jsx`
- `src/hooks/usePeces.js`, `src/hooks/useInfiniteScroll.js`, `src/hooks/useDebounce.js`
- `src/lib/media.js`, `src/lib/supabase.js` (sin cambios)
- `src/App.jsx` queda orquestando componentes.

### 5. Remoción de dead code

- Eliminar estado de carrito (`cart`, `showCart`, `checkoutStep`, `orderPlaced`, `cliente`),
  `CartDrawer`, `addToCart`, `removeFromCart`, `updateQuantity`, `placeOrder`, `cartTotal`,
  `cartCount`, y el `localStorage 'ecopia-cart'`.
- Eliminar `HIDE_CART`, `HIDE_PRICES`, `buttonsDisabled`, y el fetch de precios de
  `catalogo_productos_proveedor`.
- Eliminar `ProductTableRow` (se unifica en `ProductCard` con modo list).
- `githubMedia.jsx` → `media.js` con solo helpers usados.
- Unificar ramas duplicadas de render (grid/list).

## Qué se logra

- Mobile 100% funcional: scroll infinito dispara correctamente, modal y carrusel estables,
  safe-area iOS, nav no tapa contenido.
- Carga significativamente más ligera: imágenes webp redimensionadas (~80–90% menos bytes),
  paginación server-side, fetch mínimo de columnas.
- Código mantenible: App.jsx orquestador + componentes/hooks con una sola responsabilidad.

## Qué se pierde / se rompe

- Carrito y checkout (ya ocultos por flags): se eliminan; reactivarlos requiere reintroducir
  los componentes. No hay UI ni datos de usuario afectados.
- Precios en el UI: ya estaban ocultos (`HIDE_PRICES=true`); se elimina la lógica de render.
- Dependencia de `images.weserv.nl` en runtime para imágenes: si el proxy falla, fallback a
  URL original (onError). El video sigue sirviéndose directo del CDN raw.
- No se rompe el deploy de GitHub Pages ni el schema de Supabase.

## Compatibilidad / deprecación

- `100vh` → `min-h-dvh`: los navegadores sin soporte de `dvh` usan el fallback `min-h-screen`.
- Supabase: `ilike`/`or`/`range` requieren la misma API ya en uso; sin cambios de schema.
- Se elimina código deprecado/desconectado: carrito, exports sin uso de `githubMedia.jsx`,
  `buttonsDisabled`.

## Criterios de éxito

1. En mobile (viewport 375px, Chrome/Safari): el scroll infinito carga más items al llegar
   al final, sin que el nav tapa el loader.
2. El modal de detalle abre, el carrusel navega sin resetearse y el video no se reinicia.
3. El bundle de imágenes por request es visiblemente menor (webp + resize).
4. `pnpm lint` y `pnpm build` pasan sin errores.
5. La app se ve bien en 320/375/768/1024px (grid 2/2/3/4 columnas).

## Estado del sistema (test/verify)

- `pnpm lint` (eslint flat config) — debe pasar sin warnings.
- `pnpm build` (vite build) — debe generar `dist/` sin errores.
- `pnpm preview` + revisión manual en devtools (mobile emulation).
