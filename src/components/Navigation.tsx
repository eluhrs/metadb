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
        <Link href={session ? "/dashboard" : "/"} className="text-xl font-extrabold tracking-tight flex items-center space-x-2">
          <span className="text-white">MetaDB</span>
        </Link>
        <div className="flex items-center">
          {session ? (
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors text-sm font-semibold border border-transparent hover:border-slate-700 px-3 py-1.5 rounded hover:bg-slate-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M9 21V9"></path>
                </svg>
                <span>Dashboard</span>
              </Link>
              
              <div className="h-5 border-l border-slate-700"></div>
              
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center space-x-1.5 text-slate-300 hover:text-red-400 transition-colors text-sm font-semibold border border-transparent hover:border-slate-700 px-3 py-1.5 rounded hover:bg-slate-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                  <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn("google", { callbackUrl: '/dashboard' })}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-1.5 rounded transition-colors text-sm font-semibold shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
