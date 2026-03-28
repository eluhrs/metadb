import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-6">
        Welcome to <span className="text-blue-600">MetaDB</span>
      </h1>
      <p className="max-w-2xl text-xl text-gray-500 mb-8">
        A fast, efficient metadata cataloging tool designed for library institutional repositories. Log in to start working on your assigned collections.
      </p>
      <div className="flex space-x-4 justify-center">
        <Link 
          href="/dashboard"
          className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
