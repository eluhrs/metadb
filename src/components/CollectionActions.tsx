"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CollectionActions({ id, isAdmin = false }: { id: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this collection and ALL its cataloged metadata? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch(e) {
      alert("Error deleting collection.");
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:space-x-3 sm:gap-0 mt-4 lg:mt-0 w-full lg:w-auto">
      <Link 
        href={`/collections/${id}?index=0`}
        className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-slate-500 rounded-lg transition-all shadow-sm"
        title="Edit Catalog Records"
      >
        Edit Metadata
      </Link>
      {isAdmin && (
        <Link 
          href={`/dashboard/collections/${id}/edit`}
          className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-slate-500 rounded-lg transition-all shadow-sm"
          title="Configure Form Fields"
        >
          Configure Fields
        </Link>
      )}
      <a 
        href={`/api/collections/${id}/export`}
        download
        className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-slate-500 rounded-lg transition-all shadow-sm"
        title="Export to CSV"
      >
        Export Data
      </a>
      {isAdmin && (
        <button 
          onClick={handleDelete}
          disabled={deleting}
          className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-rose-300 hover:text-rose-900 rounded-lg transition-all shadow-sm disabled:opacity-50"
          title="Delete Collection"
        >
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
      )}
    </div>
  );
}
