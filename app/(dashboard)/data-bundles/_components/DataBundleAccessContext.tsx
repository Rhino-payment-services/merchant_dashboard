'use client';

import React, { createContext, useContext } from 'react';
import type { DataBundleAccess } from '@/lib/api/data-bundles.api';

const Ctx = createContext<DataBundleAccess | null>(null);

export function DataBundleAccessProvider({
  value,
  children,
}: {
  value: DataBundleAccess;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Server-confirmed data bundle permissions for the current merchant. */
export function useDataBundleAccessContext(): DataBundleAccess {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error('useDataBundleAccessContext must be used inside the data bundles layout');
  }
  return value;
}
