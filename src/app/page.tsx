import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative bg-slate-100 min-h-[calc(100vh-64px)] flex-1 w-full overflow-hidden flex flex-col md:flex-row items-center p-8 lg:p-16">
      <div className="z-10 w-full md:w-1/2 lg:w-[45%] xl:w-[40%] flex flex-col items-start text-left relative mb-48 md:mb-0">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
          Welcome to MetaDB
        </h1>
        <div className="space-y-4 max-w-xl z-20 relative">
          <p className="text-base md:text-lg lg:text-xl text-slate-600 leading-relaxed font-light">
            MetaDB is a web-based cataloging tool for the <a href="https://dss.lafayette.edu/collections/east-asia-image-collection/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium pointer-events-auto">East Asia Image Collection</a>, facilitating distributed metadata creation with high-resolution image navigation.
          </p>
          <p className="text-base md:text-lg lg:text-xl text-slate-600 leading-relaxed font-light">
            It integrates Google Docs and Gemini-powered AI to streamline descriptive workflows, providing a specialized environment that enables collaborative description of archival image collections.
          </p>
        </div>
      </div>
      
      <div className="absolute right-0 bottom-0 pointer-events-none z-0 w-[95%] sm:w-[85%] md:w-[70%] lg:w-[60%] max-w-5xl translate-x-[80px] md:translate-x-[100px] xl:translate-x-[140px] translate-y-[50px]">
        <img 
          src="/card-catalog-drawer.png" 
          alt="Vintage Card Catalog Drawer" 
          className="w-full h-auto drop-shadow-2xl opacity-90 transition-all duration-700"
        />
      </div>
    </div>
  );
}
