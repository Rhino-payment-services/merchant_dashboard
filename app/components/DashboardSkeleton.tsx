'use client'

import React from 'react'

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 space-y-2.5">
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-28 bg-gray-50 rounded" />
            <div className="h-6 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 bg-gray-50 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
