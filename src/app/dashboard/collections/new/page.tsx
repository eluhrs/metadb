"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCollection() {
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ingestAndCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/collections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch sheet headers");
      
      // Auto-assign foundational baseline mapping states.
      const initialMappings = data.headers.map((h: string) => ({
        name: h,
        type: "SHORT_TEXT",
        isAdministrative: false,
        isMultiple: false,
        isImageURI: false
      }));
      
      const saveRes = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectionName,
          externalSheetUrl: sheetUrl,
          imageStrategy: "URI", 
          fields: initialMappings, 
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save collection");
      
      // Redirect straight to the drag-and-drop interactive config grid
      router.push(`/dashboard/collections/${saveData.collectionId}/edit`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Create New Collection</h1>
      
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">{error}</div>}

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Collection Name</label>
          <input 
            type="text" 
            className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            value={collectionName} 
            onChange={e => setCollectionName(e.target.value)} 
            placeholder="e.g. Rare Books Collection"
            disabled={loading}
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Google Sheet URL</label>
          <input 
            type="text" 
            className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            value={sheetUrl} 
            onChange={e => setSheetUrl(e.target.value)} 
            placeholder="https://docs.google.com/spreadsheets/d/..."
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-2">The sheet must be shared with the world or your Google account.</p>
        </div>
        <button 
          onClick={ingestAndCreate} 
          disabled={loading || !sheetUrl || !collectionName}
          className="bg-blue-600 text-white px-6 py-2.5 font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Importing Bulk Data..." : "Create and Import"}
        </button>
      </div>
    </div>
  );
}
