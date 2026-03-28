"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ImageViewer } from "@/components/ImageViewer";

export default function NativePopupViewer() {
  const searchParams = useSearchParams();
  
  const [isClient, setIsClient] = useState(false);
  const [activeImageUri, setActiveImageUri] = useState<string>("No Image Loaded");
  const [activeTitle, setActiveTitle] = useState<string>("Loading Context...");
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setActiveImageUri(searchParams.get("image") || "No Image Loaded");
    setActiveTitle(searchParams.get("title") || "Loading Context...");
    
    // 1. Configure the BroadcastChannel to listen for navigation events directly from the Master Window!
    const channel = new BroadcastChannel('metadb_image_sync');
    
    // 2. Wire the listener to instantly update this specific component's state!
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC_IMAGE') {
        // We received a navigation ping from the main browser interface!
        setActiveImageUri(event.data.uri);
        setActiveTitle(event.data.title || "Untitled Component");
        
        // Trigger a tiny visualization in the mock just to prove it worked
        setPulseAnimation(true);
        setTimeout(() => setPulseAnimation(false), 500);
      }
    };
    
    return () => {
      // Safely close the channel memory when the user Xs out of the popup monitor natively
      channel.close();
    };
  }, []);

  return (
    <div className={`flex flex-col h-screen bg-black transition-colors ${pulseAnimation ? 'bg-indigo-950/40' : ''}`}>
      {/* Absolute Full Screen Lightbox Implementation */}
      {/* Top Title Overlay */}
      <div className="absolute top-0 left-0 right-0 p-5 border-b border-white/10 bg-black/60 backdrop-blur z-20 flex justify-center items-center pointer-events-none">
         <span className="text-zinc-200 font-sans tracking-wide text-xl font-semibold drop-shadow-xl">{activeTitle}</span>
      </div>
      
      {/* Enormous Canvas Target */}
      <div className="flex-1 w-full relative overflow-hidden bg-black">
         {isClient && activeImageUri && activeImageUri !== "No Image Loaded" ? (
            <ImageViewer key={activeImageUri} imageUri={activeImageUri} imageTitle={activeTitle} isPopupMode={true} />
         ) : (
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-zinc-600 font-mono tracking-widest text-sm uppercase">Awaiting Image Payload...</span>
            </div>
         )}
      </div>
    </div>
  );
}
