"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PaginationControls({
  collectionId,
  currentIndex,
  totalRecords
}: {
  collectionId: string;
  currentIndex: number;
  totalRecords: number;
}) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState((currentIndex + 1).toString());

  // Keep input in sync if navigated externally
  useEffect(() => {
    setInputVal((currentIndex + 1).toString());
  }, [currentIndex]);

  const handleJump = () => {
    let target = parseInt(inputVal, 10);
    if (isNaN(target)) {
      setInputVal((currentIndex + 1).toString());
      return;
    }
    if (target < 1) target = 1;
    if (target > totalRecords) target = totalRecords;
    
    router.push(`/collections/${collectionId}?index=${target - 1}`);
  };

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalRecords - 1;

  const btnClass = "px-3 py-1.5 rounded text-sm font-bold tracking-widest transition flex items-center justify-center min-w-[36px]";
  const activeClass = "bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200 shadow-sm";
  const disabledClass = "bg-transparent text-slate-500 pointer-events-none";

  return (
    <div className="flex items-center space-x-1 bg-slate-800/50 border border-slate-600/50 p-1 rounded-lg shadow-inner">
      <Link scroll={false} href={`/collections/${collectionId}?index=0`} className={`${btnClass} ${hasPrev ? activeClass : disabledClass}`} title="First Record">
        |&lt;
      </Link>
      <Link scroll={false} href={`/collections/${collectionId}?index=${currentIndex - 1}`} className={`${btnClass} ${hasPrev ? activeClass : disabledClass}`} title="Previous Record">
        &lt;
      </Link>
      
      <div className="flex items-center space-x-2 px-3">
        <input 
          type="text" 
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleJump(); }}
          onBlur={handleJump}
          className="w-14 text-center bg-slate-900 border border-slate-600 rounded shadow-inner py-1 font-medium text-white text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none transition-all"
        />
        <span className="text-sm font-medium text-slate-400">of {totalRecords}</span>
      </div>

      <Link scroll={false} href={`/collections/${collectionId}?index=${currentIndex + 1}`} className={`${btnClass} ${hasNext ? activeClass : disabledClass}`} title="Next Record">
        &gt;
      </Link>
      <Link scroll={false} href={`/collections/${collectionId}?index=${totalRecords - 1}`} className={`${btnClass} ${hasNext ? activeClass : disabledClass}`} title="Last Record">
        &gt;|
      </Link>
    </div>
  );
}
