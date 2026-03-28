"use client";

import React, { useState } from 'react';
import Link from 'next/link';

type Field = {
  id: number;
  name: string;
  isLong: boolean;
  bulk: boolean;
  static: boolean;
  controlled: boolean;
  multi: boolean;
  additions: boolean;
  dropdown: boolean;
  ai: boolean;
};

export default function ConfigOptionsScratchpad() {
  const [descriptiveFields, setDescriptiveFields] = useState<Field[]>([
    { id: 1, name: 'Title English', isLong: false, bulk: false, static: false, controlled: false, multi: false, additions: false, dropdown: false, ai: false },
    { id: 2, name: 'Description', isLong: true, bulk: false, static: false, controlled: false, multi: false, additions: false, dropdown: false, ai: false },
    { id: 3, name: 'Subject', isLong: false, bulk: true, static: false, controlled: true, multi: true, additions: true, dropdown: false, ai: false },
    { id: 4, name: 'Category', isLong: false, bulk: false, static: false, controlled: true, multi: false, additions: false, dropdown: true, ai: false },
    { id: 5, name: 'Title Japanese', isLong: false, bulk: false, static: false, controlled: false, multi: false, additions: false, dropdown: false, ai: true },
  ]);

  const [administrativeFields, setAdministrativeFields] = useState<Field[]>([
    { id: 6, name: 'Rights', isLong: true, bulk: false, static: true, controlled: false, multi: false, additions: false, dropdown: false, ai: false },
  ]);

  const [modalOpen, setModalOpen] = useState<'AI' | 'STATIC' | 'VOCAB' | null>(null);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [bulkPopupOpen, setBulkPopupOpen] = useState(false);

  const toggleField = (id: number, fieldset: 'desc' | 'admin', key: keyof Field, value: any) => {
    if (fieldset === 'desc') {
      setDescriptiveFields(descriptiveFields.map(f => f.id === id ? { ...f, [key]: value } : f));
    } else {
      setAdministrativeFields(administrativeFields.map(f => f.id === id ? { ...f, [key]: value } : f));
    }
  };

  const handleComplexToggle = (field: Field, type: 'ai' | 'static' | 'controlled', fieldset: 'desc'|'admin') => {
    setActiveField(field);
    const isCurrentlyOn = field[type];
    
    // If it's turning ON, open modal to configure immediately. If already ON, toggle it OFF.
    if (!isCurrentlyOn) {
      toggleField(field.id, fieldset, type, true);
      setModalOpen(type === 'controlled' ? 'VOCAB' : type === 'ai' ? 'AI' : 'STATIC');
    } else {
      toggleField(field.id, fieldset, type, false);
    }
  };

  const ToggleButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => {
    return (
      <button
        onClick={onClick}
        className={`
          px-3 py-1 text-[11px] font-medium rounded transition-all duration-150 shadow-sm
          ${active 
            ? 'bg-gray-700 text-white shadow-inner scale-[0.98] ring-1 ring-gray-800/50 hover:bg-gray-800' 
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }
        `}
      >
        {label}
      </button>
    );
  };

  const FieldRow = ({ f, fieldset }: { f: Field, fieldset: 'desc'|'admin' }) => (
    <tr className="hover:bg-gray-50 group border-b border-gray-200 last:border-0 text-sm">
      <td className="px-3 py-2 text-gray-400 cursor-move text-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 inline-block">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </td>
      <td className="px-4 py-2">
        <input 
          type="text" 
          value={f.name}
          onChange={(e) => toggleField(f.id, fieldset, 'name', e.target.value)}
          className="w-full border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500 font-medium bg-transparent hover:bg-white" 
        />
      </td>
      <td className="px-4 py-2 text-center border-r border-gray-200">
        <label className="flex items-center justify-center cursor-pointer">
          <input type="checkbox" checked={f.isLong} onChange={(e) => toggleField(f.id, fieldset, 'isLong', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
        </label>
      </td>
      <td className="px-4 py-2 text-center border-r border-gray-200 bg-gray-50/50">
        <label className="flex items-center justify-center cursor-pointer">
          <input type="checkbox" checked={f.bulk} onChange={(e) => toggleField(f.id, fieldset, 'bulk', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
        </label>
      </td>
      
      <td className="px-4 py-2 text-center border-r border-gray-200 bg-gray-50/50">
        <ToggleButton 
          active={f.static} 
          label="Text" 
          onClick={() => handleComplexToggle(f, 'static', fieldset)} 
        />
      </td>

      <td className="px-4 py-2 text-center bg-blue-50/20 border-l border-blue-100/50">
        <ToggleButton 
          active={f.controlled} 
          label="Vocab" 
          onClick={() => handleComplexToggle(f, 'controlled', fieldset)} 
        />
      </td>
      <td className="px-4 py-2 text-center bg-blue-50/20">
        <input type="checkbox" checked={f.multi} disabled={!f.controlled} onChange={(e) => toggleField(f.id, fieldset, 'multi', e.target.checked)} className={`w-4 h-4 rounded text-blue-600 ${!f.controlled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`} />
      </td>
      <td className="px-4 py-2 text-center bg-blue-50/20">
        <input type="checkbox" checked={f.additions} disabled={!f.controlled} onChange={(e) => toggleField(f.id, fieldset, 'additions', e.target.checked)} className={`w-4 h-4 rounded text-blue-600 ${!f.controlled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`} />
      </td>
      <td className="px-4 py-2 text-center bg-blue-50/20 border-r border-gray-200">
        <input type="checkbox" checked={f.dropdown} disabled={!f.controlled} onChange={(e) => toggleField(f.id, fieldset, 'dropdown', e.target.checked)} className={`w-4 h-4 rounded text-blue-600 ${!f.controlled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`} />
      </td>

      <td className="px-4 py-2 text-center bg-blue-50/20 border-r border-gray-200">
        <ToggleButton 
          active={f.ai} 
          label="Settings" 
          onClick={() => handleComplexToggle(f, 'ai', fieldset)} 
        />
      </td>

      <td className="px-4 py-2 text-center">
        <button className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans text-gray-800 relative">
      <div className="max-w-[1300px] mx-auto">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <Link href="/scratchpad" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Back to Scratchpads</Link>
            <h1 className="text-2xl font-bold text-gray-900">Collection Config</h1>
            <p className="text-gray-500 text-sm mt-1">Manage field definitions and metadata rules.</p>
          </div>
          <button className="bg-blue-600 text-white px-5 py-2.5 rounded shadow-sm hover:bg-blue-700 text-sm font-semibold transition-colors">
            Save Configuration
          </button>
        </div>

        {/* --- Descriptive Fields Section --- */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            Descriptive Fields
          </h2>
          <div className="bg-white border text-sm rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-8 text-center font-semibold">↕</th>
                  <th className="px-4 py-3 font-semibold w-48">Field Name</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Long</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Bulk</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Static</th>
                  
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Vocabulary</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Multiple</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Additions</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-blue-100 bg-blue-50/50">Dropdown</th>

                  <th className="px-4 py-3 font-semibold text-center border-r border-blue-100 bg-blue-50/50">AI Config</th>
                  
                  <th className="px-4 py-3 font-semibold text-center">Del</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {descriptiveFields.map((f) => <FieldRow key={f.id} f={f} fieldset="desc" />)}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Field
              </button>
            </div>
          </div>
        </div>

        {/* --- Administrative Fields Section --- */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            Administrative Fields
          </h2>
          <div className="bg-white border text-sm rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-8 text-center font-semibold">↕</th>
                  <th className="px-4 py-3 font-semibold w-48">Field Name</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Long</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Bulk</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-gray-200">Static</th>
                  
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Vocabulary</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Multiple</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50/50">Additions</th>
                  <th className="px-4 py-3 font-semibold text-center border-r border-blue-100 bg-blue-50/50">Dropdown</th>

                  <th className="px-4 py-3 font-semibold text-center border-r border-blue-100 bg-blue-50/50">AI Config</th>
                  
                  <th className="px-4 py-3 font-semibold text-center">Del</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {administrativeFields.map((f) => <FieldRow key={f.id} f={f} fieldset="admin" />)}
                {administrativeFields.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400 border-b border-gray-100 border-dashed">
                      Drag fields here to make them Administrative
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <button className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Field
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom Save Button */}
        <div className="flex justify-end mb-16">
          <button className="bg-blue-600 text-white px-5 py-2.5 rounded shadow-sm hover:bg-blue-700 text-sm font-semibold transition-colors">
            Save Configuration
          </button>
        </div>

        
        {/* --- MODAL DESIGN SHOWCASE --- */}
        <div className="border-t-2 border-dashed border-gray-300 pt-16">
          <div className="mb-8 items-center flex justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Modal Designs Showcase</h2>
              <p className="text-gray-500 text-sm mt-1">Static renderings of the pop-up configuration panels.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16">
            
            {/* 1. Vocabulary Manager Modal */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 pb-1">Manage Vocabulary</h3>
                 <span className="text-gray-400 font-bold cursor-pointer">✕</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Enter terms (one per line) for the <span className="font-semibold text-gray-800">Subject</span> field.</p>
              
              <div className="mb-4 space-y-2">
                 <div className="flex border border-gray-300 rounded text-sm focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
                    <span className="bg-gray-100 text-gray-500 px-3 py-1.5 border-r border-gray-300">URL</span>
                    <input type="text" placeholder="https://api.example.com/vocab.json" className="flex-1 px-2 border-0 focus:ring-0 text-sm outline-none" />
                    <button className="bg-gray-100 text-blue-600 font-medium px-3 py-1.5 border-l border-gray-300 hover:bg-gray-200 text-xs">Fetch</button>
                 </div>
                 <div className="flex items-center space-x-2">
                   <div className="h-[1px] bg-gray-200 flex-1"></div>
                   <span className="text-[10px] text-gray-400 uppercase font-bold">OR</span>
                   <div className="h-[1px] bg-gray-200 flex-1"></div>
                 </div>
                 <div className="border border-dashed border-blue-300 bg-blue-50 rounded text-center p-2 cursor-pointer hover:bg-blue-100">
                    <span className="text-xs text-blue-600 font-medium">Browse to upload file...</span>
                 </div>
              </div>

              <textarea 
                className="w-full border border-gray-300 rounded text-sm p-3 mb-4 h-32 focus:ring-blue-500 focus:outline-none"
                defaultValue={"Term A\nTerm B\nTerm C"}
                placeholder="Paste terms here..."
              />
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-semibold text-gray-500">3 terms</span>
                <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 font-medium">Save Terms</button>
              </div>
            </div>

            {/* 2. Static Text Modal */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 pb-1">Enter Static Text</h3>
                 <span className="text-gray-400 font-bold cursor-pointer">✕</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Define the read-only template text for the <span className="font-semibold text-gray-800">Rights</span> field.</p>
              
              <textarea 
                className="w-full border border-gray-300 rounded text-sm p-3 mb-4 h-24 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. This item is under copyright..."
                defaultValue="© 2026 Collection Archives"
              />
              
              <div className="flex justify-end items-center mt-2">
                <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 font-medium">Save text</button>
              </div>
            </div>

            {/* 3. AI Config Modal (Matches Blue Style exactly) */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 pb-1">
                   AI Settings
                 </h3>
                 <span className="text-gray-400 font-bold cursor-pointer">✕</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Configure generative behavior for <span className="font-semibold text-gray-800">Title Japanese</span> field.</p>
              
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prompt text</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded text-sm p-2 h-16 focus:ring-blue-500 focus:outline-none"
                    defaultValue="Translate {{Title English}} to Japanese."
                  />
                  <span className="text-[10px] text-blue-600 font-medium">Use {'{{field_name}}'} or {'{{image}}'} variables within AI prompts</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Execution Trigger</label>
                  <select className="w-full border border-gray-300 rounded text-sm p-2 focus:ring-blue-500 focus:outline-none bg-white">
                    <option>Manual (Click button on each record)</option>
                    <option>Automatic (Process all records now)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end items-center mt-2">
                <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 font-medium">Save settings</button>
              </div>
            </div>

          </div>
        </div>

        {/* --- EDIT INTERFACE SHOWCASE --- */}
        <div className="border-t-2 border-dashed border-gray-300 pt-16 pb-32">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Edit Interface Showcase</h2>
            <p className="text-gray-500 text-sm mt-1">Mockup of how each configured field type renders on the Specialist/Cataloging form.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Form Header/Tabs */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center shadow-sm z-10 sticky top-0">
                 <span className="font-bold text-gray-800 text-sm">Descriptive</span>
                 <span className="mx-3 text-gray-300">|</span>
                 <span className="text-gray-500 hover:text-gray-700 cursor-pointer text-sm">Administrative</span>
              </div>

              {/* Form Fields Body */}
              <div className="p-6 space-y-6 bg-slate-50">
                
                {/* Short Text Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title English</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input 
                        type="text"
                        defaultValue="Summer Picnic at the Park"
                        className="w-full bg-white border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 text-sm shadow-sm"
                      />
                    </div>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    </div>
                  </div>
                </div>

                {/* Long Text Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      <textarea 
                        defaultValue="A vibrant gathering of community members under the large oak tree on a sunny Sunday afternoon."
                        className="w-full bg-white border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 text-sm min-h-[100px] shadow-sm"
                      />
                    </div>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center pt-2">
                    </div>
                  </div>
                </div>

                {/* Controlled Vocab (Multi) Field with Bulk Mockup */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Subject
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="w-full border border-gray-300 p-2 rounded-md bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 flex flex-wrap gap-2 items-center min-h-[46px]">
                        <span className="bg-gray-100 border border-gray-200 text-gray-800 text-sm px-2.5 py-1 rounded inline-flex items-center">
                          Parks <button className="ml-1.5 text-gray-400 hover:text-gray-600">×</button>
                        </span>
                        <span className="bg-gray-100 border border-gray-200 text-gray-800 text-sm px-2.5 py-1 rounded inline-flex items-center">
                          Gatherings <button className="ml-1.5 text-gray-400 hover:text-gray-600">×</button>
                        </span>
                        <input type="text" placeholder="Add term..." className="flex-1 min-w-[120px] outline-none border-none focus:ring-0 text-sm bg-transparent p-1" />
                      </div>
                    </div>
                    <div className="w-8 flex-shrink-0 relative flex justify-center">
                      <button 
                        onClick={() => setBulkPopupOpen(!bulkPopupOpen)}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${bulkPopupOpen ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'}`}
                        title="Bulk Apply Value"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {/* Expanded Bulk Popover Mock */}
                      {bulkPopupOpen && (
                        <div className="absolute right-10 top-0 z-20 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-48 flex flex-col space-y-2">
                          <span className="text-xs font-semibold text-gray-700">Records to update:</span>
                          <input type="text" placeholder="e.g., 1-20, 25" className="border border-gray-300 rounded text-sm px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          <button className="bg-blue-600 text-white rounded text-xs py-1.5 hover:bg-blue-700 font-medium tracking-wide">Apply to Records</button>
                          {/* Visual caret */}
                          <div className="absolute right-[-6px] top-3 w-3 h-3 bg-white border-t border-r border-gray-200 rotate-45" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropdown Field (Controlled vocab standard) */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <select className="w-full bg-white shadow-sm border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 text-sm appearance-none cursor-pointer">
                        <option>Select option...</option>
                        <option>Event</option>
                        <option>Portrait</option>
                        <option>Landscape</option>
                      </select>
                      {/* Custom caret */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    </div>
                  </div>
                </div>

                {/* AI Generative Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title Japanese</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input 
                        type="text"
                        placeholder="Click button to trigger AI processing..."
                        className="w-full bg-white shadow-sm border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 text-sm"
                      />
                    </div>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      <button className="text-gray-400 hover:text-blue-600 w-8 h-8 flex items-center justify-center rounded hover:bg-blue-100 transition-colors" title="Process AI (Manual Trigger)">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                         </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Static Text Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rights</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="bg-gray-200/50 text-gray-600 p-4 rounded-md text-sm border border-gray-300 shadow-sm">
                        © 2026 Collection Archives. May contain sensitive historical material.
                      </div>
                    </div>
                    <div className="w-8 flex-shrink-0">
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="text-gray-500 text-sm space-y-4 pt-12 max-w-sm">
               <p><strong className="text-gray-800 block">External Right-Aligned Tools</strong> For fields needing an explicit action trigger (e.g. Bulk apply, AI execution), a subtle icon button is placed strictly to the right of the input block. This keeps all text bounds flush.</p>
               <p><strong className="text-gray-800 block">Dropdown Showcase</strong> The dropdown uses a completely native HTML `select` element, styled with a distinct dropdown caret overlay so users explicitly know they must click to pick.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
