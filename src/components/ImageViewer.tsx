"use client";

import { useEffect, useRef, useState } from "react";

export function ImageViewer({ imageUri, secondaryImageUri, imageTitle = "Attached Context", isPopupMode = false }: { imageUri: string, secondaryImageUri?: string, imageTitle?: string, isPopupMode?: boolean }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<any>(null);
  const [showSecondary, setShowSecondary] = useState(false);

  // Decouple Chrome's aggressive failed-TTFB cache purely on newly clicked database records, preserving speed on flipping the same record via static internal mount caching
  const [sessionBust] = useState(() => Math.random().toString(36).substring(7));
  const activeRenderUri = showSecondary && secondaryImageUri ? secondaryImageUri : imageUri;

  // Cross-Record Navigation Hook
  useEffect(() => {
     setShowSecondary(false);
  }, [imageUri]);

  // Primary Viewer Boot / Hot-Swap Mechanism
  const [viewerError, setViewerError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setViewerError(false); // Reset error state on new image mount

    if (!viewerRef.current || !activeRenderUri) return;

    let hotSwapUrl = activeRenderUri;
    // Switch Drive URLs over to the dynamic API '.dzi' representation if applicable! 
    if (activeRenderUri.includes("drive.google.com") || activeRenderUri.includes("docs.google.com")) {
      const match = activeRenderUri.match(/\/d\/([a-zA-Z0-9-_]+)/) || activeRenderUri.match(/id=([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        hotSwapUrl = `/api/tiles/${match[1]}.dzi`;
      }
    }

    if (!osdRef.current) {
      (async () => {
        const OpenSeadragon = (await import("openseadragon")).default;
        if (!isMounted) return;

        const viewer = OpenSeadragon({
          element: viewerRef.current!,
          prefixUrl: "//openseadragon.github.io/openseadragon/images/", 
          tileSources: hotSwapUrl.endsWith('.dzi') ? hotSwapUrl : { type: 'image', url: hotSwapUrl },
          showNavigationControl: false,
          animationTime: 0.5,
          blendTime: 0.1,
          constrainDuringPan: true,
          maxZoomPixelRatio: 3,
          minZoomImageRatio: 0.8,
          visibilityRatio: 1,
        });
        
        osdRef.current = viewer;

        viewer.addHandler("open", () => {
          setTimeout(() => {
            if (viewer && viewer.viewport) {
              viewer.viewport.goHome(true);
              viewer.forceRedraw();
            }
          }, 50);
        });

        viewer.addHandler("open-failed", (e: any) => {
          if (!isMounted) return;
          console.log("OSD Native Fetch Engine Failed - Intercepted Black Screen!", e);
          setViewerError(true);
        });

        let lastWidth = viewerRef.current!.clientWidth;
        let lastHeight = viewerRef.current!.clientHeight;

        const observer = new ResizeObserver(() => {
          if (!viewerRef.current) return;
          const newWidth = viewerRef.current.clientWidth;
          const newHeight = viewerRef.current.clientHeight;
          if (Math.abs(newWidth - lastWidth) > 5 || Math.abs(newHeight - lastHeight) > 5) {
             lastWidth = newWidth; lastHeight = newHeight;
             if (viewer && viewer.viewport) viewer.viewport.goHome(true);
          }
        });
        observer.observe(viewerRef.current!);
        (viewer as any)._customObserver = observer;
      })();
    } else {
      osdRef.current.open(hotSwapUrl.endsWith('.dzi') ? hotSwapUrl : { type: 'image', url: hotSwapUrl });
    }

    return () => { isMounted = false; };
  }, [activeRenderUri, sessionBust]);

  useEffect(() => {
    return () => {
      if (osdRef.current) {
        if (osdRef.current._customObserver) osdRef.current._customObserver.disconnect();
        osdRef.current.destroy();
        osdRef.current = null;
      }
    };
  }, []);

  const handleZoomIn = () => {
    if (osdRef.current?.viewport) {
      osdRef.current.viewport.zoomBy(1.5);
      osdRef.current.viewport.applyConstraints();
    }
  };
  
  const handleZoomOut = () => {
    if (osdRef.current?.viewport) {
      osdRef.current.viewport.zoomBy(0.66);
      osdRef.current.viewport.applyConstraints();
    }
  };
  
  const handleRotateRight = () => {
    if (osdRef.current?.viewport) {
      const currentRotation = osdRef.current.viewport.getRotation();
      osdRef.current.viewport.setRotation(currentRotation + 90);
    }
  };

  const handlePopupAction = () => {
    if (isPopupMode) {
      window.close();
    } else {
      const popupWidth = 800;
      const popupHeight = Math.min(900, window.innerHeight);
      const leftConstraint = window.screenX + (window.outerWidth / 2) - (popupWidth / 2);
      
      const secParam = secondaryImageUri ? `&secondaryImage=${encodeURIComponent(secondaryImageUri)}` : "";
      
      window.open(
         `/popup?image=${activeImageUri_encoded}&title=${encodeURIComponent(imageTitle)}${secParam}`, 
         'MetaDB_DeepZoom_Viewer', 
         `popup=yes,width=${popupWidth},height=${popupHeight},left=${leftConstraint}`
      );
    }
  };

  const activeImageUri_encoded = encodeURIComponent(imageUri);

  return (
    <div className="relative w-full h-full group">
      <div 
        ref={viewerRef} 
        className="absolute top-0 left-0 w-full h-full bg-black/5 transition-opacity duration-150" 
      />
      
      {/* Unified Horizontal Action Overlay */}
      <div className="absolute bottom-2.5 right-2.5 flex flex-row space-x-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-auto">
        {secondaryImageUri && (
          <>
            <button 
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.90)"; e.currentTarget.style.backgroundColor = "#94a3b8"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
              onClick={(e) => { e.stopPropagation(); setShowSecondary(!showSecondary); }}
              className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-transform duration-75 focus:outline-none flex items-center justify-center transform hover:scale-105"
              title="Toggle File (Front/Back)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </>
        )}
        <button 
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.90)"; e.currentTarget.style.backgroundColor = "#94a3b8"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onClick={(e) => { e.stopPropagation(); handleRotateRight(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-transform duration-75 focus:outline-none flex items-center justify-center transform hover:scale-105"
          title="Rotate Right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
        <button 
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.90)"; e.currentTarget.style.backgroundColor = "#94a3b8"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-transform duration-75 focus:outline-none flex items-center justify-center transform hover:scale-105"
          title="Zoom Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button 
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.90)"; e.currentTarget.style.backgroundColor = "#94a3b8"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-transform duration-75 focus:outline-none flex items-center justify-center transform hover:scale-105"
          title="Zoom In"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button 
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.90)"; e.currentTarget.style.backgroundColor = "#94a3b8"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.backgroundColor = ""; }}
          onClick={(e) => { e.stopPropagation(); handlePopupAction(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-transform duration-75 focus:outline-none flex items-center justify-center transform hover:scale-105"
          title={isPopupMode ? "Close Secondary Window" : "Launch Detached Secondary Monitor"}
        >
          {isPopupMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[20px] h-[20px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-[18px] h-[18px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
