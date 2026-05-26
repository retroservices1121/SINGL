import SinglNav from './SinglNav';

interface Props {
  /** Page title shown above content (mirrors AGG's section heading). */
  title?: string;
  /** Optional one-line subtitle. */
  subtitle?: string;
  /** Right-aligned slot (filters, search, etc.). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Standard chrome for every SINGL surface (countries / groups / schedule
// / bracket / h2h / squads / pickem / news / videos). Wraps content with
// SinglNav + the same max-w-screen-2xl container the AGG-themed home and
// event pages use so the layout doesn't jump between routes.
export default function PageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="min-h-screen bg-[var(--agg-color-secondary)]">
      <SinglNav />
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-8">
        {(title || actions) && (
          <header className="mb-6 flex items-end justify-between gap-4">
            <div>
              {title && (
                <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--on-surface)]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--secondary)] font-bold uppercase tracking-widest mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
