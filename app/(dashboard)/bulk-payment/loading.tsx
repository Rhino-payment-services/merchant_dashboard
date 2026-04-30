import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function BulkPaymentLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading bulk payment...</p>
        </CardContent>
      </Card>
    </div>
  );
}
