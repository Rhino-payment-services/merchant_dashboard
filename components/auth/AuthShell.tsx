import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthCarousel from "./AuthCarousel";
import { authSlides } from "./authSlides";

type AuthShellProps = {
  children: ReactNode;
  width?: "default" | "wide";
};

export default function AuthShell({ children, width = "default" }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh bg-white lg:p-4">
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:px-12 lg:py-4 xl:px-20">
        <header>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
          >
            <Image src="/images/logo.jpg" alt="" width={36} height={36} className="size-9 rounded-full" priority />
            <span className="text-lg font-semibold tracking-tight text-primary">RukaPay</span>
            <span className="h-4 w-px bg-slate-200" aria-hidden />
            <span className="text-sm font-medium text-slate-500">Merchant</span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className={width === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[420px]"}>{children}</div>
        </div>

        <footer className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} RukaPay. All rights reserved.
        </footer>
      </main>

      <aside className="hidden lg:block lg:w-1/2 lg:shrink-0">
        <AuthCarousel slides={authSlides} className="sticky top-4 h-[calc(100dvh-2rem)]" />
      </aside>
    </div>
  );
}
