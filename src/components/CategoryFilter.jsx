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
