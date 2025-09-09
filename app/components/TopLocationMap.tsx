import React from 'react';

export default function TopLocationMap() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg">Top Location</div>
        <button className="text-xs border rounded px-2 py-1 bg-gray-50">Filter</button>
      </div>
      {/* Placeholder for map */}
      <div className="h-40 bg-gradient-to-br from-main-100 to-main-50 rounded-lg flex items-center justify-center text-gray-400">
        World Map Placeholder
      </div>
    </div>
  );
}
 