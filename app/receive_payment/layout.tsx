export default function ReceivePaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-main-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-main-100/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-main-100/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-slate-100/60 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
