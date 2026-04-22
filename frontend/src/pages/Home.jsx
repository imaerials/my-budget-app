import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { MonthlyBarChart } from '../components/charts/MonthlyBarChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { formatCurrency, formatDate, pctChange } from '../utils/format';

function StatCard({ title, value, sub, icon: Icon, iconBg, trend }) {
  const positive = trend >= 0;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend != null ? (
        <p className={`text-xs flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(1)}% vs mes anterior
        </p>
      ) : (
        <p className="text-xs text-gray-400">{sub}</p>
      )}
    </Card>
  );
}

function CurrencyTabs({ currencies, selected, onChange }) {
  if (currencies.length <= 1) return null;
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {currencies.map((cur) => (
        <button
          key={cur}
          onClick={() => onChange(cur)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            selected === cur
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {cur}
        </button>
      ))}
    </div>
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export default function Home() {
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const { data: stats, loading: loadingStats } = useApi(() => api.getDashboard(), []);

  // Initialize selected currency once stats arrive
  useEffect(() => {
    if (stats?.currencies?.length && !selectedCurrency) {
      setSelectedCurrency(stats.currencies[0]);
    }
  }, [stats, selectedCurrency]);

  const cur = selectedCurrency;

  const { data: monthly } = useApi(
    () => api.getMonthlySummary({ year: CURRENT_YEAR, currency: cur }),
    [cur]
  );
  const { data: categoryData } = useApi(
    () => api.getCategoryBreakdown({ type: 'expense', month: CURRENT_MONTH, year: CURRENT_YEAR, currency: cur }),
    [cur]
  );
  const { data: trend } = useApi(
    () => api.getTrend({ currency: cur }),
    [cur]
  );

  if (loadingStats) return <PageLoader />;

  const currencies  = stats?.currencies  || [];
  const byCurrency  = stats?.byCurrency  || {};
  const curData     = byCurrency[cur]    || { balance: 0, currentMonth: {}, prevMonth: {} };
  const cm          = curData.currentMonth;
  const pm          = curData.prevMonth;

  const recentTx    = stats?.recentTransactions || [];
  const topExpenses = (stats?.topExpenses || []).filter((e) => !cur || e.currency === cur);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <CurrencyTabs currencies={currencies} selected={cur} onChange={setSelectedCurrency} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Balance total ${cur ? `(${cur})` : ''}`}
          value={formatCurrency(curData.balance || 0, cur)}
          sub="Todas las cuentas"
          icon={Wallet}
          iconBg="bg-indigo-500"
        />
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(cm.income || 0, cur)}
          icon={TrendingUp}
          iconBg="bg-emerald-500"
          trend={pctChange(cm.income, pm.income)}
        />
        <StatCard
          title="Gastos del mes"
          value={formatCurrency(cm.expense || 0, cur)}
          icon={TrendingDown}
          iconBg="bg-red-400"
          trend={pctChange(cm.expense, pm.expense)}
        />
        <StatCard
          title="Ahorro del mes"
          value={formatCurrency(cm.savings || 0, cur)}
          icon={PiggyBank}
          iconBg="bg-sky-500"
          sub="Ingresos − Gastos"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle>Ingresos vs Gastos — {CURRENT_YEAR} {cur && <span className="text-gray-400 font-normal text-sm">({cur})</span>}</CardTitle>
          <MonthlyBarChart data={monthly} />
        </Card>
        <Card>
          <CardTitle>Gastos por categoría</CardTitle>
          <CategoryPieChart data={categoryData} />
        </Card>
      </div>

      {/* Trend + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardTitle>Tendencia — últimos 30 días {cur && <span className="text-gray-400 font-normal text-sm">({cur})</span>}</CardTitle>
          <TrendLineChart data={trend} />
        </Card>

        <Card>
          <CardTitle>Últimas transacciones</CardTitle>
          <div className="space-y-2 mt-2">
            {recentTx.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Sin transacciones</p>
            )}
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description || tx.category_name || '—'}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </span>
                  {currencies.length > 1 && (
                    <p className="text-xs text-gray-400">{tx.currency}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top expenses */}
      {topExpenses.length > 0 && (
        <Card>
          <CardTitle>Top gastos del mes {cur && <span className="text-gray-400 font-normal text-sm">({cur})</span>}</CardTitle>
          <div className="mt-3 space-y-3">
            {topExpenses.map((e, i) => {
              const pct = topExpenses[0]?.total ? (e.total / topExpenses[0].total) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 text-xs text-gray-400 text-right shrink-0">{i + 1}</div>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.category_color || '#6366f1' }}
                  />
                  <span className="text-sm text-gray-700 flex-1 truncate">{e.category_name || 'Sin categoría'}</span>
                  <div className="flex-1 max-w-[120px] bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: e.category_color || '#6366f1' }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-800 shrink-0">{formatCurrency(e.total, e.currency)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
