'use client'

import React from 'react'

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}
