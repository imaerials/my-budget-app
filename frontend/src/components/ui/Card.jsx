import clsx from 'clsx';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={clsx('bg-white shadow-md border border-gray-200 rounded-lg p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={clsx('text-lg font-semibold text-gray-800 mb-2', className)}>
      {children}
    </h3>
  );
}
