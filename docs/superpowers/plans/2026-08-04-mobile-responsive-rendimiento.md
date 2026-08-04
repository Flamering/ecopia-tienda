# Mobile Responsive + Rendimiento de Carga — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer la tienda Ecopia 100% funcional y fluida en mobile, con carga significativamente más ligera (webp redimensionado + paginación server-side) y código refactorizado en componentes.

**Architecture:** Se divide el monolito `App.jsx` en `src/lib/` (media), `src/hooks/` (datos y scroll) y `src/components/` (UI). El layout usa `100dvh` + safe-area para mobile. La paginación se hace server-side con `supabase.range()`. Los precios y el carrito se eliminan por completo (dead code).

**Tech Stack:** Vite 6, React 18, Tailwind 3.4, `@supabase/supabase-js` 2.x, `lucide-react`, proxy de imágenes `images.weserv.nl`.

## Global Constraints

- No hay framework de testing en el repo (no vitest/jest). Verificación = `pnpm lint` (flat config) + `pnpm build` + `pnpm preview` manual en emulación mobile.
- Todo el texto de UI permanece en español. Sin comentarios en el código.
- Reemplazos de Tailwind: `h-screen` NO se usa en el layout raíz; se usa la clase utilitaria `.min-h-app` definida en `index.css` (fallback 100vh → 100dvh). El modal usa `.max-h-app-90`.
- El proxy de imágenes es `https://images.weserv.nl/?url=<BASE_URL+filename encodeURIComponent>&w=<width>&output=webp&q=<quality>`; fallback a URL raw del CDN de GitHub en `onError`.
- `BASE_URL` de media = `https://media.githubusercontent.com/media/Flamering/fish-media/main/` (constante `MEDIA_BASE_URL` en `src/lib/media.js`).
- No se agregan dependencias nuevas (el proxy es solo una URL, no un paquete).
- Cada tarea termina con `pnpm lint` + commit. Las tareas que crean archivos importables terminan también con `pnpm build`.

## File Structure

**Nuevos archivos:**
- `src/lib/media.js` — helpers de URL (proxy/resize/raw/video/parse).
- `src/hooks/useDebounce.js` — debounce para búsqueda.
- `src/hooks/useInfiniteScroll.js` — IntersectionObserver reutilizable.
- `src/hooks/usePeces.js` — datos: peces, categorías, filtros, paginación.
- `src/components/Header.jsx`
- `src/components/SearchBar.jsx`
- `src/components/CategoryFilter.jsx`
- `src/components/BottomNav.jsx`
- `src/components/Carousel.jsx`
- `src/components/ProductCard.jsx`
- `src/components/ProductModal.jsx`
- `src/components/ProductGrid.jsx`

**Modificados:**
- `src/App.jsx` — reescritura como orquestador.
- `index.html` — `viewport-fit=cover`.
- `src/index.css` — utilidades `min-h-app`, `max-h-app-90`.

**Eliminados:**
- `src/lib/githubMedia.jsx` (reemplazado por `media.js`).

## Paralelización

Ejecución con subagentes en 3 streams paralelos (archivos disjuntos; interfaces exactas definidas en cada tarea):

- **Stream A — capa de datos/media:** Tasks 1 → 2 → 3 (`media.js`, `useDebounce`+`useInfiniteScroll`, `usePeces`).
- **Stream B — layout + presentación:** Tasks 4 → 5 (`index.html`+`index.css`, `Header`+`SearchBar`+`CategoryFilter`+`BottomNav`).
- **Stream C — componentes de producto:** Tasks 6 → 7 (`Carousel`+`ProductCard`, `ProductModal`+`ProductGrid`).

Tras los 3 streams (que no comparten archivos), Task 8 integra `App.jsx` y Task 9 verifica y commitea. Los streams A, B y C pueden correr simultáneamente porque ningún subagente toca archivos de otro stream.

---

### Task 1: Capa de media (`src/lib/media.js`)

**Files:**
- Create: `src/lib/media.js`
- Delete: `src/lib/githubMedia.jsx`

**Interfaces:**
- Produces: `MEDIA_BASE_URL` (string), `getImageUrl(filename, opts?)` → string, `getMediaUrl(filename)` → string, `parseImageList(str)` → string[].
  - `getImageUrl(filename, { w = 400, q = 75 } = {})` devuelve la URL del proxy wsrv.nl con webp; si `filename` es vacío devuelve `''`.
  - `getMediaUrl(filename)` devuelve la URL raw del CDN (sin proxy); se usa para videos y como fallback de imágenes.
  - `parseImageList(str)` → `str.split(',')` trimmed + filtrado de vacíos; `''` → `[]`.

- [ ] **Step 1: Create `src/lib/media.js`**

```js
const REPO_OWNER = 'Flamering';
const REPO_NAME = 'fish-media';
const BRANCH = 'main';

export const MEDIA_BASE_URL = `https://media.githubusercontent.com/media/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/`;

const IMAGE_PROXY = 'https://images.weserv.nl/';

export const getMediaUrl = (filename) => {
  if (!filename) return '';
  return `${MEDIA_BASE_URL}${filename}`;
};

export const getImageUrl = (filename, { w = 400, q = 75 } = {}) => {
  if (!filename) return '';
  const raw = `${MEDIA_BASE_URL}${filename}`;
  return `${IMAGE_PROXY}?url=${encodeURIComponent(raw)}&w=${w}&output=webp&q=${q}`;
};

export const parseImageList = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
};
```

- [ ] **Step 2: Delete `src/lib/githubMedia.jsx`**

```bash
git rm src/lib/githubMedia.jsx
```

- [ ] **Step 3: Verify no queda ninguna referencia a `githubMedia`**

Run: `rg -n "githubMedia" src/ || true`
Expected: sin resultados (0 referencias; App.jsx se reescribe en Task 8).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: add media layer with proxy/resize (replaces githubMedia)"
```

---

### Task 2: Hooks utilitarios (`useDebounce` + `useInfiniteScroll`)

**Files:**
- Create: `src/hooks/useDebounce.js`
- Create: `src/hooks/useInfiniteScroll.js`

**Interfaces:**
- Produces:
  - `useDebounce(value, delay = 300)` → valor debounced (mismo tipo de `value`).
  - `useInfiniteScroll({ onLoadMore, hasMore, loading, rootRef })` → `sentinelRef` (ref a colocar en el elemento centinela al final de la lista).

- [ ] **Step 1: Create `src/hooks/useDebounce.js`**

```js
import { useEffect, useState } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
```

- [ ] **Step 2: Create `src/hooks/useInfiniteScroll.js`**

```js
import { useEffect, useRef } from 'react';

export const useInfiniteScroll = ({ onLoadMore, hasMore, loading, rootRef }) => {
  const sentinelRef = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMoreRef.current();
        }
      },
      { root: rootRef.current, rootMargin: '0px 0px -80px 0px', threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, rootRef]);

  return sentinelRef;
};
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build exitoso (los hooks aún no se importan; valida sintaxis).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDebounce.js src/hooks/useInfiniteScroll.js
git commit -m "feat: add useDebounce and useInfiniteScroll hooks"
```

---

### Task 3: Hook de datos (`src/hooks/usePeces.js`)

**Files:**
- Create: `src/hooks/usePeces.js`

**Interfaces:**
- Consumes: `supabase` de `../lib/supabase`, `useDebounce` de `./useDebounce`.
- Produces: `usePeces()` → objeto con:
  - `peces: Array<{ id, nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url }>`
  - `categories: string[]` (empezando con `'all'`)
  - `hasMore: boolean`, `loading: boolean`, `loadingMore: boolean`, `error: string | null`
  - `searchTerm: string`, `setSearchTerm: fn`, `selectedCategory: string`, `setSelectedCategory: fn`
  - `loadMore: fn` (sin args, no-op si no aplica)
- Comportamiento: página 12 items; `hasMore = (data.length === PAGE_SIZE)`; al cambiar `selectedCategory` o el search debounced se resetea la lista; `PAGE_SIZE = 12`.

- [ ] **Step 1: Create `src/hooks/usePeces.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';

const PAGE_SIZE = 12;

export const usePeces = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [peces, setPeces] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('peces')
        .select('clasificacion')
        .eq('eliminado', false)
        .eq('estado', 'Activo');
      if (err) throw err;
      const unique = [...new Set((data || []).map((r) => r.clasificacion).filter(Boolean))];
      setCategories(['all', ...unique]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const buildQuery = useCallback(
    ({ from, to }) => {
      let query = supabase
        .from('peces')
        .select('id, nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url, estado')
        .eq('eliminado', false)
        .eq('estado', 'Activo')
        .order('nombre_comun')
        .range(from, to);

      if (selectedCategory !== 'all') {
        query = query.eq('clasificacion', selectedCategory);
      }
      if (debouncedSearch) {
        query = query.or(
          `nombre_comun.ilike.%${debouncedSearch}%,nombre_cientifico.ilike.%${debouncedSearch}%,clasificacion.ilike.%${debouncedSearch}%`
        );
      }
      return query;
    },
    [selectedCategory, debouncedSearch]
  );

  const resetAndFetch = useCallback(async () => {
    setLoading(true);
    setPeces([]);
    setHasMore(true);
    setError(null);
    try {
      const { data, error: err } = await buildQuery({ from: 0, to: PAGE_SIZE - 1 });
      if (err) throw err;
      setPeces(data || []);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'Error cargando peces');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const from = peces.length;
      const { data, error: err } = await buildQuery({ from, to: from + PAGE_SIZE - 1 });
      if (err) throw err;
      setPeces((prev) => [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'Error cargando más peces');
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, loadingMore, hasMore, loading, peces.length]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    resetAndFetch();
  }, [resetAndFetch]);

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
  };
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePeces.js
git commit -m "feat: add usePeces hook with server-side pagination and filters"
```

---

### Task 4: Layout mobile (`index.html` + `src/index.css`)

**Files:**
- Modify: `index.html` (meta viewport, línea 7)
- Modify: `src/index.css`

**Interfaces:**
- Produces: clases utilitarias `min-h-app` (100vh con override 100dvh) y `max-h-app-90` (90vh con override 90dvh), usadas por `App.jsx` y `ProductModal.jsx`.

- [ ] **Step 1: Update `index.html`**

`<meta name="viewport" content="width=device-width, initial-scale=1.0" />` →
`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`

- [ ] **Step 2: Update `src/index.css`** (mantener las 3 directivas @tailwind al inicio)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.min-h-app {
  min-height: 100vh;
  min-height: 100dvh;
}

.max-h-app-90 {
  max-height: 90vh;
  max-height: 90dvh;
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add dynamic viewport fallback and safe-area support"
```

---

### Task 5: Componentes de presentación (`Header`, `SearchBar`, `CategoryFilter`, `BottomNav`)

**Files:**
- Create: `src/components/Header.jsx`
- Create: `src/components/SearchBar.jsx`
- Create: `src/components/CategoryFilter.jsx`
- Create: `src/components/BottomNav.jsx`

**Interfaces:**
- Produces:
  - `Header` — sin props.
  - `SearchBar({ value, onChange, viewMode, onToggleView })` — input de búsqueda + botón toggle grid/list.
  - `CategoryFilter({ categories, selected, onSelect })` — pills horizontales scrolleables.
  - `BottomNav` — sin props; nav fijo inferior con safe-area.

- [ ] **Step 1: Create `src/components/Header.jsx`**

```jsx
import iconoUrl from '../icono.png?url';

export const Header = () => (
  <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-3">
      <button className="p-2 rounded-lg bg-emerald-100 text-emerald-600" aria-label="Ecopia">
        <img src={iconoUrl} alt="Ecopia" className="w-5 h-5" />
      </button>
      <h1 className="text-lg sm:text-xl font-bold text-emerald-600">Ecopia - Lista de peces</h1>
    </div>
  </header>
);
```

- [ ] **Step 2: Create `src/components/SearchBar.jsx`**

```jsx
import { Search, Grid, LayoutList } from 'lucide-react';

export const SearchBar = ({ value, onChange, viewMode, onToggleView }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
    <input
      type="search"
      placeholder="Buscar peces..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-14 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />
    <button
      onClick={onToggleView}
      aria-label="Cambiar vista"
      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
        viewMode === 'grid' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {viewMode === 'grid' ? <Grid size={16} /> : <LayoutList size={16} />}
    </button>
  </div>
);
```

- [ ] **Step 3: Create `src/components/CategoryFilter.jsx`**

```jsx
export const CategoryFilter = ({ categories, selected, onSelect }) => (
  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
    {categories.map((cat) => (
      <button
        key={cat}
        onClick={() => onSelect(cat)}
        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
          selected === cat
            ? 'bg-emerald-500 text-white'
            : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
        }`}
      >
        {cat === 'all' ? 'Todos' : cat}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 4: Create `src/components/BottomNav.jsx`**

```jsx
import iconoUrl from '../icono.png?url';

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex items-center justify-center pb-[env(safe-area-inset-bottom)]">
    <button className="flex flex-col items-center py-2 text-emerald-600" aria-label="Catálogo">
      <img src={iconoUrl} alt="Catálogo" className="w-6 h-6" />
      <span className="text-[10px] font-bold">Catálogo</span>
    </button>
  </nav>
);
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: build exitoso (componentes aún sin importar).

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.jsx src/components/SearchBar.jsx src/components/CategoryFilter.jsx src/components/BottomNav.jsx
git commit -m "feat: add presentational components (header, search, categories, bottom nav)"
```

---

### Task 6: `Carousel` + `ProductCard`

**Files:**
- Create: `src/components/Carousel.jsx`
- Create: `src/components/ProductCard.jsx`

**Interfaces:**
- Consumes: `getImageUrl`, `getMediaUrl`, `parseImageList` de `../lib/media`; `iconoUrl` de `../icono.png?url`.
- Produces:
  - `Carousel({ pez })` — pez: `{ imagen_url, video_url, nombre_comun }`. Estado local `index` persistente (ya no se remonta).
  - `ProductCard({ pez, viewMode = 'grid', onClick })` — `viewMode` es `'grid'` o `'list'`.

- [ ] **Step 1: Create `src/components/Carousel.jsx`**

```jsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const Carousel = ({ pez }) => {
  const [index, setIndex] = useState(0);
  const images = parseImageList(pez?.imagen_url);
  const hasVideo = Boolean(pez?.video_url);
  const allMedia = hasVideo
    ? [{ type: 'video', url: pez.video_url }, ...images.map((url) => ({ type: 'image', url }))]
    : images.map((url) => ({ type: 'image', url }));

  const goNext = () => setIndex((i) => (i + 1) % allMedia.length);
  const goPrev = () => setIndex((i) => (i - 1 + allMedia.length) % allMedia.length);

  if (allMedia.length === 0 || !allMedia[0]?.url) {
    return (
      <div className="h-64 sm:h-96 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <img src={iconoUrl} alt="Ecopia" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-400">Sin imágenes disponibles</p>
        </div>
      </div>
    );
  }

  const current = allMedia[index];

  return (
    <div className="relative">
      <div className="h-64 sm:h-96 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
        {current.type === 'video' ? (
          <video key={current.url} width="100%" height="auto" controls className="max-h-full max-w-full" src={getMediaUrl(current.url)}>
            Tu navegador no soporta el elemento de video.
          </video>
        ) : (
          <img
            key={current.url}
            src={getImageUrl(current.url, { w: 1000 })}
            alt={pez.nombre_comun}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getMediaUrl(current.url);
            }}
          />
        )}

        {allMedia.length > 1 && (
          <>
            <button onClick={goPrev} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button onClick={goNext} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}
      </div>

      {allMedia.length > 1 && (
        <div className="flex gap-2 p-2 overflow-x-auto bg-slate-900">
          {allMedia.map((media, idx) => (
            <button
              key={idx}
              onClick={() => setIndex(idx)}
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
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create `src/components/ProductCard.jsx`**

```jsx
import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const ProductCard = ({ pez, viewMode = 'grid', onClick }) => {
  const images = parseImageList(pez?.imagen_url);
  const firstImage = images[0];
  const thumbnail = firstImage ? getImageUrl(firstImage, { w: viewMode === 'grid' ? 400 : 200 }) : null;
  const fallbackSrc = firstImage ? getMediaUrl(firstImage) : '';

  const renderImage = () =>
    thumbnail ? (
      <img
        src={thumbnail}
        alt={pez?.nombre_comun}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          if (fallbackSrc) e.target.src = fallbackSrc;
        }}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <img src={iconoUrl} alt="Ecopia" className="w-12 h-12 sm:w-14 sm:h-14" />
      </div>
    );

  if (viewMode === 'list') {
    return (
      <div onClick={onClick} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
          {renderImage()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800">{pez.nombre_comun}</h4>
          <p className="text-xs text-slate-400 italic truncate">{pez.nombre_cientifico}</p>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer flex flex-col">
      <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">{renderImage()}</div>
      <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col">
        <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
        <h3 className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 sm:mt-1 line-clamp-1">{pez.nombre_comun}</h3>
        <p className="text-xs text-slate-400 italic line-clamp-1">{pez.nombre_cientifico}</p>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/components/Carousel.jsx src/components/ProductCard.jsx
git commit -m "feat: add Carousel and ProductCard components with proxy images"
```

---

### Task 7: `ProductModal` + `ProductGrid`

**Files:**
- Create: `src/components/ProductModal.jsx`
- Create: `src/components/ProductGrid.jsx`

**Interfaces:**
- Consumes: `Carousel` de `./Carousel`, `ProductCard` de `./ProductCard`.
- Produces:
  - `ProductModal({ pez, onClose })` — modal de detalle; si `pez` es null no renderiza.
  - `ProductGrid({ peces, viewMode, onSelect, sentinelRef, hasMore, loadingMore })` — grid o lista + sentinel de infinite scroll.

- [ ] **Step 1: Create `src/components/ProductModal.jsx`**

```jsx
import { X } from 'lucide-react';
import { Carousel } from './Carousel';

export const ProductModal = ({ pez, onClose }) =>
  pez && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-app-90 bg-white rounded-3xl overflow-hidden overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Carousel pez={pez} />
        <div className="p-6">
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full">
            <X size={24} className="text-white" />
          </button>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{pez.nombre_comun}</h2>
          <p className="text-sm text-slate-400 italic">{pez.nombre_cientifico}</p>
          <p className="mt-4 text-slate-600">{pez.descripcion}</p>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 2: Create `src/components/ProductGrid.jsx`**

```jsx
import { ProductCard } from './ProductCard';

export const ProductGrid = ({ peces, viewMode, onSelect, sentinelRef, hasMore, loadingMore }) => (
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
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductModal.jsx src/components/ProductGrid.jsx
git commit -m "feat: add ProductModal and ProductGrid components"
```

---

### Task 8: Integración — reescribir `App.jsx` como orquestador

**Files:**
- Rewrite: `src/App.jsx`

**Interfaces:**
- Consumes: `usePeces` de `./hooks/usePeces`, `useInfiniteScroll` de `./hooks/useInfiniteScroll`, y todos los componentes de `./components/*`. Elimina TODO el estado de carrito/checkout, `HIDE_CART`, `HIDE_PRICES`, `buttonsDisabled`, `getPrice`, `placeOrder`, `localStorage 'ecopia-cart'`.
- Produces: `App` — layout raíz con `.min-h-app`, header sticky, `main` scrolleable con `pb-[calc(4rem+env(safe-area-inset-bottom))]`, nav inferior fijo, modal de detalle.

- [ ] **Step 1: Rewrite `src/App.jsx`**

```jsx
import { useRef, useState } from 'react';
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
  } = usePeces();

  const [viewMode, setViewMode] = useState('grid');
  const [selectedPez, setSelectedPez] = useState(null);
  const mainRef = useRef(null);
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading: loading || loadingMore,
    rootRef: mainRef,
  });

  return (
    <div className="flex flex-col min-h-app bg-slate-50">
      <Header />

      <main ref={mainRef} className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="p-4 space-y-4">
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

          {loading ? (
            <div className="text-center py-10 text-slate-400">Cargando...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-400">Error: {error}</div>
          ) : peces.length === 0 ? (
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
            />
          )}
        </div>
      </main>

      <BottomNav />
      <ProductModal pez={selectedPez} onClose={() => setSelectedPez(null)} />
    </div>
  );
};

export default App;
```

- [ ] **Step 2: Verify no quedan referencias a código eliminado**

Run: `rg -n "HIDE_CART|HIDE_PRICES|buttonsDisabled|placeOrder|CartDrawer|localStorage" src/ || true`
Expected: sin resultados.

- [ ] **Step 3: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: lint sin errores (sin warnings), build exitoso generando `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: rewrite App as orchestrator, remove cart/checkout dead code"
```

---

### Task 9: Verificación final

**Files:** ninguno (verificación)

- [ ] **Step 1: Full lint + build**

Run: `pnpm lint && pnpm build`
Expected: ambos exitosos sin errores ni warnings.

- [ ] **Step 2: Preview manual en emulación mobile**

Run: `pnpm preview`
Abrir en navegador con devtools emulando 375x667 (iPhone) y verificar:
- El scroll infinito carga más items al llegar al final (el loader "Cargando más..." es visible).
- El modal de detalle abre; el carrusel navega sin resetearse; el video no se reinicia.
- La última fila de cards no queda oculta detrás del nav inferior.
- Grid de 2 columnas en mobile; 3 en sm; 4 en md.

- [ ] **Step 3: Commit final (si hay ajustes)**

```bash
git add -A
git commit -m "fix: final verification adjustments"
```

---

## Notas de lo que se pierde / rompe

- **Carrito y checkout** eliminados (ya ocultos). Re-activarlos requiere reintroducir estado + `CartDrawer` + `placeOrder`.
- **Precios** eliminados (fetch + render). Re-activarlos = 1 consulta a `catalogo_productos_proveedor` + 1 `<span>` en `ProductCard`.
- **Imágenes** dependen de `images.weserv.nl`; si falla, `onError` hace fallback a la URL raw del CDN.
- Deploy GH Pages y schema Supabase intactos. `githubMedia.jsx` y sus 6 exports sin uso quedan fuera del árbol.

## Fase 2 documentada (fuera de alcance)

Pre-generar thumbnails webp en `Flamering/fish-media` (`thumbs/`), usarlos cuando existan y degradar al proxy cuando no; requiere decisión separada sobre el repo de media.
