import { useState } from 'react';
import { X } from 'lucide-react';
import { Carousel } from './Carousel';
import { Lightbox } from './Lightbox';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { parseImageList } from '../lib/media';

export const ProductModal = ({ pez, onClose }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useBodyScrollLock(Boolean(pez));

  if (!pez) return null;

  const images = parseImageList(pez.imagen_url).map((url) => ({ type: 'image', url }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center bg-black/50" onClick={onClose}>
        <div
          className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-app-90 bg-white sm:rounded-3xl overflow-hidden flex flex-col animate-[modal-in_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3 shrink-0">
            <button onClick={onClose} aria-label="Cerrar" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
              <X size={20} />
            </button>
            <h2 className="font-bold text-slate-800 truncate">{pez.nombre_comun}</h2>
          </header>

          <Carousel pez={pez} onOpenLightbox={setLightboxIndex} />

          <section className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-1">{pez.nombre_comun}</h2>
            <p className="text-sm text-slate-400 italic">{pez.nombre_cientifico}</p>
            <p className="mt-4 text-slate-600">{pez.descripcion}</p>
          </section>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={images}
          initialIndex={lightboxIndex}
          name={pez.nombre_comun}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
