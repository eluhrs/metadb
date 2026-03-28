import Link from 'next/link';

export default function ScratchpadIndex() {
  return (
    <div className="p-12 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">UI Scratchpads</h1>
      <p className="mb-8 text-gray-600 text-lg">
        This area holds CSS-only iterations and component prototypes. We use this to keep the production code clean while experimenting with new designs.
      </p>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          <li>
            <Link 
              href="/scratchpad/config-options" 
              className="block p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-1">Field Configuration Options Prototype</h2>
                  <p className="text-gray-500 text-sm">Design iteration for the field property settings, including Controlled Vocab dependencies.</p>
                </div>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </li>
          <li>
            <Link 
              href="/scratchpad/display-options" 
              className="block p-6 hover:bg-gray-50 transition-colors border-t border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-600 mb-1">Cataloging Layout Display Resizer</h2>
                  <p className="text-gray-500 text-sm">Interactive prototypes for testing draggable split panes and full-screen OpenSeadragon lightboxes.</p>
                </div>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </li>
          <li>
            <Link 
              href="/scratchpad/admin-settings" 
              className="block p-6 hover:bg-gray-50 transition-colors border-t border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-teal-600 mb-1">Unified Settings Drawer</h2>
                  <p className="text-gray-500 text-sm">Interactive CSS-only Slide-out prototype for managing Access Controls and initializing Collections.</p>
                </div>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
