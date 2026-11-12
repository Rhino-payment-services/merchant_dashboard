import { Loader2 } from "lucide-react";

/** Keep this Suspense fallback light (no AuthShell): a heavier one makes the server stream the page separately and leaves a hidden duplicate in the DOM. */
export default function AuthLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-dvh items-center justify-center bg-white">
      <Loader2 className="size-6 animate-spin text-slate-400" />
    </div>
  );
}
