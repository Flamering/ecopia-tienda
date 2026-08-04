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
