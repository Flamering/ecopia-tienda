import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const Carousel = ({ pez }) => {
  const [index, setIndex] = useState(0);
  const images = parseImageList(pez?.imagen_url);
  const imageMedia = images.map((url) => ({ type: 'image', url }));
  const videos = parseImageList(pez?.video_url).map((url) => ({ type: 'video', url }));
  const allMedia = videos.length > 0
    ? [...imageMedia.slice(0, 1), ...videos, ...imageMedia.slice(1)]
    : imageMedia;

  const goNext = () => setIndex((i) => (i + 1) % allMedia.length);
  const goPrev = () => setIndex((i) => (i - 1 + allMedia.length) % allMedia.length);

  if (allMedia.length === 0 || !allMedia[0]?.url) {
    return (
      <div className="h-64 sm:h-96 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <img src={iconoUrl} alt="Ecopia" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-400">Sin imágenes disponibles</p>
        </div>
      </div>
    );
  }

  const current = allMedia[index];

  return (
    <div className="relative">
      <div className="h-64 sm:h-96 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
        {current.type === 'video' ? (
          <video key={current.url} width="100%" height="auto" controls className="max-h-full max-w-full" src={getMediaUrl(current.url)}>
            Tu navegador no soporta el elemento de video.
          </video>
        ) : (
          <img
            key={current.url}
            src={getImageUrl(current.url, { w: 1000 })}
            alt={pez.nombre_comun}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getMediaUrl(current.url);
            }}
          />
        )}

        {allMedia.length > 1 && (
          <>
            <button onClick={goPrev} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button onClick={goNext} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}
      </div>

      {allMedia.length > 1 && (
        <div className="flex gap-2 p-2 overflow-x-auto bg-slate-900">
          {allMedia.map((media, idx) => (
            <button
              key={idx}
              onClick={() => setIndex(idx)}
              aria-label={`Imagen ${idx + 1}`}
              className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === index ? 'border-emerald-500' : 'border-transparent hover:border-slate-600'
              }`}
            >
              {media.type === 'video' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Play size={16} className="text-white" />
                </div>
              ) : (
                <img
                  src={getImageUrl(media.url, { w: 200 })}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getMediaUrl(media.url);
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
