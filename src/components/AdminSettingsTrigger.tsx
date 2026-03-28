"use client";

import { useState } from "react";
import AdminSettingsDrawer from "./AdminSettingsDrawer";

export function AdminSettingsTrigger({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 bg-slate-800 text-slate-100 shadow-inner ring-1 ring-slate-900/50 hover:bg-slate-600 hover:text-white px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer"
        title="Admin Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
           <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
           <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Admin Settings</span>
      </button>

      <AdminSettingsDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
