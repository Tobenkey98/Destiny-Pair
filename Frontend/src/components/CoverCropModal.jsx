import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check } from "lucide-react";

export default function CoverCropModal({ src, ratio = 4, onSave, onClose }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);

  const OUT_W = 1600;
  const OUT_H = Math.round(OUT_W / ratio);
  const ZOOM = 1.12;

  useEffect(() => {
    if (imgLoaded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const iw = imgSize.w, ih = imgSize.h;
      const scaleX = rect.width / iw;
      const scaleY = (rect.width / ratio) / ih;
      const scale = Math.max(scaleX, scaleY) * ZOOM;
      const displayW = iw * scale;
      const displayH = ih * scale;
      const cropDisplayW = rect.width;
      const cropDisplayH = rect.width / ratio;
      const initialX = (displayW - cropDisplayW) / 2;
      const initialY = (displayH - cropDisplayH) / 2;
      setOffset({ x: -initialX, y: -initialY });
    }
  }, [imgLoaded, imgSize, ratio]);

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImgLoaded(true);
  }

  const startDrag = useCallback((clientX, clientY) => {
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  }, [offset]);

  const doDrag = useCallback((clientX, clientY) => {
    if (!dragStart) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const iw = imgSize.w, ih = imgSize.h;
    const scaleX = rect.width / iw;
    const scaleY = (rect.width / ratio) / ih;
    const scale = Math.max(scaleX, scaleY) * ZOOM;
    const displayW = iw * scale;
    const displayH = ih * scale;
    const cropDisplayW = rect.width;
    const cropDisplayH = rect.width / ratio;
    const maxOffX = 0;
    const minOffX = -(displayW - cropDisplayW);
    const maxOffY = 0;
    const minOffY = -(displayH - cropDisplayH);
    setOffset({
      x: Math.min(0, Math.max(minOffX, clientX - dragStart.x)),
      y: Math.min(0, Math.max(minOffY, clientY - dragStart.y)),
    });
  }, [dragStart, imgSize, ratio]);

  const endDrag = useCallback(() => {
    setDragStart(null);
  }, []);

  function handleSave() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const rect = container.getBoundingClientRect();
    const iw = imgSize.w, ih = imgSize.h;
    const scaleX = rect.width / iw;
    const scaleY = (rect.width / ratio) / ih;
    const scale = Math.max(scaleX, scaleY) * ZOOM;
    const cropW = rect.width / scale;
    const cropH = (rect.width / ratio) / scale;
    const cropX = Math.round(Math.abs(offset.x) / scale);
    const cropY = Math.round(Math.abs(offset.y) / scale);

    const cvs = document.createElement('canvas');
    cvs.width = OUT_W;
    cvs.height = OUT_H;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, OUT_W, OUT_H);
    cvs.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/jpeg', 0.9);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchEnd={endDrag}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-4xl rounded-3xl bg-background overflow-hidden shadow-luxe mx-2"
        >
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/40">
            <h3 className="font-display text-base sm:text-lg font-bold text-foreground">Position Your Cover Photo</h3>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-foreground/5 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative bg-black/10 touch-none select-none" ref={containerRef}>
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: `${ratio}/1` }}
            >
              <div
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  transition: dragStart ? 'none' : 'transform 0.2s ease-out',
                }}
                onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
                onMouseMove={(e) => doDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
                onTouchMove={(e) => { const t = e.touches[0]; doDrag(t.clientX, t.clientY); }}
              >
                <img
                  ref={imgRef}
                  src={src}
                  alt="Crop"
                  onLoad={onImgLoad}
                  className="pointer-events-none"
                  draggable={false}
                  style={{ maxWidth: 'none' }}
                />
              </div>

              {/* Dark overlays */}
              <div className="absolute inset-x-0 top-0 bg-black/50 pointer-events-none" style={{ height: `${Math.max(0, -offset.y)}px` }} />
              <div className="absolute inset-x-0 bottom-0 bg-black/50 pointer-events-none" style={{ height: `${Math.max(0, (containerRef.current ? (containerRef.current.getBoundingClientRect().height / ratio) + offset.y : 0))}px` }} />
              <div className="absolute inset-y-0 left-0 bg-black/50 pointer-events-none" style={{ width: `${Math.max(0, -offset.x)}px` }} />
              <div className="absolute inset-y-0 right-0 bg-black/50 pointer-events-none" style={{ width: `${Math.max(0, (containerRef.current ? containerRef.current.getBoundingClientRect().width * (1 - 1/ratio) + offset.x - (containerRef.current ? containerRef.current.getBoundingClientRect().width * (ratio - 1) / ratio : 0) : 0))}px` }} />

              {/* Crop guide border */}
              <div className="absolute inset-0 border-2 border-gold-royal/60 rounded pointer-events-none mx-[1px] my-[1px]" />

              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-gold-royal/20" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-gold-royal/20" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-gold-royal/20" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-gold-royal/20" />
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">Drag the image to choose which part to display</p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-full glass text-sm font-medium text-foreground/70 hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-2 rounded-full bg-gradient-to-r from-emerald to-emerald/90 text-white text-sm font-semibold shadow-soft hover:shadow-glow transition inline-flex items-center gap-2"
              >
                <Check className="h-4 w-4" /> OK
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
