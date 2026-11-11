import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldMessageProps = {
  id: string;
  message?: string;
  className?: string;
};

export function FieldError({ id, message, className }: FieldMessageProps) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className={cn("mt-1.5 flex items-center gap-1.5 text-[13px] text-error", className)}>
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function FieldHint({ id, message, className }: FieldMessageProps) {
  if (!message) return null;

  return (
    <p id={id} className={cn("mt-1.5 text-[13px] text-slate-500", className)}>
      {message}
    </p>
  );
}
