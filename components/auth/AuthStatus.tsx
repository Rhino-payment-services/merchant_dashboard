import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthStatusTone = "success" | "error" | "warning" | "info" | "loading";

type AuthStatusProps = {
  tone: AuthStatusTone;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
};

const toneStyles: Record<AuthStatusTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" },
  error: { icon: AlertCircle, className: "bg-error/10 text-error" },
  warning: { icon: ShieldAlert, className: "bg-amber-50 text-amber-600" },
  info: { icon: Info, className: "bg-primary/5 text-primary" },
  loading: { icon: Loader2, className: "bg-slate-100 text-primary" },
};

export default function AuthStatus({ tone, title, description, children, actions }: AuthStatusProps) {
  const { icon: Icon, className } = toneStyles[tone];

  return (
    <div role={tone === "error" ? "alert" : "status"}>
      <div className={cn("flex size-12 items-center justify-center rounded-full", className)}>
        <Icon className={cn("size-6", tone === "loading" && "animate-spin")} aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-primary sm:text-[28px] sm:leading-9">{title}</h1>
      {description && <div className="mt-2 text-[15px] leading-6 text-slate-500">{description}</div>}
      {children && <div className="mt-6">{children}</div>}
      {actions && <div className="mt-8 space-y-3">{actions}</div>}
    </div>
  );
}
