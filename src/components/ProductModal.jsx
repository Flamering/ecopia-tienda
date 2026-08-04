import { X } from 'lucide-react';
import { Carousel } from './Carousel';

export const ProductModal = ({ pez, onClose }) =>
  pez && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-app-90 bg-white rounded-3xl overflow-hidden overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Carousel pez={pez} />
        <div className="p-6">
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full">
            <X size={24} className="text-white" />
          </button>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{pez.nombre_comun}</h2>
          <p className="text-sm text-slate-400 italic">{pez.nombre_cientifico}</p>
          <p className="mt-4 text-slate-600">{pez.descripcion}</p>
        </div>
      </div>
    </div>
  );
