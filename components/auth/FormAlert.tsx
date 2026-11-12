import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAlertTone = "info" | "warning" | "error" | "success";

type FormAlertProps = {
  tone?: FormAlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
};

const toneStyles: Record<FormAlertTone, { icon: typeof Info; className: string; iconClassName: string }> = {
  info: { icon: Info, className: "border-slate-200 bg-slate-50 text-slate-700", iconClassName: "text-primary" },
  warning: { icon: TriangleAlert, className: "border-amber-200 bg-amber-50 text-amber-800", iconClassName: "text-amber-600" },
  error: { icon: AlertCircle, className: "border-error/20 bg-error/5 text-error", iconClassName: "text-error" },
  success: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800", iconClassName: "text-emerald-600" },
};

export default function FormAlert({ tone = "info", title, children, className }: FormAlertProps) {
  const { icon: Icon, className: toneClassName, iconClassName } = toneStyles[tone];

  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-5", toneClassName, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} aria-hidden />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
