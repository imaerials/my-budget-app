import clsx from 'clsx';

export function Badge({ children, color = '#6366f1', className }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ backgroundColor: color + '20', color }}
    >
      {children}
    </span>
  );
}

export function TypeBadge({ type }) {
  return type === 'income' ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      Ingreso
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      Gasto
    </span>
  );
}
