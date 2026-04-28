'use client';
import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 1) {
      const res = await fetch(`/api/search?q=${text}`);
      const data = await res.json();
      setResults(data);
    } else {
      setResults([]);
    }
  };

  return (
    <main className="max-w-2xl mx-auto mt-20 p-4">
      <h1 className="text-2xl font-bold mb-4">Village Directory Search</h1>
      <input
        type="text"
        className="w-full p-4 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Type a village name (e.g., Gorakhpur)..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className="mt-4 bg-white shadow-lg rounded-xl overflow-hidden">
        {results.map((v: any) => (
          <div key={v.id} className="p-4 border-b hover:bg-gray-50 cursor-pointer">
            <p className="font-semibold text-blue-600">{v.name}</p>
            <p className="text-sm text-gray-500">
              {v.subDistrict.name}, {v.subDistrict.district.name}, {v.subDistrict.district.state.name}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}