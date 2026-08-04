import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const usePinchZoom = ({ maxScale = 4, resetKey } = {}) => {
  const [state, setState] = useState({ scale: 1, tx: 0, ty: 0 });
  const stateRef = useRef(state);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const update = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => update({ scale: 1, tx: 0, ty: 0 }), [update]);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  const handleDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        startScale: stateRef.current.scale,
      };
      return;
    }

    if (pointersRef.current.size === 1) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (now - last.time < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        const scale = stateRef.current.scale > 1 ? 1 : 2;
        update({ scale, tx: 0, ty: 0 });
        return;
      }
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = clamp((pinchRef.current.startScale * dist) / pinchRef.current.dist, 1, maxScale);
      update({ scale, tx: 0, ty: 0 });
      return;
    }

    if (pointersRef.current.size === 1 && stateRef.current.scale > 1) {
      const scale = stateRef.current.scale;
      const rect = e.currentTarget.getBoundingClientRect();
      const maxX = Math.max(0, (rect.width * scale - window.innerWidth) / 2);
      const maxY = Math.max(0, (rect.height * scale - window.innerHeight) / 2);
      update({
        scale,
        tx: clamp(stateRef.current.tx + (e.clientX - prev.x), -maxX, maxX),
        ty: clamp(stateRef.current.ty + (e.clientY - prev.y), -maxY, maxY),
      });
    }
  };

  const handleEnd = (e) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
  };

  return {
    scale: state.scale,
    reset,
    style: {
      transform: `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`,
      touchAction: state.scale > 1 ? 'none' : 'auto',
      willChange: 'transform',
    },
    handlers: {
      onPointerDown: handleDown,
      onPointerMove: handleMove,
      onPointerUp: handleEnd,
      onPointerCancel: handleEnd,
    },
  };
};
