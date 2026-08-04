import iconoUrl from '../icono.png?url';

export const BottomNav = () => (
  <nav className="bg-white border-t border-slate-200 px-4 pt-1 pb-[env(safe-area-inset-bottom)] flex items-center justify-center">
    <button className="flex flex-col items-center py-1 text-emerald-600" aria-label="Catálogo">
      <img src={iconoUrl} alt="Catálogo" className="w-6 h-6" />
      <span className="text-[10px] font-bold">Catálogo</span>
    </button>
  </nav>
);
