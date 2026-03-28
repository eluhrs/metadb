"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type UserAllowList = {
  id: string;
  email: string;
  createdAt: string;
};

export default function AdminSettingsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"COLLECTIONS" | "USERS">("COLLECTIONS");
  
  // New Collection State
  const [collectionName, setCollectionName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Whitelist State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [allowList, setAllowList] = useState<UserAllowList[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "USERS") {
      fetchAllowList();
    }
  }, [isOpen, activeTab]);

  const fetchAllowList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/admin/allowlist');
      if (res.ok) {
        const data = await res.json();
        setAllowList(data);
      }
    } catch(e) { console.error(e); }
    setIsLoadingList(false);
  };

  const handleAddUser = async () => {
    if (!newUserEmail) return;
    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail })
      });
      if (res.ok) {
        setNewUserEmail("");
        setIsAddingUser(false);
        fetchAllowList();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add user.");
      }
    } catch(e) { console.error(e); }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm("Are you certain you want to revoke system-level access for this user?")) return;
    try {
      const res = await fetch(`/api/admin/allowlist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllowList();
      }
    } catch(e) { console.error(e); }
  };

  const router = useRouter();

  const handleImportCollection = async () => {
    if (!collectionName || !sheetUrl) {
      alert("Collection Name and Sheets URL are both required.");
      return;
    }
    
    setIsImporting(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: collectionName, 
          externalSheetUrl: sheetUrl 
        })
      });

      if (res.ok) {
        setCollectionName("");
        setSheetUrl("");
        onClose(); // Hide drawer on success
        router.refresh(); // Refresh dashboard to render new list
      } else {
        const err = await res.json();
        alert(err.error || "Failed to extract Google Sheet.");
      }
    } catch(e) { 
      console.error(e); 
      alert("Extraction failed. Check the console.");
    }
    setIsImporting(false);
  };

  return (
    <>
       {/* DRAWER BACKDROP */}
       <div 
         className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
         onClick={onClose}
       />

       {/* SLIDE-OUT PANEL */}
       <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col border-l border-gray-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
             <h2 className="text-xl font-extrabold tracking-tight flex items-center text-gray-900">
               <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
               Admin Settings
             </h2>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-200 p-2 rounded-full transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>

          {/* Segmented Toggle Control */}
          <div className="flex w-full bg-slate-100 border-b border-gray-200 p-2 shadow-inner">
             <button 
               onClick={() => setActiveTab("COLLECTIONS")}
               className={`flex-1 py-2 text-sm font-bold tracking-tight rounded-md transition-all ${activeTab === 'COLLECTIONS' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}
             >
               Add Collection
             </button>
             <button 
               onClick={() => setActiveTab("USERS")}
               className={`flex-1 py-2 text-sm font-bold tracking-tight rounded-md transition-all ${activeTab === 'USERS' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}
             >
               Manage Allow List
             </button>
          </div>

          {/* Drawer Content Views */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
             {activeTab === 'COLLECTIONS' && (
               <div className="flex flex-col space-y-6 flex-1 h-full max-h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl shadow-sm">
                   <h3 className="text-lg font-extrabold text-gray-900 mb-2 tracking-tight">Create Collection</h3>
                   <p className="text-sm text-gray-500 mb-6 leading-relaxed font-medium">Import a public Google Sheet with field headers (and optional metadata).</p>
                   
                   <div className="space-y-6">
                     <div>
                       <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">New Collection Name</label>
                       <input 
                         type="text" 
                         value={collectionName}
                         onChange={(e) => setCollectionName(e.target.value)}
                         placeholder="e.g. Rare Books Metadata" 
                         className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:border-slate-500 focus:outline-none transition-shadow shadow-sm placeholder:text-gray-300" 
                       />
                     </div>
                     <div>
                       <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5">Public Sheets URL</label>
                       <input 
                         type="text" 
                         value={sheetUrl}
                         onChange={(e) => setSheetUrl(e.target.value)}
                         placeholder="https://docs.google.com/spreadsheets/d/..." 
                         className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:border-slate-500 focus:outline-none transition-shadow shadow-sm placeholder:text-gray-300" 
                       />
                     </div>
                     
                     <div className="pt-2">
                       <button 
                         onClick={handleImportCollection}
                         disabled={isImporting}
                         className="w-full bg-slate-800 text-white rounded-lg py-3 text-sm font-extrabold tracking-wide shadow-md hover:bg-slate-900 hover:shadow-lg transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {isImporting ? (
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                           </svg>
                         )}
                         <span>{isImporting ? "Importing..." : "Import Fields & Data"}</span>
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'USERS' && (
               <div className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-extrabold tracking-tight text-gray-900 flex items-center space-x-2">
                      <span>User Allow List</span>
                      {!isLoadingList && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">{allowList.length} LOGINS</span>
                      )}
                   </h3>
                   <button 
                     onClick={() => setIsAddingUser(true)}
                     className="text-[11px] bg-white border border-gray-300 text-gray-700 font-bold px-3 py-1.5 rounded-md hover:bg-gray-50 shadow-sm flex items-center transition-colors"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                     Add User
                   </button>
                 </div>

                 <div className="space-y-2.5 relative">
                    
                    {isLoadingList && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex justify-center pt-10 z-10">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800"></div>
                      </div>
                    )}

                    {/* Inline Add New User Form Row */}
                    {isAddingUser && (
                      <div className="flex items-center justify-between p-3.5 border border-blue-300 bg-blue-50 rounded-lg shadow-sm animate-in fade-in zoom-in-95 duration-200 relative z-20">
                        <input 
                          autoFocus 
                          type="email" 
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddUser();
                            if (e.key === 'Escape') setIsAddingUser(false);
                          }}
                          placeholder="new.cataloger@domain.edu" 
                          className="flex-1 bg-white border border-blue-200 rounded px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400 mr-3" 
                        />
                        <div className="flex items-center space-x-1 shrink-0">
                          <button onClick={() => setIsAddingUser(false)} className="text-gray-400 hover:text-gray-600 p-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                          <button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded shadow-sm">Save</button>
                        </div>
                      </div>
                    )}

                    {/* Array Payload Render */}
                    {allowList.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3.5 border border-gray-100 bg-white shadow-sm rounded-lg hover:border-gray-300 transition-colors group cursor-default">
                        <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs ring-1 ring-gray-200">
                             {user.email.substring(0,2).toUpperCase()}
                           </div>
                           <span className="text-sm text-gray-700 font-medium">{user.email}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gray-50 hover:bg-rose-50 rounded-md ring-1 ring-gray-200 hover:ring-rose-200" 
                          title="Revoke Access"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    ))}

                    {/* Empty State Fallback */}
                    {allowList.length === 0 && !isAddingUser && !isLoadingList && (
                      <p className="text-xs text-gray-400 text-center py-4 italic">No specific external catalogers have been authorized yet.</p>
                    )}

                 </div>
               </div>
             )}

          </div>
       </div>
    </>
  );
}
