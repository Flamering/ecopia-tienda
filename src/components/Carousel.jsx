import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getImageUrl, getMediaUrl, parseImageList } from '../lib/media';
import iconoUrl from '../icono.png?url';

export const Carousel = ({ pez, onOpenLightbox }) => {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef(null);
  const images = parseImageList(pez?.imagen_url);
  const imageMedia = images.map((url) => ({ type: 'image', url }));
  const videos = parseImageList(pez?.video_url).map((url) => ({ type: 'video', url }));
  const allMedia = videos.length > 0
    ? [...imageMedia.slice(0, 1), ...videos, ...imageMedia.slice(1)]
    : imageMedia;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(next, allMedia.length - 1)));
  };

  const goTo = (idx) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const goNext = () => goTo(Math.min(index + 1, allMedia.length - 1));
  const goPrev = () => goTo(Math.max(index - 1, 0));

  if (allMedia.length === 0 || !allMedia[0]?.url) {
    return (
      <div className="h-[55dvh] sm:h-[55vh] bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <img src={iconoUrl} alt="Ecopia" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-400">Sin imágenes disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {allMedia.map((media, idx) => (
          <div key={idx} className="min-w-full flex-shrink-0 snap-center h-[55dvh] sm:h-[55vh] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            {media.type === 'video' ? (
              <video key={media.url} width="100%" height="auto" controls className="max-h-full max-w-full" src={getMediaUrl(media.url)}>
                Tu navegador no soporta el elemento de video.
              </video>
            ) : (
              <button
                onClick={() => onOpenLightbox?.(idx)}
                aria-label={`Ampliar imagen ${idx + 1}`}
                className="w-full h-full flex items-center justify-center cursor-zoom-in"
              >
                <img
                  key={media.url}
                  src={getImageUrl(media.url, { w: 1000 })}
                  alt={pez.nombre_comun}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getMediaUrl(media.url);
                  }}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {allMedia.length > 1 && (
        <>
          <button onClick={goPrev} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-white" />
          </button>
          <button onClick={goNext} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
            <ChevronRight size={24} className="text-white" />
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 sm:hidden">
            {allMedia.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Ir a la imagen ${idx + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${idx === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>

          <div className="hidden sm:flex gap-2 p-2 bg-slate-900">
            {allMedia.map((media, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
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
        </>
      )}
    </div>
  );
};
