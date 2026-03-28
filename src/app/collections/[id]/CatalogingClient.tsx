"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PaginationControls } from "@/components/PaginationControls";
import { ImageViewer } from "@/components/ImageViewer";
import { CatalogingForm } from "@/components/CatalogingForm";

export function CatalogingClient({ 
  collection, 
  allCollections,
  recordsLength, 
  safeIndex, 
  activeImageUri, 
  currentRecord 
}: { 
  collection: any, 
  allCollections: { id: string, name: string }[],
  recordsLength: number, 
  safeIndex: number, 
  activeImageUri: string | null, 
  currentRecord: any 
}) {
  const [activeTab, setActiveTab] = useState<'desc' | 'admin'>('desc');
  const [globalSaveState, setGlobalSaveState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");

  const [leftWidth, setLeftWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerSaveNotification = (status: "IDLE" | "SAVING" | "SAVED" | "ERROR") => {
    setGlobalSaveState(status);
  };

  // Extract the exact Title field intelligently by querying the primary UI configuration definition!
  const titleFieldDef = collection?.fieldDefinitions?.slice()?.sort((a:any, b:any) => (a.uiOrder || 0) - (b.uiOrder || 0))?.[0];
  const rawTitle = titleFieldDef ? currentRecord?.values?.find((v:any) => v.fieldId === titleFieldDef.id)?.value : null;
  const popupTitle = rawTitle && rawTitle !== "" ? rawTitle : `MetaDB ID: ${currentRecord.id.substring(0,8)}`;

  // Sync the popup window via Broadcast API when the image changes
  useEffect(() => {
    if (activeImageUri) {
      const channel = new BroadcastChannel('metadb_image_sync');
      channel.postMessage({ type: 'SYNC_IMAGE', uri: activeImageUri, title: popupTitle });
      channel.close();
    }
  }, [activeImageUri, currentRecord, collection, popupTitle]);

  // Handle Dragging Events
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) setLeftWidth(newLeftWidth);
  }, [isDragging]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    
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
  }, [isDragging, handleMouseMove]);

  // Popup invocation is now handled natively via the standardized ImageViewer component

  return (
    <div className={`flex flex-col h-[calc(100vh-64px)] ${isDragging ? 'cursor-col-resize' : ''}`}>
      {/* Top Bar: Integrated Tabs, Collection Name, and Save Status */}
      <div className="bg-slate-700 px-6 py-3 flex items-center justify-between shadow-md z-20 shrink-0">
         <div className="flex items-center space-x-6">
           <div className="relative flex items-center">
             <select 
               className="appearance-none bg-transparent text-xl font-bold text-white tracking-tight pr-8 py-1 cursor-pointer focus:outline-none rounded hover:bg-slate-800/50 transition-colors"
               value={collection.id}
               onChange={(e) => {
                 window.location.href = `/collections/${e.target.value}`;
               }}
             >
               {allCollections?.map((c: any) => (
                 <option key={c.id} value={c.id} className="text-gray-900 text-base bg-white">{c.name}</option>
               ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-300">
               <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>
           
           {/* Subtle Divider */}
           <div className="h-6 w-px bg-slate-500"></div>
           
           <div className="flex space-x-1">
             <button 
               onClick={() => setActiveTab("desc")}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                 activeTab === "desc" 
                   ? "bg-slate-800 text-slate-100 shadow-inner ring-1 ring-slate-900/50" 
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-600/50"
               }`}
             >
               Descriptive
             </button>
             <button 
               onClick={() => setActiveTab("admin")}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                 activeTab === "admin" 
                   ? "bg-slate-800 text-slate-100 shadow-inner ring-1 ring-slate-900/50" 
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-600/50"
               }`}
             >
               Administrative
             </button>
           </div>
         </div>
         
         {/* Pagination & Save Status */}
         <div className="flex items-center space-x-3">
            <PaginationControls 
              collectionId={collection.id} 
              currentIndex={safeIndex} 
              totalRecords={recordsLength} 
            />
            <div className="h-6 border-l border-slate-500 ml-2"></div>
            <div className="w-6 flex items-center justify-center translate-y-[2px]" title={globalSaveState === "SAVING" ? "Saving changes..." : "All changes saved to database"}>
              {(globalSaveState === "IDLE" || globalSaveState === "SAVED") && (
                <svg className="w-[18px] h-[18px] text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {globalSaveState === "SAVING" && (
                <svg className="w-[18px] h-[18px] text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {globalSaveState === "ERROR" && (
                <svg className="w-[18px] h-[18px] text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
         </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        
        {/* Left Column: Image Viewer */}
        <div 
          className="bg-slate-100 h-full flex flex-col items-center justify-start pt-8 px-10 relative"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Constrained 1:1 Aspect Square for OSD Rendering */}
          <div className="relative w-full aspect-square max-h-[80vh] max-w-full bg-zinc-900 border-2 border-zinc-700 rounded-lg flex flex-col p-4 shadow-inner overflow-hidden">
             <div className="flex-1 w-full relative bg-black rounded shadow-[0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                 {activeImageUri ? (
                   <ImageViewer key={activeImageUri} imageUri={activeImageUri} imageTitle={popupTitle} />
                 ) : (
                    <div className="text-gray-500 italic text-sm flex items-center justify-center h-full">No Image Assigend</div>
                 )}
             </div>
          </div>
        </div>

        {/* INVISIBLE DRAGGABLE DIVIDER */}
        <div 
          className="w-4 hover:bg-black/5 active:bg-blue-400/30 cursor-col-resize z-10 transition-colors duration-200 flex flex-col items-center justify-start -mx-2 group shrink-0"
          onMouseDown={() => setIsDragging(true)}
        >
          {/* Prominent line indicator top-aligned to the image payload */}
          <div className="w-[3px] h-16 bg-gray-300 rounded-full transition-colors group-hover:bg-blue-400 mt-14"></div>
        </div>

        {/* Right Column: Cataloging Form */}
        <div 
           className="bg-slate-100 h-full overflow-y-auto px-6 pt-8 pb-10"
           style={{ width: `${100 - leftWidth}%` }}
        >
           <CatalogingForm 
             key={currentRecord.id}
             recordId={currentRecord.id}
             fieldDefinitions={collection.fieldDefinitions}
             existingValues={currentRecord.values}
             activeTab={activeTab}
             onSaveStatus={triggerSaveNotification}
           />
        </div>
      </div>
    </div>
  );
}
