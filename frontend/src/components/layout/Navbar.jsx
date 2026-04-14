import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, Tag, PieChart, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Presupuestos', icon: Wallet },
  { to: '/accounts', label: 'Cuentas', icon: TrendingUp },
  { to: '/categories', label: 'Categorías', icon: Tag },
  { to: '/reports', label: 'Reportes', icon: PieChart },
];

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-1">
        <div className="flex items-center gap-2 mr-6">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Wallet size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">MyBudget</span>
        </div>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
