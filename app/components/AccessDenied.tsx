'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AccessDenied({
  title = 'Access denied',
  description = 'You do not have permission to view this page.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
