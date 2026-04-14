import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full ${widths[size]}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
