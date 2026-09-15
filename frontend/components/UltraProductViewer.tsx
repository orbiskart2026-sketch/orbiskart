'use client';

import React, { useState, useRef } from 'react';

interface UltraProductViewerProps {
  images: string[];
  videoUrl?: string;
  title?: string;
}

export default function UltraProductViewer({ images, videoUrl, title }: UltraProductViewerProps) {
  const allImages = images && images.length > 0 ? images : ['/placeholder.png'];
  const [selectedMedia, setSelectedMedia] = useState<string>(allImages[0]);
  const [isVideo, setIsVideo] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number }>({ dist: 0 });

  // Zoom + बटन
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3.5)); // 3.5x अधिकतम
  };

  // Zoom - बटन
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  // ज़ूम रीसेट
  const handleResetZoom = () => {
    setZoomLevel(1);
    setOrigin({ x: 50, y: 50 });
  };

  // माउस से पैनिंग
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1 && containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    }
  };

  // मोबाइल 2-फिंगर पिंच ज़ूम (Pinch to Zoom)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const delta = dist - touchStartRef.current.dist;
        if (delta > 5) setZoomLevel((prev) => Math.min(prev + 0.1, 3.5));
        if (delta < -5) setZoomLevel((prev) => Math.max(prev - 0.1, 1));
      }
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current.dist = 0;
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 select-none">
      {/* थंबनेल गैलरी (फ़ोटो + वीडियो) */}
      <div className="flex md:flex-col gap-2 overflow-x-auto shrink-0 order-2 md:order-1 py-1">
        {allImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedMedia(img); setIsVideo(false); handleResetZoom(); }}
            className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition active:scale-95 ${
              !isVideo && selectedMedia === img ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/20' : 'border-slate-800 opacity-70 hover:opacity-100'
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
          </button>
        ))}

        {videoUrl && (
          <button
            onClick={() => { setIsVideo(true); handleResetZoom(); }}
            className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex flex-col items-center justify-center bg-slate-900 transition active:scale-95 ${
              isVideo ? 'border-indigo-500 scale-105 text-indigo-400' : 'border-slate-800 text-slate-400'
            }`}
          >
            <span className="text-xl">▶️</span>
            <span className="text-[9px] font-bold mt-0.5">वीडियो</span>
          </button>
        )}
      </div>

      {/* मुख्य मीडिया दर्शक (Touch Zoom Screen) */}
      <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden order-1 md:order-2 shadow-2xl">
        {isVideo && videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            className="w-full h-[380px] md:h-[480px] object-contain rounded-2xl bg-black"
          />
        ) : (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={zoomLevel > 1 ? handleResetZoom : handleZoomIn}
            className="w-full h-[380px] md:h-[480px] flex items-center justify-center overflow-hidden cursor-crosshair relative bg-black/40"
          >
            <img
              src={selectedMedia}
              alt={title || 'Product View'}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transition: zoomLevel === 1 ? 'transform 0.2s ease-out' : 'none',
              }}
              className="w-full h-full object-contain pointer-events-none will-change-transform"
            />
          </div>
        )}

        {/* अल्ट्रा टच ज़ूम कंट्रोल्स (+ / − / 1x) */}
        {!isVideo && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-lg transition active:scale-90"
              title="Zoom In (+)"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-lg transition active:scale-90"
              title="Zoom Out (−)"
            >
              −
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                className="px-2.5 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition active:scale-95"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* ज़ूम सहायता बैज */}
        {!isVideo && (
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-slate-300 text-[10px] px-2.5 py-1 rounded-full border border-slate-800 pointer-events-none">
            {zoomLevel > 1 ? `🔍 ${zoomLevel.toFixed(1)}x ज़ूम सक्रिय` : '👆 Double Tap या (+) दबाकर ज़ूम करें'}
          </div>
        )}
      </div>
    </div>
  );
}