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
      </main>

      <BottomNav />
      <ProductModal pez={selectedPez} onClose={() => setSelectedPez(null)} />
    </div>
  );
};

export default App;
