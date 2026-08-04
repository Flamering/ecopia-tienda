import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getImageUrl, getMediaUrl } from '../lib/media';
import { usePinchZoom } from '../hooks/usePinchZoom';

const ZoomableImage = ({ item, name, resetKey }) => {
  const { style, handlers } = usePinchZoom({ resetKey });
  return (
    <img
      src={getImageUrl(item.url, { w: 1200, q: 80 })}
      alt={name}
      className="max-w-full max-h-full object-contain select-none"
      draggable={false}
      style={style}
      {...handlers}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = getMediaUrl(item.url);
      }}
    />
  );
};

export const Lightbox = ({ items, initialIndex = 0, onClose, name }) => {
  const [index, setIndex] = useState(initialIndex);
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el && items.length > 0) el.scrollLeft = initialIndex * el.clientWidth;
  }, [initialIndex, items.length]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(next, items.length - 1)));
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 shrink-0">
        <span className="text-white text-sm tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white">
          <X size={24} />
        </button>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {items.map((item, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
            <ZoomableImage item={item} name={name} resetKey={index} />
          </div>
        ))}
      </div>
    </div>
  );
};
