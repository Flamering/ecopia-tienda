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
