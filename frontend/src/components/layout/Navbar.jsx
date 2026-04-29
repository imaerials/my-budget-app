import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, Tag, PieChart, TrendingUp, LogOut, User, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

const links = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Presupuestos', icon: Wallet },
  { to: '/accounts', label: 'Cuentas', icon: TrendingUp },
  { to: '/categories', label: 'Categorías', icon: Tag },
  { to: '/reports', label: 'Reportes', icon: PieChart },
  { to: '/tools', label: 'Herramientas', icon: Wrench },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-1">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Wallet size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">MyBudget</span>
        </div>

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
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

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* User section */}
        {user && (
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <Link to="/profile" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 px-2 hover:text-indigo-600 transition-colors">
              <User size={14} className="text-gray-400" />
              <span className="max-w-[120px] truncate">{user.name || user.email}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
              <LogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
