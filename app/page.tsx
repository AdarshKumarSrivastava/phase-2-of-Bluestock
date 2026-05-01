'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 1) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search?q=${trimmedQuery}`);
          const data = await res.json();
          setResults(data);
        } catch (error) {
          console.error("Failed to fetch results", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white flex flex-col items-center pt-16 md:pt-24 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 md:mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-blue-100/50 rounded-2xl mb-4 text-blue-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Village Directory <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Search</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Discover and explore villages across India. Search by name to find accurate location details down to the sub-district level.
          </p>
        </div>

        <div className="relative group z-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className={`h-6 w-6 transition-colors duration-300 ${isLoading ? 'text-blue-500 animate-pulse' : 'text-slate-400 group-focus-within:text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className={`block w-full pl-12 pr-12 py-4 md:py-5 md:text-lg border-0 rounded-2xl shadow-xlsm bg-white/80 backdrop-blur-md text-slate-900 placeholder:text-slate-400 focus:bg-white transition-all outline-none ${isLoading ? 'ring-2 ring-blue-400 shadow-blue-100' : 'ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500'}`}
            placeholder="Type a village name (e.g., Gorakhpur)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
          {query.length > 0 && !isLoading && (
            <button 
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-6 space-y-3 pb-20">
          {/* Prominent Animated Loader */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                </div>
              </div>
              <p className="text-lg font-medium text-blue-600 animate-pulse">Searching villages...</p>
            </div>
          )}

          {query.length > 1 && results.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 animate-in fade-in zoom-in duration-300">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">No villages found</h3>
              <p className="text-slate-500">We couldn't find anything matching "{query}". Try another search term.</p>
            </div>
          )}

          {!isLoading && results.map((v: any, index: number) => (
            <div 
              key={v.id} 
              className="group bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200 hover:shadow-lg hover:ring-blue-300 transition-all duration-300 cursor-pointer flex items-start gap-4 md:gap-5 animate-in slide-in-from-bottom-4 fade-in fill-mode-both"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-shrink-0 mt-1 hidden sm:block">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0 py-1">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  <span className="sm:hidden block h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                  {v.name.replace(/\s*\(\d+\)\s*$/, '')}
                </h3>
                <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap text-[15px] text-slate-600 gap-y-1.5 gap-x-3">
                  <span className="flex items-center">
                    <span className="font-semibold text-slate-800 mr-1.5">Sub-district:</span> {v.subDistrict?.name || 'N/A'}
                  </span>
                  <span className="hidden sm:inline text-slate-300">&bull;</span>
                  <span className="flex items-center">
                    <span className="font-semibold text-slate-800 mr-1.5">District:</span> {v.subDistrict?.district?.name || 'N/A'}
                  </span>
                  <span className="hidden sm:inline text-slate-300">&bull;</span>
                  <span className="flex items-center">
                    <span className="font-semibold text-slate-800 mr-1.5">State:</span> {v.subDistrict?.district?.state?.name || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="hidden md:flex flex-shrink-0 self-center">
                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
