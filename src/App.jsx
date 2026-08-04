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
