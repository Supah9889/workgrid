import { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 60;
const MAX_PULL = 90;

export default function PullToRefresh({ onRefresh, children }) {
  const [indicatorY, setIndicatorY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const wrapRef = useRef(null);
  const startY = useRef(null);
  const currentY = useRef(0);
  const isRefreshing = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    if (!('ontouchstart' in window)) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const getScrollParentTop = () => {
      let el = wrap.parentElement;
      while (el && el !== document.body) {
        const { overflow, overflowY } = window.getComputedStyle(el);
        if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) {
          return el.scrollTop;
        }
        el = el.parentElement;
      }
      return window.scrollY;
    };

    const onStart = (e) => {
      if (isRefreshing.current || getScrollParentTop() > 5) return;
      startY.current = e.touches[0].clientY;
      currentY.current = 0;
    };

    const onMove = (e) => {
      if (startY.current === null || isRefreshing.current) return;
      if (getScrollParentTop() > 5) { startY.current = null; setIndicatorY(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { startY.current = null; setIndicatorY(0); return; }
      const clamped = Math.min(dy * 0.55, MAX_PULL);
      currentY.current = clamped;
      setIndicatorY(clamped);
    };

    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      const pulled = currentY.current;
      currentY.current = 0;
      if (pulled < THRESHOLD) { setIndicatorY(0); return; }
      isRefreshing.current = true;
      setRefreshing(true);
      setIndicatorY(THRESHOLD * 0.8);
      try { await onRefreshRef.current?.(); } catch {}
      isRefreshing.current = false;
      setRefreshing(false);
      setIndicatorY(0);
    };

    wrap.addEventListener('touchstart', onStart, { passive: true });
    wrap.addEventListener('touchmove', onMove, { passive: true });
    wrap.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      wrap.removeEventListener('touchstart', onStart);
      wrap.removeEventListener('touchmove', onMove);
      wrap.removeEventListener('touchend', onEnd);
    };
  }, []);

  const show = indicatorY > 5 || refreshing;
  const height = show ? (refreshing ? Math.round(THRESHOLD * 0.8) : indicatorY) : 0;
  const rotation = `rotate(${(indicatorY / THRESHOLD) * 360}deg)`;

  return (
    <div ref={wrapRef}>
      <div
        className="flex justify-center items-end overflow-hidden"
        style={{
          height,
          transition: (refreshing || indicatorY === 0) ? 'height 300ms ease' : 'none',
        }}
      >
        <div className="mb-2 w-8 h-8 rounded-full bg-slate-800 shadow-md flex items-center justify-center">
          <RefreshCw
            className={`w-4 h-4 text-slate-300 ${refreshing ? 'animate-spin' : ''}`}
            style={!refreshing ? { transform: rotation } : undefined}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
