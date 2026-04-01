"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type FieldDefinition = {
  id: string;
  name: string;
  isFile: boolean;
  isSecondaryFile: boolean;
  isAdministrative: boolean;
  isLong: boolean;
  isBulk: boolean;
  isLocked: boolean;
  isControlled: boolean;
  controlledVocabList: string | null;
  controlledSeparator: string;
  controlledMulti: boolean;
  controlledAdds: boolean;
  controlledDrop: boolean;
  aiPrompt: string | null;
  aiModel: string | null;
  uiOrder: number;
  columnIndex?: number | null;
};

function FieldRowMarkup({
  f, updateField, deleteField, handleComplexToggle, isOverlay = false, 
  hasFileFieldSelected = false, hasFile2Selected = false, cacheState, onPreCache,
  attributes, listeners, setNodeRef, style, isDragging
}: any) {
  const isAi = f.aiPrompt !== null;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-gray-200 text-sm ${isOverlay ? 'bg-white shadow-2xl opacity-100 ring-2 ring-blue-500 scale-102 z-50' : 'hover:bg-gray-50 bg-white'}`}
    >
      <td className="px-2 py-3 text-gray-400 text-center">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Drag to reorder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15"></polyline>
            <polyline points="9 5 12 2 15 5"></polyline>
            <polyline points="19 9 22 12 19 15"></polyline>
            <polyline points="9 19 12 22 15 19"></polyline>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="12" y1="2" x2="12" y2="22"></line>
          </svg>
        </button>
      </td>
      <td className="px-3 py-3 min-w-[340px] w-full">
        <div className="flex flex-row items-center gap-2 w-full">
          <input
            type="text"
            value={f.name}
            onChange={(e) => updateField(f.id, { name: e.target.value })}
            className="w-full border-gray-300 rounded px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500 font-medium bg-transparent hover:bg-white transition-colors"
          />
          {(f.isFile || f.isSecondaryFile) && (
            <div className="flex-shrink-0 flex items-center pr-1">
              {cacheState?.active ? (
                <div className="w-24 lg:w-32 h-[26px] bg-slate-200 rounded overflow-hidden border border-slate-300 relative shadow-inner">
                  <div
                    className="h-full bg-green-500 transition-all duration-300 ease-out"
                    style={{ width: `${cacheState.total ? Math.round((cacheState.cached / cacheState.total) * 100) : 0}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider font-extrabold text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                    {cacheState.cached} / {cacheState.total}
                  </div>
                </div>
              ) : cacheState?.error ? (
                <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold px-2 py-1 rounded w-full line-clamp-1 cursor-help" title={cacheState.error}>
                  {cacheState.error}
                </div>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); onPreCache?.(); }}
                  className={`${cacheState?.completed ? 'bg-green-50 text-green-700 border border-green-200 opacity-80 hover:bg-green-100 hover:text-green-800' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700 shadow-sm'} transition-colors text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase tracking-wider`}
                  title={cacheState?.completed ? "Media Successfully Cached. Click to re-sync any newly added images." : "Pre-Cache Native Google Drive Blobs"}
                >
                  {cacheState?.completed ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      cached
                    </>
                  ) : (
                    <>
                      cache
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          {(f.id.startsWith('temp-') || f.columnIndex === -1) && (
            <button
              onClick={(e) => { e.preventDefault(); deleteField(f.id); }}
              className="text-red-300 hover:text-red-500 transition-colors flex-shrink-0 mx-1"
              title="Delete Custom Field"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </td>

      <td className="px-2 py-3 text-center border-l border-r border-gray-200">
        <label className={`flex items-center justify-center ${(!f.isFile && hasFileFieldSelected) || f.isSecondaryFile ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={f.isFile}
            disabled={(!f.isFile && hasFileFieldSelected) || f.isSecondaryFile}
            onChange={(e) => updateField(f.id, { isFile: e.target.checked })}
            className={`w-4 h-4 text-blue-600 rounded ${(!f.isFile && hasFileFieldSelected) || f.isSecondaryFile ? 'cursor-not-allowed bg-gray-300 border-gray-400 shadow-inner' : ''}`}
          />
        </label>
      </td>

      <td className="px-2 py-3 text-center border-r border-gray-200">
        <label className={`flex items-center justify-center ${(!f.isSecondaryFile && hasFile2Selected) || f.isFile ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={f.isSecondaryFile}
            disabled={(!f.isSecondaryFile && hasFile2Selected) || f.isFile}
            onChange={(e) => updateField(f.id, { isSecondaryFile: e.target.checked })}
            className={`w-4 h-4 text-emerald-600 rounded ${(!f.isSecondaryFile && hasFile2Selected) || f.isFile ? 'cursor-not-allowed bg-gray-300 border-gray-400 shadow-inner' : ''}`}
          />
        </label>
      </td>

      <td className="px-2 py-3 text-center border-r border-gray-200">
        <label className={`flex items-center justify-center ${f.isFile || f.isSecondaryFile ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input disabled={f.isFile || f.isSecondaryFile} type="checkbox" checked={f.isLong} onChange={(e) => updateField(f.id, { isLong: e.target.checked })} className={`w-4 h-4 rounded text-blue-600 ${f.isFile || f.isSecondaryFile ? 'cursor-not-allowed bg-gray-300 border-gray-400 shadow-inner opacity-50' : ''}`} />
        </label>
      </td>

      <td className="px-2 py-3 text-center border-r border-gray-200">
        <label className={`flex items-center justify-center ${f.isFile || f.isSecondaryFile || f.isLong ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input disabled={f.isFile || f.isSecondaryFile || f.isLong} type="checkbox" checked={f.isBulk} onChange={(e) => updateField(f.id, { isBulk: e.target.checked })} className={`w-4 h-4 rounded text-blue-600 ${f.isFile || f.isSecondaryFile || f.isLong ? 'cursor-not-allowed bg-gray-300 border-gray-400 shadow-inner opacity-50' : ''}`} />
        </label>
      </td>

      <td className="px-2 py-3 text-center border-l border-r border-gray-200">
        <label className="flex items-center justify-center cursor-pointer">
          <input
            type="checkbox"
            checked={f.isLocked}
            onChange={(e) => updateField(f.id, { isLocked: e.target.checked })}
            className="w-4 h-4 text-slate-800 rounded border-gray-300"
          />
        </label>
      </td>

      <td className="px-3 py-3 text-center border-r border-gray-200">
        <button
          onClick={(e) => { e.preventDefault(); handleComplexToggle(f, 'write'); }}
          disabled={f.isFile || f.isSecondaryFile}
          className={`px-3 py-1 text-[11px] font-bold rounded transition shadow-sm ${f.isFile || f.isSecondaryFile ? 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed border border-gray-200' : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200'}`}
        >
          text
        </button>
      </td>

      <td className="px-3 py-3 text-center border-l border-r border-gray-200">
        <ToggleButton
          active={f.isControlled}
          disabled={f.isFile || f.isSecondaryFile || f.isLong}
          label="Terms"
          onClick={() => handleComplexToggle(f, 'controlled')}
        />
      </td>

      <td className="px-3 py-3 text-center border-r border-gray-200">
        <ToggleButton
          active={isAi}
          disabled={f.isLocked || f.isFile || f.isSecondaryFile}
          label="Prompt"
          onClick={() => handleComplexToggle(f, 'ai')}
        />
      </td>
    </tr>
  );
}

// Strictly wraps the visual row in a unique draggable context map hook natively.
function SortableFieldRow(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.f.id, data: { fieldset: props.f.isAdministrative ? 'admin' : 'desc' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return <FieldRowMarkup {...props} attributes={attributes} listeners={listeners} setNodeRef={setNodeRef} style={style} isDragging={isDragging} />;
}

function ToggleButton({ active, disabled = false, onClick, label }: { active: boolean, disabled?: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        px-3 py-1 text-[11px] font-medium rounded transition-all duration-150 shadow-sm
        ${active
          ? 'bg-gray-700 text-white shadow-inner scale-[0.98] ring-1 ring-gray-800/50 hover:bg-gray-800'
          : disabled
            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60 shadow-none'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      {label}
    </button>
  );
}

// Droppable Table Body Container ensures we can capture drops when a fieldset is completely empty 
function DroppableTableBody({ id, items, children }: any) {
  const { setNodeRef } = useDroppable({ id, data: { fieldset: id } });
  return (
    <tbody ref={setNodeRef} className="bg-white">
      <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
        {children}
        {items.length === 0 && (
          <tr>
            <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400 border-b border-gray-100 border-dashed">
              Drop fields here to assign to {id === 'admin' ? 'Administrative' : 'Descriptive'}
            </td>
          </tr>
        )}
      </SortableContext>
    </tbody>
  );
}

export function EditFieldMappings({ collection, availableModels = [] }: { collection: any, availableModels?: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fields, setFields] = useState<FieldDefinition[]>(() => {
    return [...collection.fieldDefinitions].sort((a: any, b: any) => (a.uiOrder || 0) - (b.uiOrder || 0));
  });

  const descriptiveFields = fields.filter((f) => !f.isAdministrative);
  const administrativeFields = fields.filter((f) => f.isAdministrative);
  const hasFileFieldSelected = fields.some(f => f.isFile);
  const hasFile2Selected = fields.some(f => f.isSecondaryFile);

  const [activeDragField, setActiveDragField] = useState<FieldDefinition | null>(null);
  const [modalOpen, setModalOpen] = useState<'ai' | 'controlled' | 'write' | null>(null);
  const [activeField, setActiveField] = useState<FieldDefinition | null>(null);
  const [overwriteText, setOverwriteText] = useState("");
  const [selectedVocabTerms, setSelectedVocabTerms] = useState<string[]>([]);
  const [isConfirmingWrite, setIsConfirmingWrite] = useState(false);

  const [cacheStates, setCacheStates] = useState<Record<string, { active: boolean, total: number, cached: number, completed?: boolean, error?: string }>>({});

  useEffect(() => {
    if (hasFileFieldSelected || hasFile2Selected) {
      const fileFields = fields.filter(f => f.isFile || f.isSecondaryFile);
      fileFields.forEach(f => {
        fetch(`/api/collections/${collection.id}/cache?fieldId=${f.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.total > 0 && data.total === data.cached) {
              setCacheStates(prev => ({ ...prev, [f.id]: { active: false, total: data.total, cached: data.cached, completed: true } }));
            }
          }).catch(console.error);
      });
    }
  }, [collection.id, hasFileFieldSelected, hasFile2Selected]);

  const handlePreCache = async (fieldId: string) => {
    // 1. Defensively save the UI React configuration to Postgres first so they don't lose it if they walk away!
    const successfullySaved = await saveMappings(false);
    if (!successfullySaved) return;

    setCacheStates(prev => ({ ...prev, [fieldId]: { active: true, total: 0, cached: 0, completed: false } }));
    let isComplete = false;
    let currentTotal = 0;

    // Dependable Sequential Polling Loop
    while (!isComplete) {
      try {
        const res = await fetch(`/api/collections/${collection.id}/cache?fieldId=${fieldId}`, { method: 'POST' });
        if (!res.ok) {
          const errorText = await res.text().catch(() => "Unknown Server Crash");
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        const data = await res.json();

        currentTotal = data.total;

        if (data.debug) {
          setCacheStates(prev => ({ ...prev, [fieldId]: { active: false, total: 0, cached: 0, completed: false, error: data.debug } }));
          return;
        }

        setCacheStates(prev => ({ ...prev, [fieldId]: { active: true, total: currentTotal, cached: data.cached, completed: false } }));

        if (currentTotal === 0 || data.cached >= currentTotal) {
          isComplete = true;
        }
      } catch (e: any) {
        console.error(e);
        setCacheStates(prev => ({ ...prev, [fieldId]: { active: false, total: 0, cached: 0, completed: false, error: e.message } }));
        return; // Abort the UI loop without triggering the 1.5s 'completed' green tick!
      }
    }
    setTimeout(() => {
      setCacheStates(prev => ({ ...prev, [fieldId]: { active: false, total: currentTotal, cached: currentTotal, completed: true } }));
    }, 1500);
  };

  const handleAddField = () => {
    setFields(prev => [...prev, {
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      name: `Custom Field`,
      isFile: false,
      isSecondaryFile: false,
      isAdministrative: false,
      isLong: false,
      isBulk: false,
      isLocked: false,
      isControlled: false,
      controlledVocabList: null,
      controlledSeparator: "|",
      controlledMulti: false,
      controlledAdds: false,
      controlledDrop: false,
      aiPrompt: null,
      aiModel: null,
      uiOrder: prev.length,
      columnIndex: -1
    }]);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    if (activeField?.id === id) setActiveField(prev => prev ? { ...prev, ...updates } : null);
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const saveMappings = async (redirect = true) => {
    setLoading(true);
    setError("");
    try {
      // Regenerate explicit order tracking the single flattened array state
      const payload = fields.map((f, i) => ({ ...f, uiOrder: i }));

      const res = await fetch(`/api/collections/${collection.id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: payload }),
      });
      if (!res.ok) throw new Error("Failed to save changes");

      if (redirect) {
        router.push("/dashboard");
        router.refresh();
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      if (redirect) setLoading(false); else setLoading(false);
    }
  };

  const handleComplexToggle = (field: FieldDefinition, type: 'ai' | 'controlled' | 'write') => {
    setActiveField(field);

    if (type === 'write') {
      setOverwriteText("");
      setSelectedVocabTerms([]);
      setIsConfirmingWrite(false);
      setModalOpen('write');
      return;
    }

    let isCurrentlyOn = false;
    if (type === 'ai') isCurrentlyOn = field.aiPrompt !== null;
    if (type === 'controlled') isCurrentlyOn = field.isControlled;

    if (!isCurrentlyOn) {
      if (type === 'ai') updateField(field.id, { aiPrompt: "", aiModel: availableModels[0] || "gemini-1.5-flash" });
      if (type === 'controlled') updateField(field.id, { isControlled: true, controlledSeparator: "|" });
    }

    setModalOpen(type);
  };

  const executeOverwrite = async (fieldId: string) => {
    let finalValue = overwriteText.trim();
    if (activeField?.isControlled) {
      finalValue = selectedVocabTerms.join(activeField.controlledSeparator || "|");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/fields/${fieldId}/overwrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: finalValue })
      });
      if (!res.ok) throw new Error("Overwrite completely failed to execute on server.");
      setModalOpen(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const field = fields.find(f => f.id === active.id);
    setActiveDragField(field || null);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    // Use our explicit custom fieldset boundary tracker attached to both items and empty droppables
    const overContainer = over.data.current?.fieldset;
    if (!overContainer) return;

    setFields(prev => {
      const activeIdx = prev.findIndex(f => f.id === active.id);
      const item = prev[activeIdx];
      if (!item) return prev; // Should not happen 

      const isCurrentlyAdmin = item.isAdministrative;
      const shouldBeAdmin = overContainer === 'admin';

      if (isCurrentlyAdmin !== shouldBeAdmin) {
        // Create an updated duplicate of the array
        const newItems = [...prev];
        // Mutate the specific item's container association
        newItems[activeIdx] = { ...item, isAdministrative: shouldBeAdmin };

        // Attempt to find the specific item index we hovered over within the newly associated container
        const overIdx = newItems.findIndex(f => f.id === over.id);

        // If we dropped exactly on top of another item, snap the item to that adjacent visual index 
        if (overIdx >= 0) {
          return arrayMove(newItems, activeIdx, overIdx);
        }

        // Otherwise, we dropped onto the empty container row, returning the mutated array drops it at the bottom mechanically
        return newItems;
      }
      return prev;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveDragField(null);
    if (!over) return;

    if (active.id !== over.id) {
      setFields(prev => {
        const oldIndex = prev.findIndex(f => f.id === active.id);
        const newIndex = prev.findIndex(f => f.id === over.id);

        // Only swap if we dropped over a valid row item
        if (oldIndex >= 0 && newIndex >= 0) {
          return arrayMove(prev, oldIndex, newIndex);
        }
        return prev;
      });
    }
  };

  return (
    <div className="relative w-full max-w-full flex flex-col">
      {/* Sticky Top Header & Extracted Actions */}
      <div className="sticky top-0 z-30 bg-slate-100 pt-8 lg:pt-12 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 border-b border-gray-400 transition-all">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 block truncate max-w-2xl" title={collection.name}>
          {collection.name} Field Configuration:
        </h1>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-gray-800 font-bold px-3 py-2 text-xs uppercase tracking-wider transition-colors mr-2 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-stretch bg-slate-800 text-slate-100 shadow-inner ring-1 ring-slate-900/50 rounded-full text-xs font-bold transition overflow-hidden">
            <button
              onClick={handleAddField}
              className="flex items-center justify-center space-x-1.5 hover:bg-slate-600 hover:text-white pl-4 pr-3 py-2 transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8"></path>
                <path d="M12 8v8"></path>
              </svg>
              <span>Add Field</span>
            </button>

            <div className="w-[1.5px] bg-slate-600"></div>

            <button
              onClick={() => saveMappings(true)}
              disabled={loading}
              className="flex items-center justify-center space-x-1.5 hover:bg-slate-600 hover:text-white pr-4 pl-3 py-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-300"></div>
                  <span>Saving...</span>
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span>Save Config</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 shadow-sm">{error}</div>}

      <div className="pb-0 overflow-x-auto w-full">
        <DndContext
          id="dnd-field-config"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* --- Descriptive Fields Section --- */}
          <div className="mb-10 min-w-max">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4 px-1">
              Descriptive Fields
            </h2>
            <div className="bg-white text-sm shadow-sm border border-gray-200 overflow-hidden rounded-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-3 w-8 text-center font-semibold text-gray-400">Move</th>
                    <th className="px-3 py-3 font-semibold text-gray-600 min-w-[340px]">Field Name</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-l border-r border-gray-200" title="Primary Image URI">File 1</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Secondary Image URI">File 2</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Long Text Area">Long</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200">Bulk</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Lock Manual Input">Lock</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Global Database Overwrite">Write</th>

                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-l border-r border-gray-200">Vocab</th>

                    <th className="px-3 py-3 font-semibold text-center text-gray-600 border-r border-gray-200">AI</th>
                  </tr>
                </thead>
                <DroppableTableBody id="desc" items={descriptiveFields.map(f => f.id)}>
                  {descriptiveFields.map((f) => (
                    <SortableFieldRow key={f.id} f={f} updateField={updateField} deleteField={deleteField} handleComplexToggle={handleComplexToggle} hasFileFieldSelected={hasFileFieldSelected} hasFile2Selected={hasFile2Selected} cacheState={cacheStates[f.id]} onPreCache={() => handlePreCache(f.id)} />
                  ))}
                </DroppableTableBody>
              </table>
            </div>
          </div>

          {/* --- Administrative Fields Section --- */}
          <div className="mb-4 min-w-max">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4 px-1 mt-6">
              Administrative Fields
            </h2>
            <div className="bg-white text-sm shadow-sm border border-gray-200 overflow-hidden rounded-xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-3 w-8 text-center font-semibold text-gray-400">Move</th>
                    <th className="px-3 py-3 font-semibold text-gray-600 min-w-[280px]">Field Name</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-l border-r border-gray-200" title="Administrative Fields Cannot Act As Files"></th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200">Long</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200">Bulk</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Lock Manual Input">Lock</th>
                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-r border-gray-200" title="Global Database Overwrite">Write</th>

                    <th className="px-2 py-3 w-20 min-w-[5rem] font-semibold text-center text-gray-600 border-l border-r border-gray-200">Vocab</th>

                    <th className="px-3 py-3 font-semibold text-center text-gray-600 border-r border-gray-200">AI</th>
                  </tr>
                </thead>
                <DroppableTableBody id="admin" items={administrativeFields.map(f => f.id)}>
                  {administrativeFields.map((f) => (
                    <SortableFieldRow key={f.id} f={f} updateField={updateField} deleteField={deleteField} handleComplexToggle={handleComplexToggle} hasFileFieldSelected={hasFileFieldSelected} hasFile2Selected={hasFile2Selected} cacheState={cacheStates[f.id]} onPreCache={() => handlePreCache(f.id)} />
                  ))}
                </DroppableTableBody>
              </table>
            </div>
          </div>

          <DragOverlay dropAnimation={{ ...defaultDropAnimationSideEffects({ styles: { active: { opacity: "1" } } }) }}>
            {activeDragField ? (
              <table className="w-full bg-white shadow-xl ring-2 ring-blue-500 rounded-lg overflow-hidden" style={{ borderCollapse: 'initial', borderSpacing: 0 }}>
                <tbody>
                  <FieldRowMarkup f={activeDragField} updateField={() => { }} deleteField={() => {}} handleComplexToggle={() => { }} isOverlay={true} cacheState={cacheStates[activeDragField.id]} onPreCache={() => { }} />
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>



      {modalOpen === 'controlled' && activeField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 pb-1">Manage Vocabulary</h3>
              <span className="text-gray-400 font-bold cursor-pointer hover:text-gray-600" onClick={() => setModalOpen(null)}>✕</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Provide authority terms for the <span className="font-semibold text-gray-800">{activeField?.name}</span> field.</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vocabulary List (One term per line)</label>
              <textarea
                value={activeField?.controlledVocabList || ''}
                onChange={(e) => updateField(activeField?.id || '', { controlledVocabList: e.target.value })}
                placeholder={"Term A\nTerm B\nTerm C"}
                className="w-full whitespace-pre font-mono border border-gray-300 rounded text-xs p-3 focus:ring-slate-600 focus:outline-none mb-3 h-[180px] resize-y"
              />

              <div className="border-t border-gray-200 pt-4 mt-2">
                <label className="block text-xs font-semibold text-gray-800 mb-2 uppercase tracking-wider">Field Settings</label>
                <div className="flex flex-col space-y-2 mb-2">
                  {/* HTML Dropdown (Single Term) */}
                  <div className={`p-2 rounded-lg border transition-colors ${activeField?.controlledDrop ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <label className="flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`interact-${activeField?.id}`}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 mr-3"
                        checked={activeField?.controlledDrop}
                        onChange={() => updateField(activeField?.id || '', { controlledDrop: true, controlledMulti: false, controlledAdds: false })}
                      />
                      <span className="font-semibold text-gray-900 block">HTML Dropdown (Single Term)</span>
                    </label>
                  </div>

                  {/* Autocomplete List (Multiple Terms) */}
                  <div className={`p-2 rounded-lg border transition-colors ${activeField?.controlledMulti ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <label className="flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`interact-${activeField?.id}`}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 mr-3"
                        checked={activeField?.controlledMulti}
                        onChange={() => updateField(activeField?.id || '', { controlledMulti: true, controlledDrop: false })}
                      />
                      <span className="font-semibold text-gray-900 block">Autocomplete List (Multiple Terms)</span>
                    </label>

                    <div className={`pl-10 mt-3 flex flex-col space-y-3 transition-opacity duration-200 ${activeField?.controlledMulti ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-gray-700 w-32">Field Delimeter:</span>
                        <select
                          value={activeField?.controlledSeparator || '|'}
                          onChange={(e) => updateField(activeField?.id || '', { controlledSeparator: e.target.value })}
                          className="border border-gray-300 bg-white rounded text-xs px-1 py-0.5 focus:ring-slate-600 focus:outline-none w-10 text-center"
                        >
                          <option value="|">|</option>
                          <option value=";">;</option>
                          <option value=",">,</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-gray-700 w-32">Allow New Terms:</span>
                        <label className="flex items-center cursor-pointer px-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                            checked={activeField?.controlledAdds}
                            onChange={(e) => updateField(activeField?.id || '', { controlledAdds: e.target.checked })}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button onClick={() => {
                updateField(activeField?.id || '', { isControlled: false, controlledVocabList: null, controlledMulti: false, controlledAdds: false, controlledDrop: false });
                setModalOpen(null);
              }} className="text-red-500 hover:text-red-700 text-sm font-medium">Disable Vocabulary</button>
              <button onClick={() => setModalOpen(null)} className="bg-slate-800 text-white px-6 py-2 rounded text-sm hover:bg-slate-700 font-bold shadow-sm">Save Vocabulary</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen === 'write' && activeField && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-red-50 rounded-xl shadow-2xl border-2 border-red-300 p-6 max-w-md w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-red-900 border-b-2 border-red-400 pb-1 pr-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                Overwrite Field Values
              </h3>
              <span className="text-red-400 font-bold cursor-pointer hover:text-red-700 transition" onClick={() => setModalOpen(null)}>✕</span>
            </div>
            {!isConfirmingWrite ? (
              <>
                <p className="text-xs text-red-700 mb-5 font-semibold bg-red-100 p-3 rounded border border-red-200 shadow-inner leading-relaxed">
                  Warning: This action is permanent. {activeField?.isControlled ? "Select field(s)" : "Enter text"} to replace the current value(s) of <span className="font-extrabold text-red-900 bg-red-200 px-1 py-0.5 rounded">{activeField?.name}</span> across the entire collection.
                </p>

                {activeField?.isControlled ? (
                  <div className="relative mb-4">
                    <div className="text-sm text-red-800 mb-2">Select new field(s) or leave blank to clear all existing values:</div>
                    <div className="max-h-40 overflow-y-auto border-2 border-red-300 rounded bg-white p-2 shadow-inner">
                      {activeField.controlledVocabList?.split('\n').map(t => t.trim()).filter(Boolean).map((o, idx) => (
                        <label key={idx} className="flex items-center space-x-3 p-2 hover:bg-red-50 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                            checked={selectedVocabTerms.includes(o)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVocabTerms(prev => [...prev, o]);
                              } else {
                                setSelectedVocabTerms(prev => prev.filter(t => t !== o));
                              }
                            }}
                          />
                          <span className="text-sm text-gray-800 font-semibold">{o}</span>
                        </label>
                      ))}
                      {(!activeField.controlledVocabList || activeField.controlledVocabList.trim() === '') && (
                        <div className="text-sm text-gray-500 italic p-2 text-center">No vocabulary terms currently defined in the schema.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full border-2 border-red-300 rounded text-sm p-3 mb-4 h-24 focus:ring-red-600 focus:border-red-600 focus:outline-none bg-white text-gray-900 shadow-sm"
                    placeholder="Enter new text or leave blank to clear all existing values."
                    value={overwriteText}
                    onChange={(e) => setOverwriteText(e.target.value)}
                  />
                )}

                <div className="flex justify-end items-center mt-2">
                  <button
                    onClick={() => setIsConfirmingWrite(true)}
                    className="bg-red-600 text-white px-6 py-2.5 rounded text-sm hover:bg-red-700 hover:shadow-md font-extrabold shadow transition-all"
                  >
                    Overwrite Field Values
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-xl font-black text-red-900 mb-2">Are you absolutely sure?</h4>
                <p className="text-sm text-red-700 font-medium mb-8 px-4">
                  This will instantly and permanently delete existing data for <span className="font-extrabold bg-red-200 px-1 py-0.5 rounded">{activeField?.name}</span> across all records in the current collection.
                </p>
                <div className="flex gap-4 w-full justify-center">
                  <button
                    onClick={() => setIsConfirmingWrite(false)}
                    disabled={loading}
                    className="bg-white text-gray-700 border border-gray-300 px-6 py-2.5 rounded text-sm hover:bg-gray-50 font-bold shadow-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeOverwrite(activeField.id)}
                    disabled={loading}
                    className="bg-red-600 text-white px-6 py-2.5 rounded text-sm hover:bg-red-700 font-extrabold shadow-md disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Overwriting...
                      </>
                    ) : "Yes, Overwrite Records"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen === 'ai' && activeField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 pb-1">AI Settings</h3>
              <span className="text-gray-400 font-bold cursor-pointer hover:text-gray-600" onClick={() => setModalOpen(null)}>✕</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Configure generative behavior for <span className="font-semibold text-gray-800">{activeField?.name}</span> field.</p>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prompt text</label>
                <textarea
                  className="w-full border border-gray-300 rounded text-sm p-3 h-40 focus:ring-blue-500 focus:outline-none"
                  placeholder="Translate {{Title English}} to Japanese."
                  value={activeField?.aiPrompt || ''}
                  onChange={(e) => updateField(activeField?.id || '', { aiPrompt: e.target.value })}
                />
                <span className="text-[10px] text-blue-600 font-medium">Use {'{{field_name}}'} or {'{{image}}'} variables within AI prompts</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">AI Model Selection</label>
                <select
                  className="w-full border border-gray-300 rounded text-sm p-2 focus:ring-blue-500 focus:outline-none bg-white"
                  value={activeField?.aiModel || availableModels[0]}
                  onChange={(e) => updateField(activeField?.id || '', { aiModel: e.target.value })}
                >
                  {availableModels.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <button onClick={() => {
                updateField(activeField?.id || '', { aiPrompt: null });
                setModalOpen(null);
              }} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove AI Prompt</button>
              <button onClick={() => setModalOpen(null)} className="bg-slate-800 text-white px-6 py-2 rounded text-sm hover:bg-slate-700 font-bold shadow-sm">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
