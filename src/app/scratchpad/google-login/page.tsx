import React from 'react';
import Link from 'next/link';

export default function GoogleLoginPrototypes() {
  const GoogleSVG = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-8 lg:p-12 font-sans pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
           <Link href="/scratchpad" className="text-blue-600 hover:underline text-sm font-semibold flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Scratchpad
           </Link>
           <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Google OAuth Button Prototypes</h1>
           <p className="text-gray-500 mt-2">Evaluate rendering models for the authentication vectors. They are designed to be subtle but unmistakably attached to the Google ecosystem natively.</p>
        </div>

        <div className="space-y-12">

          {/* CONCEPT 1: Large Center Homepage Button */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase tracking-wider text-sm">Option 1: Massive Centered Landing Action</h2>
             <p className="text-gray-500 text-sm mb-8">Designed to replace the generic "View Dashboard" button on the front page, explicitly locking the user wall with Google.</p>
             
             <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-gray-300 rounded-lg">
                <button className="flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-8 py-3.5 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow transition-all font-semibold w-full max-w-sm">
                   <GoogleSVG />
                   <span>Sign in with Google</span>
                </button>
                <div className="mt-4 text-xs text-gray-400">Institutional workspace requires active Google Workspace authentication.</div>
             </div>
          </section>

          {/* CONCEPT 2: Compact Solid Blue Accent */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase tracking-wider text-sm">Option 2: Vibrant Blue Homepage Action</h2>
             <p className="text-gray-500 text-sm mb-8">Uses the MetaDB primary branding color but retains the Google "G" badge.</p>
             
             <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-gray-300 rounded-lg">
                <button className="flex items-center justify-center bg-blue-600 border border-blue-700 text-white px-8 py-3.5 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all font-semibold w-full max-w-sm">
                   <div className="bg-white w-7 h-7 rounded flex items-center justify-center mr-3">
                     <svg className="w-4 h-4 ml-[11px]" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                     </svg>
                   </div>
                   <span>Continue with Google</span>
                </button>
             </div>
          </section>

          {/* CONCEPT 3: Subtle Navbar Injection */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase tracking-wider text-sm">Option 3: Navbar Inline Login (Logged Out State)</h2>
             <p className="text-gray-500 text-sm mb-8">Designed to sit perfectly inside the top dark blue navigation bar. Minimalist dark-mode styled button.</p>
             
             <div className="p-4 bg-slate-900 rounded-lg flex items-center justify-between border border-slate-800 shadow-xl">
                <div className="text-white font-extrabold text-xl tracking-tight">MetaDB</div>
                <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-1.5 rounded transition-colors text-sm font-semibold">
                   <GoogleSVG />
                   <span>Sign in</span>
                </button>
             </div>
          </section>

          {/* CONCEPT 4: Navbar Inline Logout */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase tracking-wider text-sm">Option 4: Navbar Logout Profile Chip (Logged In State)</h2>
             <p className="text-gray-500 text-sm mb-8">When the user is physically logged in, the UI condenses to a simple account dropdown or clean logout string.</p>
             
             <div className="p-4 bg-slate-900 rounded-lg flex items-center justify-between border border-slate-800 shadow-xl">
                <div className="text-white font-extrabold text-xl tracking-tight">MetaDB</div>
                <div className="flex items-center space-x-4">
                   <div className="text-slate-400 text-xs hidden sm:block">Logged in as <span className="text-slate-200 font-semibold">admin@google.com</span></div>
                   <button className="text-slate-300 hover:text-white transition-colors text-sm font-semibold border border-transparent hover:border-slate-700 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700">
                      Sign Out
                   </button>
                </div>
             </div>
          </section>

          {/* CONCEPT 5: Dashboard Icon Integrations */}
          <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
             <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-6 uppercase tracking-wider text-sm">Option 5: Dashboard Icon Link</h2>
             <p className="text-gray-500 text-sm mb-8">Variations for replacing the "Dashboard" text string inherently within the authenticated navbar.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Style A */}
                <div className="p-6 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-xl">
                   <div className="flex items-center space-x-4">
                      <button className="text-slate-300 hover:text-white transition-colors p-2 rounded hover:bg-slate-800" title="Dashboard - Grid">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      </button>
                      <div className="h-5 border-l border-slate-700"></div>
                      <button className="text-slate-300 hover:text-red-400 text-sm font-semibold px-3 py-1.5 rounded hover:bg-slate-800">Sign Out</button>
                   </div>
                </div>

                {/* Style B */}
                <div className="p-6 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-xl">
                   <div className="flex items-center space-x-4">
                      <button className="text-slate-300 hover:text-white transition-colors p-2 rounded hover:bg-slate-800" title="Dashboard - Layout">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                          <path d="M3 9h18"></path>
                          <path d="M9 21V9"></path>
                        </svg>
                      </button>
                      <div className="h-5 border-l border-slate-700"></div>
                      <button className="text-slate-300 hover:text-red-400 text-sm font-semibold px-3 py-1.5 rounded hover:bg-slate-800">Sign Out</button>
                   </div>
                </div>

                {/* Style C */}
                <div className="p-6 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shadow-xl">
                   <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors p-2 rounded hover:bg-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                           <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <span className="text-sm font-semibold pr-1">Home</span>
                      </button>
                      <div className="h-5 border-l border-slate-700"></div>
                      <button className="text-slate-300 hover:text-red-400 text-sm font-semibold px-3 py-1.5 rounded hover:bg-slate-800">Sign Out</button>
                   </div>
                </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
