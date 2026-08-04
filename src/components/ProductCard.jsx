import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const ProductCard = ({ pez, viewMode = 'grid', onClick }) => {
  const images = parseImageList(pez?.imagen_url);
  const firstImage = images[0];
  const thumbnail = firstImage ? getImageUrl(firstImage, { w: viewMode === 'grid' ? 400 : 200 }) : null;
  const fallbackSrc = firstImage ? getMediaUrl(firstImage) : '';

  const renderImage = () =>
    thumbnail ? (
      <img
        src={thumbnail}
        alt={pez?.nombre_comun}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          if (fallbackSrc) e.target.src = fallbackSrc;
        }}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <img src={iconoUrl} alt="Ecopia" className="w-12 h-12 sm:w-14 sm:h-14" />
      </div>
    );

  if (viewMode === 'list') {
    return (
      <div onClick={onClick} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
          {renderImage()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800">{pez.nombre_comun}</h4>
          <p className="text-xs text-slate-400 italic truncate">{pez.nombre_cientifico}</p>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer flex flex-col">
      <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-teal-100 overflow-hidden">{renderImage()}</div>
      <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col">
        <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase">{pez.clasificacion}</span>
        <h3 className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 sm:mt-1 line-clamp-1">{pez.nombre_comun}</h3>
        <p className="text-xs text-slate-400 italic line-clamp-1">{pez.nombre_cientifico}</p>
      </div>
    </div>
  );
};
