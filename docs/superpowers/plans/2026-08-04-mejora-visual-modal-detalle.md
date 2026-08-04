# Mejora Visual Modal + Pulido Mobile — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el modal de detalle a pantalla completa imagen-first en mobile, añadir un lightbox fullscreen con zoom (doble tap + pellizco) y swipe, y pulir el mobile general (skeleton, retry, scroll-lock, cards, scrollbar oculta).

**Architecture:** El modal gana estado local `lightboxIndex` y renderiza `Lightbox` como hermano del overlay (no anidado, para no cerrar el modal por propagación). El carrusel pasa a scroll-snap nativo (sin dependencias); el zoom vive en el hook `usePinchZoom` (Pointer Events + refs para evitar clousures obsoletas). El skeleton vive en `SkeletonGrid`, consumido por `ProductGrid` vía prop `loading`.

**Tech Stack:** Vite 6, React 18, Tailwind 3.4, `lucide-react`, `@supabase/supabase-js`, proxy `images.weserv.nl`. Sin dependencias nuevas.

## Global Constraints

- No hay framework de testing. Verificación = `pnpm lint` (flat config, `react-hooks/recommended-latest` activo) + `pnpm build` + `pnpm preview` manual con emulación mobile (375/414/768/1024px).
- Todo texto de UI en español. **Sin comentarios en el código.**
- `no-unused-vars` es error; `react-hooks/exhaustive-deps` está activo (los hooks deben listar TODAS sus deps).
- Sin dependencias nuevas: swipe = CSS `scroll-snap`, zoom = Pointer Events, skeleton = `animate-pulse` de Tailwind.
- Media: `getImageUrl(filename, { w, q })` → proxy wsrv.nl webp; `getMediaUrl(filename)` → URL raw CDN; `parseImageList(str)` → `string[]`. Fallback `onError` a raw CDN en cada `<img>`.
- Alturas del carrusel: `h-[55dvh]` mobile / `sm:h-[55vh]` desktop.
- Cada subagente hace `git add` SOLO de sus archivos (streams en paralelo sobre el mismo worktree); nunca `git add -A`.
- El modal usa `.max-h-app-90` (definida en `index.css`); se añade la utilidad `.scrollbar-hide`.
- Contador de lightbox 1-based en UI ("3 / 8"), índice interno 0-based.
- El carrusel conserva el orden actual de media: primera imagen → videos → resto de imágenes.

## File Structure

**Nuevos:**
- `src/hooks/useBodyScrollLock.js` — bloquea `overflow` de `<body>`.
- `src/hooks/usePinchZoom.js` — doble tap 1x↔2x, pinch 1–4x, pan con clamp.
- `src/components/Lightbox.jsx` — visor fullscreen oscuro con swipe + zoom.
- `src/components/SkeletonGrid.jsx` — grid/lista esqueleto con `animate-pulse`.

**Modificados:**
- `src/components/Carousel.jsx` — rewrite a scroll-snap + dots + thumbnails + `onOpenLightbox`.
- `src/components/ProductModal.jsx` — rewrite full-screen, header fijo, estado lightbox, scroll-lock.
- `src/components/ProductCard.jsx` — label grid `text-[10px]`, `shadow-sm` por defecto.
- `src/components/ProductGrid.jsx` — prop `loading` → `SkeletonGrid`.
- `src/hooks/usePeces.js` — exponer `retry` (= `resetAndFetch`) para el botón Reintentar.
- `src/App.jsx` — botón Reintentar en error, delega skeleton a `ProductGrid`.
- `src/index.css` — utilidad `.scrollbar-hide`.

## Paralelización

3 streams sobre archivos disjuntos (un subagente por stream):
- **Stream A:** Task 1 (hooks) → Task 4 (Lightbox) → Task 5 (ProductModal).
- **Stream B:** Task 2 (SkeletonGrid + ProductCard + css) → Task 6 (ProductGrid + usePeces + App).
- **Stream C:** Task 3 (Carousel).

Todos los estados intermedios compilan (los componentes nuevos sin usar y las props opcionales mantienen build verde). Task 7 verifica el árbol integrado y cierra.

---

### Task 1: Hooks `useBodyScrollLock` + `usePinchZoom`

**Files:**
- Create: `src/hooks/useBodyScrollLock.js`
- Create: `src/hooks/usePinchZoom.js`

**Interfaces:**
- Produces:
  - `useBodyScrollLock(locked: boolean)` → `null`. Cuando `locked` es true fija `document.body.style.overflow = 'hidden'`; al cambiar a false restaura el valor previo.
  - `usePinchZoom({ maxScale = 4, resetKey } = {})` → `{ scale: number, reset: fn, style: object, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } }`.
    - `style` = `{ transform: 'translate3d(tx,ty,0) scale(s)', touchAction: s>1 ? 'none' : 'auto', willChange: 'transform' }`. `touchAction: 'none'` al hacer zoom impide que el contenedor scroll-snap secuestre el gesto.
    - `handlers` se extienden sobre el `<img>` (o elemento con el zoom). Usa `setPointerCapture`.
    - Doble tap (<300ms, <30px) alterna 1↔2; pinch escala `clamp(1, maxScale)`; pan solo con `scale > 1` y clamp a los desbordes reales del elemento (`getBoundingClientRect` × scale vs viewport).
    - `reset()` vuelve a `{ scale: 1, tx: 0, ty: 0 }`; se llama automáticamente cuando cambia `resetKey`.

- [ ] **Step 1: Create `src/hooks/useBodyScrollLock.js`**

```js
import { useEffect } from 'react';

export const useBodyScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
};
```

- [ ] **Step 2: Create `src/hooks/usePinchZoom.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const usePinchZoom = ({ maxScale = 4, resetKey } = {}) => {
  const [state, setState] = useState({ scale: 1, tx: 0, ty: 0 });
  const stateRef = useRef(state);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const update = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => update({ scale: 1, tx: 0, ty: 0 }), [update]);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  const handleDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        startScale: stateRef.current.scale,
      };
      return;
    }

    if (pointersRef.current.size === 1) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (now - last.time < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        const scale = stateRef.current.scale > 1 ? 1 : 2;
        update({ scale, tx: 0, ty: 0 });
        return;
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = clamp((pinchRef.current.startScale * dist) / pinchRef.current.dist, 1, maxScale);
      update({ scale, tx: 0, ty: 0 });
      return;
    }

    if (pointersRef.current.size === 1 && stateRef.current.scale > 1) {
      const scale = stateRef.current.scale;
      const rect = e.currentTarget.getBoundingClientRect();
      const maxX = Math.max(0, (rect.width * scale - window.innerWidth) / 2);
      const maxY = Math.max(0, (rect.height * scale - window.innerHeight) / 2);
      update({
        scale,
        tx: clamp(stateRef.current.tx + (e.clientX - prev.x), -maxX, maxX),
        ty: clamp(stateRef.current.ty + (e.clientY - prev.y), -maxY, maxY),
      });
    }
  };

  const handleEnd = (e) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
  };

  return {
    scale: state.scale,
    reset,
    style: {
      transform: `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`,
      touchAction: state.scale > 1 ? 'none' : 'auto',
      willChange: 'transform',
    },
    handlers: {
      onPointerDown: handleDown,
      onPointerMove: handleMove,
      onPointerUp: handleEnd,
      onPointerCancel: handleEnd,
    },
  };
};
```

- [ ] **Step 3: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: lint sin errores ni warnings; build exitoso (los hooks aún no se importan; valida sintaxis).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBodyScrollLock.js src/hooks/usePinchZoom.js
git commit -m "feat: add useBodyScrollLock and usePinchZoom hooks"
```

---

### Task 2: `SkeletonGrid` + polish `ProductCard` + utilidad CSS

**Files:**
- Create: `src/components/SkeletonGrid.jsx`
- Modify: `src/components/ProductCard.jsx:48` (label grid) y línea 45 (clase de card)
- Modify: `src/index.css` (añadir `.scrollbar-hide` al final)

**Interfaces:**
- Produces: `SkeletonGrid({ viewMode = 'grid' })` → grid de 8 placeholders (2/3/4 columnas) o lista de 6 placeholders con `animate-pulse`. Usado por `ProductGrid` en Task 6.
- Consumes: `ProductCard({ pez, viewMode, onClick })` ya existente (sin cambios de interfaz).

- [ ] **Step 1: Create `src/components/SkeletonGrid.jsx`**

```jsx
export const SkeletonGrid = ({ viewMode = 'grid' }) =>
  viewMode === 'list' ? (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-lg bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-slate-200 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden">
          <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
          <div className="p-2 sm:p-3 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
```

- [ ] **Step 2: Modify `src/components/ProductCard.jsx`** — grid: label `text-[8px] sm:text-[10px]` → `text-[10px]`, y card con sombra sutil por defecto:

```jsx
    <div onClick={onClick} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer flex flex-col">
```

y línea del label:

```jsx
        <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
```

- [ ] **Step 3: Modify `src/index.css`** — añadir al final (después de `.max-h-app-90`):

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos (SkeletonGrid aún sin importar).

- [ ] **Step 5: Commit**

```bash
git add src/components/SkeletonGrid.jsx src/components/ProductCard.jsx src/index.css
git commit -m "feat: add SkeletonGrid, card polish and scrollbar-hide utility"
```

---

### Task 3: `Carousel` — rewrite a scroll-snap con swipe

**Files:**
- Rewrite: `src/components/Carousel.jsx`

**Interfaces:**
- Consumes: `getImageUrl`, `getMediaUrl`, `parseImageList` de `../lib/media`; `iconoUrl` de `../icono.png?url`; `ChevronLeft`, `ChevronRight`, `Play` de `lucide-react`.
- Produces: `Carousel({ pez, onOpenLightbox })`.
  - `onOpenLightbox(index)` opcional; lo invoca el `<button>` que envuelve cada imagen (las imágenes abren el lightbox; los videos no).
  - Estado local `index` derivado de `onScroll` (`Math.round(scrollLeft / clientWidth)`).
  - `goTo(idx)` usa `scrollRef.current.scrollTo({ left: idx * clientWidth, behavior: 'smooth' })`.
  - Dots (mobile) y thumbnails (`hidden sm:flex`) como indicadores; flechas prev/next absolutas.

- [ ] **Step 1: Rewrite `src/components/Carousel.jsx`**

```jsx
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const Carousel = ({ pez, onOpenLightbox }) => {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef(null);
  const images = parseImageList(pez?.imagen_url);
  const imageMedia = images.map((url) => ({ type: 'image', url }));
  const videos = parseImageList(pez?.video_url).map((url) => ({ type: 'video', url }));
  const allMedia = videos.length > 0
    ? [...imageMedia.slice(0, 1), ...videos, ...imageMedia.slice(1)]
    : imageMedia;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(next, allMedia.length - 1)));
  };

  const goTo = (idx) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const goNext = () => goTo(Math.min(index + 1, allMedia.length - 1));
  const goPrev = () => goTo(Math.max(index - 1, 0));

  if (allMedia.length === 0 || !allMedia[0]?.url) {
    return (
      <div className="h-[55dvh] sm:h-[55vh] bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <img src={iconoUrl} alt="Ecopia" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-400">Sin imágenes disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {allMedia.map((media, idx) => (
          <div key={idx} className="min-w-full flex-shrink-0 snap-center h-[55dvh] sm:h-[55vh] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            {media.type === 'video' ? (
              <video key={media.url} width="100%" height="auto" controls className="max-h-full max-w-full" src={getMediaUrl(media.url)}>
                Tu navegador no soporta el elemento de video.
              </video>
            ) : (
              <button
                onClick={() => onOpenLightbox?.(idx)}
                aria-label={`Ampliar imagen ${idx + 1}`}
                className="w-full h-full flex items-center justify-center cursor-zoom-in"
              >
                <img
                  key={media.url}
                  src={getImageUrl(media.url, { w: 1000 })}
                  alt={pez.nombre_comun}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getMediaUrl(media.url);
                  }}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {allMedia.length > 1 && (
        <>
          <button onClick={goPrev} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-white" />
          </button>
          <button onClick={goNext} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronRight size={24} className="text-white" />
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 sm:hidden">
            {allMedia.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Ir a la imagen ${idx + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${idx === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>

          <div className="hidden sm:flex gap-2 p-2 bg-slate-900">
            {allMedia.map((media, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Imagen ${idx + 1}`}
                className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === index ? 'border-emerald-500' : 'border-transparent hover:border-slate-600'
                }`}
              >
                {media.type === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Play size={16} className="text-white" />
                  </div>
                ) : (
                  <img
                    src={getImageUrl(media.url, { w: 200 })}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getMediaUrl(media.url);
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos (ProductModal actual llama `<Carousel pez={pez} />`; `onOpenLightbox` es opcional y `?.()` lo cubre).

- [ ] **Step 3: Commit**

```bash
git add src/components/Carousel.jsx
git commit -m "feat: carousel with native scroll-snap swipe and lightbox trigger"
```

---

### Task 4: `Lightbox` — visor fullscreen con zoom y swipe

**Files:**
- Create: `src/components/Lightbox.jsx`

**Interfaces:**
- Consumes: `usePinchZoom` de `../hooks/usePinchZoom`; `getImageUrl`, `getMediaUrl` de `../lib/media`; `X` de `lucide-react`.
- Produces: `Lightbox({ items, initialIndex = 0, onClose, name })`.
  - `items`: `[{ type: 'image', url }]` (solo imágenes, nunca videos).
  - `initialIndex`: slide inicial (0-based). Se aplica con `scrollerRef.current.scrollLeft = initialIndex * clientWidth` en un `useEffect`.
  - `name`: nombre del pez para `alt`.
  - `onClose`: cierra el lightbox.
  - Cada slide es un `ZoomableImage` (subcomponente, porque hooks no van en un bucle) con `usePinchZoom({ resetKey: index })` → al cambiar de slide se resetea el zoom.
  - Header con contador `{index + 1} / {items.length}` y botón cerrar.

- [ ] **Step 1: Create `src/components/Lightbox.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getImageUrl, getMediaUrl } from '../lib/media';
import { usePinchZoom } from '../hooks/usePinchZoom';

const ZoomableImage = ({ item, name, resetKey }) => {
  const { style, handlers } = usePinchZoom({ resetKey });
  return (
    <img
      src={getImageUrl(item.url, { w: 1200, q: 80 })}
      alt={name}
      className="max-w-full max-h-full object-contain select-none"
      draggable={false}
      style={style}
      {...handlers}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = getMediaUrl(item.url);
      }}
    />
  );
};

export const Lightbox = ({ items, initialIndex = 0, onClose, name }) => {
  const [index, setIndex] = useState(initialIndex);
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el && items.length > 0) el.scrollLeft = initialIndex * el.clientWidth;
  }, [initialIndex, items.length]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(next, items.length - 1)));
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 shrink-0">
        <span className="text-white text-sm tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white">
          <X size={24} />
        </button>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {items.map((item, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
            <ZoomableImage item={item} name={name} resetKey={index} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos (Lightbox aún sin importar).

- [ ] **Step 3: Commit**

```bash
git add src/components/Lightbox.jsx
git commit -m "feat: add fullscreen lightbox with pinch zoom and swipe"
```

---

### Task 5: `ProductModal` — full-screen imagen-first + estado lightbox

**Files:**
- Rewrite: `src/components/ProductModal.jsx`

**Interfaces:**
- Consumes: `Carousel` de `./Carousel`, `Lightbox` de `./Lightbox`, `useBodyScrollLock` de `../hooks/useBodyScrollLock`, `parseImageList` de `../lib/media`, `X` de `lucide-react`.
- Produces: `ProductModal({ pez, onClose })` — interfaz sin cambios (App no cambia por esto).
  - `useState` + `useBodyScrollLock(Boolean(pez))` ANTES del early return (`if (!pez) return null`), para respetar las reglas de hooks.
  - Estado local `lightboxIndex` (null = cerrado).
  - Mobile: overlay full-screen `flex flex-col`; header fijo con botón cerrar (siempre visible) + nombre truncado; `Carousel`; sección info `flex-1 overflow-y-auto` con `pb-[calc(1rem+env(safe-area-inset-bottom))]`.
  - Desktop: `sm:items-center sm:justify-center` sobre backdrop, panel `sm:max-w-3xl sm:max-h-app-90 sm:rounded-3xl`.
  - `Lightbox` se renderiza como hermano del overlay (dentro de `<React.Fragment>`), NO anidado en el div con `onClick={onClose}` — así el click en el lightbox no cierra el modal.

- [ ] **Step 1: Rewrite `src/components/ProductModal.jsx`**

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Carousel } from './Carousel';
import { Lightbox } from './Lightbox';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { parseImageList } from '../lib/media';

export const ProductModal = ({ pez, onClose }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useBodyScrollLock(Boolean(pez));

  if (!pez) return null;

  const images = parseImageList(pez.imagen_url).map((url) => ({ type: 'image', url }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/50" onClick={onClose}>
        <div
          className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-app-90 bg-white sm:rounded-3xl overflow-hidden flex flex-col animate-[modal-in_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3 shrink-0">
            <button onClick={onClose} aria-label="Cerrar" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
              <X size={20} />
            </button>
            <h2 className="font-bold text-slate-800 truncate">{pez.nombre_comun}</h2>
          </header>

          <Carousel pez={pez} onOpenLightbox={setLightboxIndex} />

          <section className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-1">{pez.nombre_comun}</h2>
            <p className="text-sm text-slate-400 italic">{pez.nombre_cientifico}</p>
            <p className="mt-4 text-slate-600">{pez.descripcion}</p>
          </section>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={images}
          initialIndex={lightboxIndex}
          name={pez.nombre_comun}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
```

- [ ] **Step 2: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductModal.jsx
git commit -m "feat: fullscreen image-first modal with lightbox integration"
```

---

### Task 6: `usePeces.retry` + `ProductGrid` loading + integración `App`

**Files:**
- Modify: `src/hooks/usePeces.js` (objeto de retorno, línea 119-131)
- Modify: `src/components/ProductGrid.jsx`
- Rewrite: `src/App.jsx`

**Interfaces:**
- Consumes: `SkeletonGrid` de `./SkeletonGrid`; `usePeces` con el nuevo `retry`.
- Produces:
  - `usePeces()` → añade `retry: resetAndFetch` al objeto de retorno (misma firma que `loadMore`: sin args, Promise).
  - `ProductGrid({ peces, viewMode, onSelect, sentinelRef, hasMore, loadingMore, loading })` — con `loading` true renderiza `<SkeletonGrid viewMode={viewMode} />`.
  - `App` — en `error` muestra botón "Reintentar" (llama `retry`); el caso vacío queda `peces.length === 0 && !loading`; delega skeleton a `ProductGrid`.

- [ ] **Step 1: Modify `src/hooks/usePeces.js`** — añadir `retry` al retorno (mantener el resto igual):

```js
  return {
    peces,
    categories,
    hasMore,
    loading,
    loadingMore,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    loadMore,
    retry: resetAndFetch,
  };
```

- [ ] **Step 2: Modify `src/components/ProductGrid.jsx`** — importar y delegar loading:

```jsx
import { ProductCard } from './ProductCard';
import { SkeletonGrid } from './SkeletonGrid';

export const ProductGrid = ({ peces, viewMode, onSelect, sentinelRef, hasMore, loadingMore, loading }) => {
  if (loading) return <SkeletonGrid viewMode={viewMode} />;

  return (
    <div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
          {peces.map((pez) => (
            <ProductCard key={pez.id} pez={pez} viewMode="grid" onClick={() => onSelect(pez)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {peces.map((pez) => (
            <ProductCard key={pez.id} pez={pez} viewMode="list" onClick={() => onSelect(pez)} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
          <span className="text-slate-400 text-sm">{loadingMore ? 'Cargando más...' : ''}</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Rewrite `src/App.jsx`**

```jsx
import { useState } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductGrid } from './components/ProductGrid';
import { ProductModal } from './components/ProductModal';
import { BottomNav } from './components/BottomNav';
import { usePeces } from './hooks/usePeces';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';

const App = () => {
  const {
    peces,
    categories,
    hasMore,
    loading,
    loadingMore,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    loadMore,
    retry,
  } = usePeces();

  const [viewMode, setViewMode] = useState('grid');
  const [selectedPez, setSelectedPez] = useState(null);
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading: loading || loadingMore,
  });

  return (
    <div className="min-h-app bg-slate-50">
      <Header />

      <div className="sticky top-0 z-30 bg-slate-50 px-4 pt-3 pb-1 space-y-3">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          viewMode={viewMode}
          onToggleView={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        />
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <main className="px-4 py-4">
        {error ? (
          <div className="text-center py-10">
            <p className="text-red-400">Error: {error}</p>
            <button
              onClick={retry}
              className="mt-4 px-5 py-2 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : peces.length === 0 && !loading ? (
          <div className="text-center py-10 text-slate-400">
            <p>No hay peces disponibles</p>
          </div>
        ) : (
          <ProductGrid
            peces={peces}
            viewMode={viewMode}
            onSelect={setSelectedPez}
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            loading={loading}
          />
        )}
      </main>

      <BottomNav />
      <ProductModal pez={selectedPez} onClose={() => setSelectedPez(null)} />
    </div>
  );
};

export default App;
```

- [ ] **Step 4: Verify lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos sin errores ni warnings.

- [ ] **Step 5: Verify no quedan strings antiguos de estado de carga**

Run: `rg -n "Cargando\.\.\.|Error: \{error\}|No hay peces" src/App.jsx || true`
Expected: la única coincidencia permitida es "No hay peces disponibles".

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePeces.js src/components/ProductGrid.jsx src/App.jsx
git commit -m "feat: skeleton loading, retry button and grid integration"
```

---

### Task 7: Verificación final

**Files:** ninguno (verificación)

- [ ] **Step 1: Full lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos sin errores ni warnings.

- [ ] **Step 2: Preview manual en emulación mobile**

Run: `pnpm preview`
Abrir con devtools en 375x667 (mobile) y verificar:
- Modal full-screen: imagen `h-[55dvh]`, header fijo con botón cerrar siempre visible al scrollear la descripción.
- Swipe del carrusel cambia dots; tocar imagen abre el Lightbox en ese índice; contador "n / total" correcto.
- En Lightbox: doble tap alterna 1x↔2x; pellizco escala hasta 4x con pan; swipe (sin zoom) cambia de imagen; al volver a 1x el swipe sigue funcionando.
- Body no scrollea detrás del modal (scroll-lock).
- Desktop 1024px: modal centrado, thumbnails visibles, flechas funcionan.
- Primer carga muestra skeleton animado; con red desconectada (devtools) muestra "Error: ..." + botón "Reintentar".
- Cards: label 10px, sombra sutil.

- [ ] **Step 3: Commit final (si hay ajustes)**

```bash
git add -A
git commit -m "fix: final verification adjustments"
```

---

## Notas de lo que se pierde / rompe

- **Thumbnails de carrusel** ya no se muestran en mobile (solo dots + swipe); siguen en desktop (`hidden sm:flex`).
- **Modal centrado pequeño** en mobile desaparece (reemplazado por full-screen imagen-first).
- **Lightbox solo imágenes** (los videos conservan sus controles nativos en el carrusel).
- **Retry** nuevo depende de exponer `resetAndFetch` como `retry` en `usePeces` (1 línea, sin cambio de comportamiento de carga).
- El resto de la app (búsqueda, categorías, infinite scroll, list/grid toggle) no cambia.
