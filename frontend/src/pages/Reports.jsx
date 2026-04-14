import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { MonthlyBarChart } from '../components/charts/MonthlyBarChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { formatCurrency, formatMonth } from '../utils/format';

const MONTHS = [
  'Todos','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const { data: monthly, loading: loadingMonthly } = useApi(
    () => api.getMonthlySummary({ year }),
    [year]
  );

  const { data: expenseBreakdown, loading: loadingExpense } = useApi(
    () => api.getCategoryBreakdown({ type: 'expense', month, year }),
    [month, year]
  );

  const { data: incomeBreakdown, loading: loadingIncome } = useApi(
    () => api.getCategoryBreakdown({ type: 'income', month, year }),
    [month, year]
  );

  const annualTotals = (monthly || []).reduce(
    (acc, m) => { acc.income += m.income; acc.expense += m.expense; return acc; },
    { income: 0, expense: 0 }
  );
  const annualSavings = annualTotals.income - annualTotals.expense;
  const savingsRate = annualTotals.income > 0 ? (annualSavings / annualTotals.income) * 100 : 0;

  const bestMonth = (monthly || []).reduce((best, m) =>
    (m.income - m.expense) > (best.income - best.expense) ? m : best,
    { income: 0, expense: 0, month: 0 }
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        <div className="flex items-center gap-2">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-36">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </Select>
        </div>
      </div>

      {/* Annual summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Ingresos ${year}`, value: formatCurrency(annualTotals.income), color: 'text-emerald-600' },
          { label: `Gastos ${year}`, value: formatCurrency(annualTotals.expense), color: 'text-red-500' },
          { label: 'Ahorro anual', value: formatCurrency(annualSavings), color: annualSavings >= 0 ? 'text-emerald-600' : 'text-red-500' },
          { label: 'Tasa de ahorro', value: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-amber-500' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardTitle>{label}</CardTitle>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardTitle>Ingresos vs Gastos por mes — {year}</CardTitle>
        {loadingMonthly ? <PageLoader /> : <MonthlyBarChart data={monthly} />}
      </Card>

      {/* Best month insight */}
      {bestMonth.month > 0 && (
        <Card className="bg-indigo-50 border-indigo-200">
          <p className="text-sm text-indigo-700">
            <strong>Mejor mes del año:</strong> {formatMonth(bestMonth.month)} —
            Ahorro de <strong>{formatCurrency(bestMonth.income - bestMonth.expense)}</strong>
          </p>
        </Card>
      )}

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Gastos por categoría — {month > 0 ? MONTHS[month] : 'Año completo'}</CardTitle>
          {loadingExpense ? <PageLoader /> : <CategoryPieChart data={expenseBreakdown} />}
          {(expenseBreakdown || []).length > 0 && (
            <div className="mt-4 space-y-2">
              {expenseBreakdown.map((e) => (
                <div key={e.category_id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.category_color || '#6366f1' }} />
                  <span className="flex-1 text-gray-600 truncate">{e.category_name || 'Sin categoría'}</span>
                  <span className="font-medium text-gray-800">{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Ingresos por categoría — {month > 0 ? MONTHS[month] : 'Año completo'}</CardTitle>
          {loadingIncome ? <PageLoader /> : <CategoryPieChart data={incomeBreakdown} />}
          {(incomeBreakdown || []).length > 0 && (
            <div className="mt-4 space-y-2">
              {incomeBreakdown.map((e) => (
                <div key={e.category_id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.category_color || '#22c55e' }} />
                  <span className="flex-1 text-gray-600 truncate">{e.category_name || 'Sin categoría'}</span>
                  <span className="font-medium text-gray-800">{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Monthly detail table */}
      <Card>
        <CardTitle>Detalle mensual — {year}</CardTitle>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-2 text-left">Mes</th>
                <th className="py-2 text-right">Ingresos</th>
                <th className="py-2 text-right">Gastos</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(monthly || []).map((m) => {
                const balance = m.income - m.expense;
                return (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-700">{formatMonth(m.month)}</td>
                    <td className="py-2 text-right text-emerald-600 font-medium">{formatCurrency(m.income)}</td>
                    <td className="py-2 text-right text-red-500 font-medium">{formatCurrency(m.expense)}</td>
                    <td className={`py-2 text-right font-semibold ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
