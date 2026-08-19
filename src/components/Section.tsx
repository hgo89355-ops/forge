export function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-mono text-muted">{number}</span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 ml-8 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4 ml-8">{children}</div>
    </section>
  );
}

export function NotBuiltYet({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-line px-4 py-6 text-sm text-muted">
      {children}
    </p>
  );
}
