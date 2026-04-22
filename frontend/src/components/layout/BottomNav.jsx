import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, Tag, PieChart, TrendingUp, Wrench } from 'lucide-react';
import clsx from 'clsx';

const links = [
  { to: '/',             label: 'Inicio',    icon: LayoutDashboard, exact: true },
  { to: '/transactions', label: 'Gastos',    icon: ArrowLeftRight },
  { to: '/budgets',      label: 'Presup.',   icon: Wallet },
  { to: '/accounts',     label: 'Cuentas',   icon: TrendingUp },
  { to: '/categories',   label: 'Categ.',    icon: Tag },
  { to: '/reports',      label: 'Reportes',  icon: PieChart },
  { to: '/tools',        label: 'Tools',     icon: Wrench },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex">
        {links.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-indigo-600' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
