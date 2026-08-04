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
