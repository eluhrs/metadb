"use client";

import { useState, useRef, useEffect } from "react";

export default function DisplayOptionsMockup() {
  const [leftWidth, setLeftWidth] = useState(40); // Standard 40/60 split like old interface
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track mock pagination to demonstrate the broadcast channel sync!
  const [mockActivePostcard, setMockActivePostcard] = useState(1);

  // Trigger Native Popup
  const openExternalImagePopup = () => {
    // Calculate a good popup dimension format
    const popupWidth = 800;
    const popupHeight = Math.min(900, window.innerHeight);
    const leftConstraint = window.screenX + (window.outerWidth / 2) - (popupWidth / 2);
    
    // Spawn Native OS Window specifically requesting popup frame constraints
    window.open(
       `/scratchpad/display-options/popup?image=mock_uri_${mockActivePostcard}`, 
       'MetaDB_DeepZoom_Viewer', 
       `popup=yes,width=${popupWidth},height=${popupHeight},left=${leftConstraint}`
    );
  };

  // Broadcast sync trigger when navigating records
  const simulateNavigation = () => {
    const nextCardId = mockActivePostcard + 1;
    setMockActivePostcard(nextCardId);
    
    // Transmit the new payload into the invisible web channel natively!
    const channel = new BroadcastChannel('metadb_image_sync');
    channel.postMessage({ type: 'SYNC_IMAGE', uri: `mock_uri_${nextCardId}`, title: `Mock Postcard Component ${nextCardId}` });
    channel.close();
  };

  // Handle Dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    // Constrain the split dynamically to prevent crushing either interface!
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className={`flex flex-col h-screen bg-slate-100 ${isDragging ? 'cursor-col-resize' : ''}`}>
      
      {/* App Header (Muted just to simulate structure) */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <h2 className="font-semibold text-gray-800 text-lg">Cataloging Prototype: Display Resizer</h2>
        <div className="text-sm text-gray-500 italic">Adjust center bar to test layouts</div>
      </div>

      {/* Main Split Interface */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        
        {/* LEFT COLUMN: Image Sandbox */}
        <div 
          className="bg-slate-100 relative flex flex-col items-center justify-start px-10"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Invisible mathematical spacer perfectly echoing the Right Column's Header height */}
          <div className="h-[124px] w-full shrink-0"></div>

          {/* Simulated "Classic" Image wrapper maintaining a perfect 1:1 squircle */}
          <div className="relative w-full aspect-square max-h-[80vh] max-w-full bg-zinc-300 border-2 border-blue-400 rounded-lg flex items-center justify-center p-8 shadow-inner overflow-hidden">
             <span className="text-gray-500 italic text-sm">Deep Zoom Canvas</span>
                
                {/* Beautiful Custom React Overlays masking the OpenSeadragon layer directly! */}
                <div className="absolute inset-0 bg-transparent flex flex-col justify-between p-4 pointer-events-none">
                  {/* Top Right Action Tools */}
                  <div className="flex justify-end pointer-events-auto">
                    <button 
                      onClick={openExternalImagePopup}
                      className="bg-slate-900/60 hover:bg-slate-900/90 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-lg flex items-center justify-center group"
                      title="Launch Detached Monitor Popup"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Bottom Right Zoom Tools */}
                  <div className="flex flex-col space-y-2 items-end pointer-events-auto pb-4">
                    <button className="bg-slate-900/60 hover:bg-black text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    </button>
                    <button className="bg-slate-900/60 hover:bg-black text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
             </div>
        </div>

        {/* INVISIBLE DRAGGABLE DIVIDER */}
        <div 
          className="w-4 hover:bg-black/5 active:bg-blue-400/30 cursor-col-resize z-10 transition-colors duration-200 flex flex-col items-center justify-start -mx-2 group shrink-0"
          onMouseDown={() => setIsDragging(true)}
        >
          {/* Mathematical spacer pushing the drag line down to perfectly align with the Image top edge */}
          <div className="h-[124px] w-full shrink-0"></div>
          
          {/* 3/4 inch subtle line indicator (approx 48px) top-aligned to the image payload */}
          <div className="w-[2px] h-12 bg-gray-200 rounded-full transition-colors group-hover:bg-blue-400/50 mt-4"></div>
        </div>

        {/* RIGHT COLUMN: Form Sandbox */}
        <div 
          className="bg-slate-100 flex flex-col"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {/* Mathematical Header ensuring identical vertical sync with the left Image Pane */}
          <div className="h-[100px] px-10 border-b border-gray-200 flex items-center justify-end shrink-0">
            <button 
              onClick={simulateNavigation}
              className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full shadow-sm border border-blue-100 font-semibold tracking-wide text-sm hover:bg-blue-100 transition-colors"
            >
              Simulate &quot;Next Record&quot; Sync
            </button>
          </div>
          
          {/* Standard Form spacing margin */}
          <div className="h-6 w-full shrink-0"></div>

          <div className="px-10 flex-1 space-y-6 overflow-y-auto pb-10">
            <div className="space-y-1.5">
              <label className="text-gray-600 text-sm font-semibold tracking-wide">title.english:</label>
              <input type="text" className="w-full bg-white border border-gray-300 rounded p-2 shadow-sm focus:ring-2 focus:ring-blue-200 outline-none" defaultValue="Taiwan Kenko Shrine" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-gray-600 text-sm font-semibold tracking-wide">subject: (A, M)</label>
              <textarea className="w-full bg-white border border-gray-300 rounded p-2 shadow-sm min-h-[80px] focus:ring-2 focus:ring-blue-200 outline-none" defaultValue="Structures (340); Religious and Educational Structures (346)" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-gray-600 text-sm font-semibold tracking-wide">description.critical:</label>
              <textarea className="w-full bg-white border border-gray-300 rounded p-2 shadow-sm min-h-[160px] focus:ring-2 focus:ring-blue-200 outline-none" defaultValue="Plans for Kenko Shrine in Taipei were initiated on the 30th anniversary..." />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
