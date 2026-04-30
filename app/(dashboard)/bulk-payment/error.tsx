"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function BulkPaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            The bulk payment page couldn&apos;t load. This can happen when switching businesses or if the session changed. Try again or go back to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/"}
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
