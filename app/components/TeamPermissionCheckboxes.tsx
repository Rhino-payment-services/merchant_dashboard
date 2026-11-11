'use client';

import React from 'react';
import {
  DATA_BUNDLE_PERMISSION_KEYS,
  DATA_BUNDLE_ROLE_SEPARATION_MESSAGE,
  PERMISSION_LABELS,
  violatesDataBundleRoleSeparation,
  type UserPermissions,
} from '@/lib/utils/permissions';

export type PermissionFormState = Required<UserPermissions>;

const ALL_KEYS = Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[];
const DATA_BUNDLE_KEYS = new Set<keyof UserPermissions>(DATA_BUNDLE_PERMISSION_KEYS);

export type MerchantFeatureCeiling = {
  featureLiquidation?: boolean;
  featureBulkPayments?: boolean;
  featurePayroll?: boolean;
  featurePayrollApprovals?: boolean;
  featureDataBundleDistribution?: boolean;
  liquidationOnlyMode?: boolean;
  /** Viewer may grant data-bundle roles (owner or Data Bundles System Administrator). */
  canManageDataBundleUsers?: boolean;
};

export function isPermissionAvailable(
  key: keyof UserPermissions,
  features?: MerchantFeatureCeiling | null,
): boolean {
  const canLiquidateProduct = !!(
    features?.featureLiquidation ||
    features?.featureBulkPayments ||
    features?.liquidationOnlyMode
  );
  if (key === 'canLiquidate') return canLiquidateProduct;
  if (key === 'canManagePayroll') return !!features?.featurePayroll;
  if (key === 'canApprovePayments') return !!features?.featurePayrollApprovals;
  if (DATA_BUNDLE_KEYS.has(key)) {
    return !!features?.featureDataBundleDistribution && !!features?.canManageDataBundleUsers;
  }
  return true;
}

export function TeamPermissionCheckboxes({
  value,
  onChange,
  features,
  disabled,
}: {
  value: PermissionFormState;
  onChange: (next: PermissionFormState) => void;
  features?: MerchantFeatureCeiling | null;
  disabled?: boolean;
}) {
  const separationError = violatesDataBundleRoleSeparation(value);
  return (
    <div className="space-y-2 rounded-md border p-3 bg-gray-50">
      <p className="text-sm font-medium text-gray-700">Permissions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_KEYS.map((key) => {
          const available = isPermissionAvailable(key, features);
          if (!available) return null;
          return (
            <label
              key={key}
              className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!value[key]}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...value, [key]: e.target.checked })
                }
              />
              <span>{PERMISSION_LABELS[key]}</span>
            </label>
          );
        })}
      </div>
      {separationError && (
        <p className="text-xs text-red-600">{DATA_BUNDLE_ROLE_SEPARATION_MESSAGE}</p>
      )}
    </div>
  );
}
