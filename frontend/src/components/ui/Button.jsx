import clsx from 'clsx';

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'hover:bg-slate-700 text-slate-400 hover:text-slate-200',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
  icon: 'p-2',
};

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
