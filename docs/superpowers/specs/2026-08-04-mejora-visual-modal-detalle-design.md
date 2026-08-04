# Spec: Mejora visual — Modal de detalle + pulido general mobile

Fecha: 2026-08-04  
Estado: Aprobado ("Exec")  
Repo: `/mnt/homelab/projects/tienda` (branch `master`)

## Contexto y problemas

El modal de detalle (`ProductModal.jsx`) y el carrusel (`Carousel.jsx`) tienen limitaciones en mobile:
- Imagen a 256px de alto en tarjeta centrada (pequeña).
- Botón cerrar `absolute` dentro del panel scrolleable → se pierde al scrollear descripción larga.
- Sin swipe nativo ni zoom (doble tap / pellizco).
- Lightbox ausente.
- Skeleton de carga inexistente (solo "Cargando...").
- Body sin scroll-lock al abrir modal/lightbox.
- Cards: label `text-[8px]` demasiado pequeño; falta sombra sutil.

La arquitectura actual: `App` → `ProductModal` → `Carousel` → `media.js` (proxy wsrv.nl). Sin dependencias externas.

## Diseño aprobado

### 1. ProductModal — pantalla completa imagen-first (mobile)

**Mobile (<640px):** overlay full-screen `fixed inset-0 z-50 bg-slate-50 flex flex-col`.
- Header sticky: botón cerrar (siempre visible) + nombre truncado. Arregla bug del close button.
- Área imagen flexible `h-[55dvh]` con `Carousel` dentro.
- Info scrolleable `flex-1 overflow-y-auto` + safe-area.
- Animación: fade + slide-up suave.

**Desktop (≥640px):** modal centrado `max-w-3xl` con misma estructura vertical, imagen más alta (`h-[55vh]`). Mantiene consistencia.

```jsx
<div className="fixed inset-0 z-50 bg-slate-50 flex flex-col sm:rounded-2xl">
  <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3">
    <button onClick={onClose} aria-label="Cerrar"><X size={20}/></button>
    <h2 className="font-bold text-slate-800 truncate">{pez.nombre_comun}</h2>
  </header>
  <Carousel pez={pez} onOpenLightbox={setLightboxIndex} />
  <section className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">…</section>
</div>
```

### 2. Carousel — swipe nativo (scroll-snap, sin dependencias)

- Contenedor: `overflow-x-auto snap-x snap-mandatory`; slides `min-w-full snap-center`.
- Swipe nativo (touch + trackpad); índice activo vía `onScroll` → `Math.round(scrollLeft / clientWidth)`.
- Puntos (dots) en mobile; thumbnails `hidden sm:flex` en desktop.
- Flechas prev/next vía `scrollBy({ left: ±clientWidth, behavior: 'smooth' })` (desktop + a11y).
- Tocar imagen → `onOpenLightbox(index)` abre Lightbox.
- Altura: `h-[55dvh]` mobile / `h-[55vh]` desktop.

### 3. Lightbox — visor fullscreen con zoom y swipe

Nuevo `Lightbox.jsx` (fondo negro `bg-black/95 z-[60]`).
- Swipe scroll-snap entre imágenes (solo imágenes, no videos).
- **Zoom**: doble tap alterna 1x↔2x; pellizco (pinch) con Pointer Events (ratio distancia 2 punteros → scale clamp 1–4). Zoom >1 permite pan (arrastrar con translate). Zoom se resetea al cambiar imagen.
- Header: contador "3 / 8" + botón cerrar.
- Imagen fuente `getImageUrl(url, { w: 1200, q: 80 })`.
- Lógica pinch/zoom aislada en hook `usePinchZoom.js`.

### 4. Pulido general mobile

- **SkeletonGrid** (`SkeletonGrid.jsx` + `animate-pulse`) en lugar de "Cargando...".
- **Body scroll lock**: `overflow:hidden` en `<body>` mientras modal/lightbox abiertos (hook `useBodyScrollLock`).
- **ProductCard**: label `text-[10px]` (antes 8px), sombra sutil por defecto, mejor touch target.
- **Error con botón "Reintentar"** en lugar de solo texto.
- Utilidad CSS `scrollbar-hide` para ocultar barra horizontal del carrusel.

## Qué se logra / pierde / rompe

**Logra:**
- Imágenes grandes y hermosas en mobile (overlay full-screen, 55% altura).
- Swipe nativo sin dependencias (scroll-snap CSS).
- Lightbox con doble tap + pellizco + swipe entre imágenes.
- Botón cerrar siempre visible (fix bug conocido).
- Carga percibida más rápida (skeleton + animate-pulse).
- Body scroll-lock (no fondo scrolleando).
- Cards más legibles y tocables.

**Pierde:**
- Thumbnail strip en mobile (reemplazado por dots + swipe; queda en desktop).
- Simplicidad interna del Carousel (rewrite interno, sin cambio de API externa).
- Modal centrado pequeño en mobile (reemplazado por full-screen).

**Compatibilidad:**
- Sin dependencias nuevas (scroll-snap, Pointer Events, `animate-pulse` son nativos/Tailwind).
- `Carousel` gana prop `onOpenLightbox`; `ProductModal` gana estado `lightboxIndex`; `App` es el único consumidor externo. Nada externo se depreca.
- Desktop conserva modal centrado y flechas prev/next.
- `scripts/migracion_tiene_imagen.sql` eliminado (ya no necesario tras client-side partition).

**Verificación:** `pnpm lint` + `pnpm build` + preview con emulación mobile (375/414/768/1024px).

## Arquitectura de archivos

Nuevos:
- `src/components/Lightbox.jsx` — visor fullscreen con zoom/pinch/swipe.
- `src/hooks/usePinchZoom.js` — hook pinch/pan/zoom (doble tap + pinch).
- `src/components/SkeletonGrid.jsx` — grid esqueleto con `animate-pulse`.
- `src/hooks/useBodyScrollLock.js` — bloqueo body overflow.

Modificados:
- `src/components/ProductModal.jsx` — layout full-screen, header sticky, lightbox state, scroll lock.
- `src/components/Carousel.jsx` — scroll-swap, dots, thumbnails desktop, `onOpenLightbox`.
- `src/components/ProductCard.jsx` — label `text-[10px]`, sombra, touch target.
- `src/components/ProductGrid.jsx` — usa `SkeletonGrid` en loading.
- `src/App.jsx` — `SkeletonGrid` en loading, botón retry en error, body scroll lock provider.
- `src/index.css` — utilidad `.scrollbar-hide` (oculta barra horizontal del carrusel).

Eliminados:
- `scripts/migracion_tiene_imagen.sql` (ya no necesario).

## Criterios de éxito

1. En mobile (375/414px): modal full-screen, imagen 55% altura, close button fijo, swipe carrusel, tap→lightbox con zoom (doble tap + pellizco), swipe lightbox, scroll info, safe-area.
2. Desktop (1024px): modal centrado, imagen grande, flechas + thumbnails, lightbox funcional.
3. Skeleton visible en primera carga; error muestra botón "Reintentar".
4. Body no scrollea con modal/lightbox abiertos.
5. `pnpm lint` limpio; `pnpm build` exitoso; preview manual OK.

## Estado del sistema

- `pnpm lint` (eslint flat config) — debe pasar sin warnings.
- `pnpm build` (vite build) — genera `dist/` sin errores.
- `pnpm preview` + revisión manual en devtools (emulación mobile).