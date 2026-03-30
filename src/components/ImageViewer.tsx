"use client";

import { useEffect, useRef } from "react";

export function ImageViewer({ imageUri, imageTitle = "Attached Context", isPopupMode = false }: { imageUri: string, imageTitle?: string, isPopupMode?: boolean }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current || !imageUri) return;

    let viewer: any = null;
    let observer: ResizeObserver | null = null;
    let isMounted = true;

    (async () => {
      // Dynamically load OpenSeadragon precisely on the client to entirely bypass Next.js SSR crashes
      const OpenSeadragon = (await import("openseadragon")).default;
      
      // CRITICAL: If React unmounted this component while we were asynchronously awaiting the binary, abort instantly!
      // This prevents the global browser environment from being locked by invisible, detached zombie viewer canvases!
      if (!isMounted) return;

      viewer = OpenSeadragon({
        element: viewerRef.current!,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/", 
        tileSources: {
          type: 'image',
          // Automatically route Google Drive URLs through our secure Next.js Server Proxy to bypass CORS!
          url: imageUri.includes("drive.google.com") || imageUri.includes("docs.google.com")
            ? `/api/images/proxy?url=${encodeURIComponent(imageUri)}`
            : imageUri,
        },
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
        }, 150);
      });

      let lastWidth = viewerRef.current!.clientWidth;
      let lastHeight = viewerRef.current!.clientHeight;

      observer = new ResizeObserver(() => {
        if (!viewerRef.current) return;
        
        const newWidth = viewerRef.current.clientWidth;
        const newHeight = viewerRef.current.clientHeight;
        
        // Strict boundary checking: only reset the viewport Home state if the physical window/resizer dragging mutated the canvas dimension mathematically!
        if (Math.abs(newWidth - lastWidth) > 5 || Math.abs(newHeight - lastHeight) > 5) {
           lastWidth = newWidth;
           lastHeight = newHeight;
           
           if (viewer && viewer.viewport) {
             viewer.viewport.goHome(true);
           }
        }
      });
      observer.observe(viewerRef.current!);
    })();

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      if (viewer) viewer.destroy();
    };
  }, [imageUri]);

  const handleZoomIn = () => {
    if (osdRef.current && osdRef.current.viewport) {
      osdRef.current.viewport.zoomBy(1.5);
      osdRef.current.viewport.applyConstraints();
    }
  };
  
  const handleZoomOut = () => {
    if (osdRef.current && osdRef.current.viewport) {
      osdRef.current.viewport.zoomBy(0.66);
      osdRef.current.viewport.applyConstraints();
    }
  };

  const handlePopupAction = () => {
    if (isPopupMode) {
      window.close();
    } else {
      const popupWidth = 800;
      const popupHeight = Math.min(900, window.innerHeight);
      const leftConstraint = window.screenX + (window.outerWidth / 2) - (popupWidth / 2);
      window.open(
         `/popup?image=${activeImageUri_encoded}&title=${encodeURIComponent(imageTitle)}`, 
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
        className="absolute top-0 left-0 w-full h-full bg-black/5" 
      />
      
      {/* Unified Horizontal Action Overlay */}
      <div className="absolute bottom-2.5 right-2.5 flex flex-row space-x-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-auto">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleZoomOut(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-all focus:outline-none flex items-center justify-center transform hover:scale-105"
          title="Zoom Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleZoomIn(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-all focus:outline-none flex items-center justify-center transform hover:scale-105"
          title="Zoom In"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePopupAction(); }}
          className="bg-slate-900 border border-zinc-700/50 hover:bg-black text-zinc-300 hover:text-white p-2.5 rounded-full shadow-lg transition-all focus:outline-none flex items-center justify-center transform hover:scale-105"
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
