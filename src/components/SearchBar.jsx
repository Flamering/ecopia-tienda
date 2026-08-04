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
