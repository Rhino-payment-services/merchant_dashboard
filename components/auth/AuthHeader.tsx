import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AuthHeaderProps = {
  title: string;
  description?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
};

const backClass =
  "-ml-1 mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium text-slate-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15";

export default function AuthHeader({ title, description, backHref, onBack, backLabel = "Back to login" }: AuthHeaderProps) {
  const backContent = (
    <>
      <ArrowLeft className="size-4" aria-hidden />
      {backLabel}
    </>
  );

  return (
    <div>
      {backHref ? (
        <Link href={backHref} className={backClass}>
          {backContent}
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} className={backClass}>
          {backContent}
        </button>
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-[28px] sm:leading-9">{title}</h1>
      {description && <p className="mt-2 text-[15px] leading-6 text-slate-500">{description}</p>}
    </div>
  );
}
