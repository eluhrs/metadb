"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname.includes('/popup')) return null;

  return (
    <nav className="bg-gray-900 text-white shadow-md relative z-50">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        <Link href="/" className="text-xl font-extrabold tracking-tight flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <span className="text-white">MetaDB</span>
        </Link>
        <div className="flex items-center">
          {session ? (
            <div className="flex items-center space-x-5">
              <Link 
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-gray-800"
                title="Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </Link>
              
              <div className="h-6 border-l border-gray-700"></div>
              
              <button 
                onClick={() => signOut()}
                className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-gray-800/50"
                title="Sign Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded shadow-sm text-sm font-medium transition-colors text-white"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
