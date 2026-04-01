"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CollectionActions({ id, isAdmin = false }: { id: string; isAdmin?: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const executeDelete = async () => {
    setConfirmingDelete(false);
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
        href={`/api/collections/${id}/export?t=${Date.now()}`}
        download
        className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-slate-500 rounded-lg transition-all shadow-sm"
        title="Export to CSV"
      >
        Export Data
      </a>
      {isAdmin && !confirmingDelete && (
        <button 
          onClick={() => setConfirmingDelete(true)}
          disabled={deleting}
          className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-slate-700 text-white hover:bg-rose-300 hover:text-rose-900 rounded-lg transition-all shadow-sm disabled:opacity-50"
          title="Delete Collection"
        >
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
      )}

      {isAdmin && confirmingDelete && (
        <div className="flex w-full sm:w-auto items-center space-x-2">
          <button 
            onClick={executeDelete}
            className="w-full sm:w-auto text-center px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-md rounded-lg transition-all animate-pulse"
            title="Confirm Deletion"
          >
            Confirm Delete
          </button>
          <button 
            onClick={() => setConfirmingDelete(false)}
            className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold bg-gray-300 text-gray-800 hover:bg-gray-400 rounded-lg transition-all"
            title="Cancel"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
