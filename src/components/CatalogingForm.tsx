"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";


function MultiAutocompleteInput({ vocabTerms, options, separator, allowAdds, onAdd, onRemove }: any) {
   const [search, setSearch] = useState("");
   const [open, setOpen] = useState(false);
   const [focused, setFocused] = useState(false);
   const [rejectedTerm, setRejectedTerm] = useState<string | null>(null);
   const [greenTerm, setGreenTerm] = useState<string | null>(null);

   const filtered = options.filter((o: string) => o.toLowerCase().includes(search.toLowerCase()) && !vocabTerms.includes(o)).slice(0, 15);

   const handleSubmission = (val: string, exactMatch: any) => {
       if (allowAdds || exactMatch) {
          const finalVal = exactMatch || val;
          onAdd(finalVal, !exactMatch);
          setSearch("");
          setOpen(false);
          
          if (!exactMatch) {
             setGreenTerm(finalVal);
             setTimeout(() => setGreenTerm(null), 800);
          }
       } else {
          setSearch("");
          setOpen(false);
          setRejectedTerm(val);
          setTimeout(() => setRejectedTerm(null), 800);
       }
   };

   return (
      <div className="w-full border p-2 rounded-md shadow-sm flex flex-wrap gap-2 items-center min-h-[46px] relative border-gray-300 bg-white focus-within:ring-2 focus-within:ring-slate-600">
         {vocabTerms.map((term: string, idx: number) => (
             <span key={idx} className={`text-sm px-2.5 py-1 rounded inline-flex items-center shadow-sm border transition-colors duration-500 ${greenTerm === term ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
               {term} 
               <button type="button" tabIndex={-1} onClick={() => onRemove(idx)} className="ml-1.5 text-gray-400 hover:text-red-500">×</button>
             </span>
         ))}
         {rejectedTerm && (
             <span className="text-sm px-2.5 py-1 rounded inline-flex items-center shadow-sm border border-red-300 bg-red-100 text-red-800 transition-colors duration-500">
               {rejectedTerm} 
               <button type="button" tabIndex={-1} className="ml-1.5 text-red-400 cursor-not-allowed">×</button>
             </span>
         )}
         <div className="flex-1 min-w-[140px]">
            <input 
               type="text" 
               placeholder="Type to search/add term..." 
               className="w-full outline-none border-none focus:ring-0 text-sm bg-transparent p-1" 
               value={search}
               onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
               onFocus={() => { setFocused(true); setOpen(true); }}
               onBlur={() => setTimeout(() => { 
                   const val = search.trim();
                   if (val) {
                      const exactMatch = options.find((o: string) => o.toLowerCase() === val.toLowerCase());
                      handleSubmission(val, exactMatch);
                   }
                   setFocused(false); 
                   setOpen(false); 
               }, 200)}
               onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === 'Tab') {
                       const val = search.trim();
                       if (val) {
                          e.preventDefault();
                          const exactMatch = options.find((o: string) => o.toLowerCase() === val.toLowerCase());
                          handleSubmission(val, exactMatch);
                       }
                   }
               }}
            />
         </div>
         {open && focused && search.trim().length > 0 && filtered.length > 0 && (
            <ul className="absolute left-0 top-full mt-1 w-full max-h-[250px] overflow-y-auto bg-white border border-gray-300 shadow-xl rounded-md z-50">
               {filtered.map((opt: string, i: number) => (
                  <li 
                     key={i} 
                     className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800 border-b border-gray-100 last:border-0"
                     onMouseDown={(e) => {
                        e.preventDefault();
                        onAdd(opt, false);
                        setSearch("");
                        setOpen(false);
                     }}
                  >
                     {opt}
                  </li>
               ))}
            </ul>
         )}
      </div>
   );
}

export function CatalogingForm({
  recordId, 
  fieldDefinitions, 
  existingValues,
  activeTab,
  onSaveStatus
}: { 
  recordId: string, 
  fieldDefinitions: any[], 
  existingValues: any[],
  activeTab: 'desc' | 'admin',
  onSaveStatus?: (status: "IDLE" | "SAVING" | "SAVED" | "ERROR") => void
}) {
  const router = useRouter();
  
  // Transform existing values into a mapped state `{ [fieldId]: value }`
  const initialValues = existingValues.reduce((acc, val) => {
    acc[val.fieldId] = val.value;
    return acc;
  }, {} as Record<string, string>);

  const [formValues, setFormValues] = useState<Record<string, string>>(initialValues);
  const [localVocabAdditions, setLocalVocabAdditions] = useState<Record<string, string[]>>({});
  const [bulkPopupField, setBulkPopupField] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState("");
  const [activeAiField, setActiveAiField] = useState<string | null>(null);

  const sortedFields = [...fieldDefinitions].sort((a,b) => (a.uiOrder || 0) - (b.uiOrder || 0));
  const descriptiveFields = sortedFields.filter(f => !f.isAdministrative);
  const administrativeFields = sortedFields.filter(f => f.isAdministrative);
  const activeFields = activeTab === 'desc' ? descriptiveFields : administrativeFields;

  const handleChange = (fieldId: string, val: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: val }));
    if (onSaveStatus) onSaveStatus("IDLE");
  };

  const handleSave = async (explicitMergedMap?: Record<string, string>) => {
    const payloadValues = explicitMergedMap || formValues;
    if (onSaveStatus) onSaveStatus("SAVING");
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          values: payloadValues
        })
      });
      if (!res.ok) throw new Error("Failed to save");
      if (onSaveStatus) onSaveStatus("SAVED");
      router.refresh(); 
    } catch (e) {
      if (onSaveStatus) onSaveStatus("ERROR");
    }
  };

  const handleBulkApply = async (fieldId: string) => {
    const val = formValues[fieldId] || '';
    if (bulkCount.trim() && val) {
      try {
        if (onSaveStatus) onSaveStatus("SAVING");
        const res = await fetch("/api/records/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startRecordId: recordId,
            fieldId,
            value: val,
            rangeString: bulkCount
          })
        });
        if (!res.ok) throw new Error("Bulk apply failed");
        if (onSaveStatus) onSaveStatus("SAVED");
        setBulkPopupField(null);
        setBulkCount("");
      } catch (e) {
        if (onSaveStatus) onSaveStatus("ERROR");
        alert("Error during bulk apply");
      }
    }
  };

  const handleProcessAi = async (fieldId: string) => {
    setActiveAiField(fieldId);
    if (onSaveStatus) onSaveStatus("SAVING");
    try {
      const res = await fetch("/api/records/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, fieldId })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "AI Processing failed");
      }
      
      const data = await res.json();
      if (data.text) {
         const newValues = { ...formValues, [fieldId]: data.text };
         setFormValues(newValues);
         await handleSave(newValues);
      }
    } catch (e: any) {
      if (onSaveStatus) onSaveStatus("ERROR");
      alert("Error generating AI response: " + e.message);
    } finally {
      setActiveAiField(null);
    }
  };

  return (
    <div className="flex flex-col bg-slate-100 relative w-full">
      
      {/* Form Fields Body */}
      <div className="flex flex-col space-y-6 bg-slate-100 pb-16">
        {activeFields.map(def => {
          
          const isStatic = def.staticText !== null;
          const isVocab = def.isControlled;
          const isAi = def.aiPrompt !== null;

          // Vocab multi parsing
          const separator = def.controlledSeparator || "|";
          const rawValue = formValues[def.id] || "";
          const vocabTerms = isVocab && def.controlledMulti && rawValue.trim() !== "" 
                ? rawValue.split(separator).map((t: string) => t.trim()).filter((t: string) => t.length > 0)
                : [];
          const baseVocabOptions = isVocab && def.controlledVocabList 
                ? def.controlledVocabList.split('\n').map((t: string) => t.trim()).filter(Boolean)
                : [];
          const extraOptions = localVocabAdditions[def.id] || [];
          const vocabOptions = Array.from(new Set([...baseVocabOptions, ...extraOptions])).sort((a,b) => a.localeCompare(b));

          return (
            <div key={def.id} className="relative group">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>{def.name} {def.isFile && <span className="ml-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold italic">(File/Image Source)</span>}</span>
              </label>

              <div className="flex items-start space-x-2">
                <div className="flex-1 relative">
                  
                  {isStatic ? (
                    <div className="bg-gray-200/50 text-gray-600 p-4 rounded-md text-sm border border-gray-300 shadow-sm w-full min-h-[50px]">
                      {formValues[def.id] || def.staticText}
                    </div>
                  ) : isVocab && def.controlledMulti ? (
                     <MultiAutocompleteInput
                        vocabTerms={vocabTerms}
                        options={vocabOptions}
                        separator={separator}
                        allowAdds={def.controlledAdds}
                        onRemove={(idx: number) => {
                           const newTerms = [...vocabTerms];
                           newTerms.splice(idx, 1);
                           const merged = newTerms.join(separator);
                           const updatedFormValues = { ...formValues, [def.id]: merged };
                           setFormValues(updatedFormValues);
                           handleSave(updatedFormValues);
                        }}
                        onAdd={(val: string, isNewAddition?: boolean) => {
                           const newTerms = [...vocabTerms, val];
                           const merged = newTerms.join(separator);
                           const updatedFormValues = { ...formValues, [def.id]: merged };
                           setFormValues(updatedFormValues);
                           handleSave(updatedFormValues);

                           if (isNewAddition) {
                               setLocalVocabAdditions(prev => ({ ...prev, [def.id]: [...(prev[def.id] || []), val] }));
                               fetch(`/api/fields/${def.id}/term`, {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ term: val })
                               }).then(() => router.refresh()).catch(err => console.error("Failed to append to authority list dynamically", err));
                           }
                        }}
                     />
                  ) : isVocab && def.controlledDrop ? (
                    <div className="relative">
                      <select 
                        className="w-full bg-white shadow-sm border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-slate-600 focus:outline-none text-gray-800 text-sm appearance-none cursor-pointer"
                        value={formValues[def.id] || ""}
                        onChange={(e) => { 
                           const updatedFormValues = { ...formValues, [def.id]: e.target.value };
                           setFormValues(updatedFormValues); 
                           handleSave(updatedFormValues); 
                        }}
                      >
                        <option value="">Select option...</option>
                        {vocabOptions.map((opt: string, idx: number) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  ) : def.isLong ? (
                    <textarea 
                      className="w-full bg-white shadow-sm border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-slate-600 focus:outline-none text-gray-800 text-sm min-h-[100px]"
                      value={formValues[def.id] || ""}
                      onChange={(e) => handleChange(def.id, e.target.value)}
                      onBlur={() => handleSave()}
                    />

                  ) : (
                    <input 
                      type="text"
                      className="w-full bg-white shadow-sm border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-slate-600 focus:outline-none text-gray-800 text-sm"
                      value={formValues[def.id] || ""}
                      onChange={(e) => handleChange(def.id, e.target.value)}
                      onBlur={() => handleSave()}
                      placeholder={isAi ? "Click button to trigger AI processing..." : ""}
                    />
                  )}
                </div>
                
                {/* Right Aligned Action Tools */}
                <div className="w-8 flex-shrink-0 relative flex flex-col justify-start items-center space-y-2 pt-1.5 min-h-[32px]">
                  {def.isBulk && !isStatic && (
                    <>
                      <button 
                        onClick={() => setBulkPopupField(bulkPopupField === def.id ? null : def.id)}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${bulkPopupField === def.id ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'}`}
                        title="Bulk Apply Value"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {bulkPopupField === def.id && (
                        <div className="absolute right-10 top-0 z-20 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-64 flex flex-col space-y-2">
                          <span className="text-xs font-semibold text-gray-700">Apply value to exact record numbers:</span>
                          <input 
                            type="text" 
                            placeholder="e.g. 3, 5-9, 15"
                            value={bulkCount}
                            onChange={(e) => setBulkCount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleBulkApply(def.id);
                              }
                            }}
                            className="border border-gray-300 rounded text-sm px-2 py-1.5 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 mb-1 font-mono placeholder:font-sans placeholder:text-gray-400" 
                          />
                          <button 
                            onClick={() => handleBulkApply(def.id)}
                            className="bg-blue-600 text-white rounded text-xs py-1.5 hover:bg-blue-700 font-medium tracking-wide"
                          >
                            Apply Value
                          </button>
                          <div className="absolute right-[-6px] top-3 w-3 h-3 bg-white border-t border-r border-gray-200 rotate-45" />
                        </div>
                      )}
                    </>
                  )}

                  {isAi && (
                    <button 
                       onClick={() => handleProcessAi(def.id)}
                       disabled={activeAiField === def.id}
                       className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${activeAiField === def.id ? 'text-blue-400 bg-blue-50 cursor-wait' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'}`} 
                       title="Process AI (Manual Trigger)"
                    >
                       {activeAiField === def.id ? (
                         <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                       ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                         </svg>
                       )}
                     </button>
                  )}

                </div>
              </div>
            </div>
          );
        })}

        {activeFields.length === 0 && (
          <div className="text-center p-12 text-gray-400 text-sm italic">
            No fields mapped exactly to {activeTab === 'admin' ? "Administrative" : "Descriptive"}.
          </div>
        )}
      </div>
    </div>
  );
}
