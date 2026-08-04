import iconoUrl from '../icono.png?url';

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex items-center justify-center pb-[env(safe-area-inset-bottom)]">
    <button className="flex flex-col items-center py-2 text-emerald-600" aria-label="Catálogo">
      <img src={iconoUrl} alt="Catálogo" className="w-6 h-6" />
      <span className="text-[10px] font-bold">Catálogo</span>
    </button>
  </nav>
);
