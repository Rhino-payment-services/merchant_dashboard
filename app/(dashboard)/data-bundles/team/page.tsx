'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { AccessDenied } from '@/app/components/AccessDenied';
import type { DataBundleAccess, DataBundleTeamMember } from '@/lib/api/data-bundles.api';
import { useDataBundleTeam, useUpdateDataBundlePermissions } from '@/lib/hooks/useDataBundles';
import {
  DATA_BUNDLE_ROLE_SEPARATION_MESSAGE,
  violatesDataBundleRoleSeparation,
} from '@/lib/utils/permissions';
import { useDataBundleAccessContext } from '../_components/DataBundleAccessContext';
import { EmptyBlock, LoadingBlock } from '../_components/shared';

type Perms = DataBundleAccess['permissions'];

const COLUMNS: Array<{ key: keyof Perms; label: string; help: string }> = [
  { key: 'canUploadDataBundles', label: 'Maker', help: 'Upload and submit batches' },
  { key: 'canApproveDataBundles', label: 'Checker', help: 'Approve or reject batches' },
  { key: 'canViewDataBundleReports', label: 'Finance', help: 'View reports and exports' },
  { key: 'canRetryDataBundles', label: 'Retry', help: 'Retry failed records' },
  { key: 'canManageDataBundleUsers', label: 'System Admin', help: 'Manage these roles only' },
];

function MemberRow({ member }: { member: DataBundleTeamMember }) {
  const [draft, setDraft] = useState<Perms>(member.permissions);
  const update = useUpdateDataBundlePermissions();
  const dirty = COLUMNS.some((c) => draft[c.key] !== member.permissions[c.key]);
  const invalid = violatesDataBundleRoleSeparation(draft);

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{member.name}</div>
        <div className="text-xs text-gray-500">
          {member.email} · {member.role}
          {member.status !== 'ACTIVE' && ` · ${member.status}`}
        </div>
        {invalid && <div className="text-xs text-red-600 mt-1">{DATA_BUNDLE_ROLE_SEPARATION_MESSAGE}</div>}
      </TableCell>
      {COLUMNS.map((c) => (
        <TableCell key={c.key} className="text-center">
          <input
            type="checkbox"
            aria-label={`${c.label} for ${member.name}`}
            checked={!!draft[c.key]}
            disabled={member.isSelf || update.isPending}
            onChange={(e) => setDraft({ ...draft, [c.key]: e.target.checked })}
          />
        </TableCell>
      ))}
      <TableCell className="text-right">
        {member.isSelf ? (
          <span className="text-xs text-gray-500">You</span>
        ) : (
          <Button
            size="sm"
            disabled={!dirty || invalid || update.isPending}
            onClick={() => update.mutate({ memberId: member.memberId, permissions: draft })}
          >
            {update.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function DataBundleRolesPage() {
  const access = useDataBundleAccessContext();
  const { data, isLoading } = useDataBundleTeam(access.can.manageUsers);

  if (!access.can.manageUsers) {
    return <AccessDenied description="You do not have permission to manage airtime and bundle roles." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airtime &amp; bundle roles</CardTitle>
        <CardDescription>
          Assign Maker, Checker and Finance roles to existing team members. A maker can never approve
          their own batch, and a System Administrator cannot upload, approve or retry. Add new people
          from Team Members first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <LoadingBlock />
        ) : data.members.length === 0 ? (
          <EmptyBlock title="No team members yet" description="Invite team members from the Team Members page." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.key} className="text-center" title={c.help}>
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.map((m) => (
                  <MemberRow key={`${m.memberId}-${JSON.stringify(m.permissions)}`} member={m} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
