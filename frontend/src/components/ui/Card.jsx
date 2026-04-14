import clsx from 'clsx';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={clsx('bg-slate-800 border border-slate-700 rounded-xl p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('text-sm font-medium text-slate-400 mb-1', className)}>
      {children}
    </h3>
  );
}
