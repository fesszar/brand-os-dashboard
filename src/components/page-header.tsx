type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
