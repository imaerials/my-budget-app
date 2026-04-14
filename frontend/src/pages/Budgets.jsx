import { useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, currentMonthYear } from '../utils/format';
import clsx from 'clsx';

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function BudgetProgressBar({ spent, budget, color }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Gastado: <strong style={{ color: over ? '#ef4444' : color }}>{formatCurrency(spent)}</strong></span>
        <span>Restante: <strong className={over ? 'text-red-500' : 'text-emerald-600'}>{formatCurrency(Math.max(budget - spent, 0))}</strong></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }}
        />
      </div>
      {over && <p className="text-xs text-red-500 mt-0.5">Excedido por {formatCurrency(spent - budget)}</p>}
    </div>
  );
}

export default function Budgets() {
  const { month: curMonth, year: curYear } = currentMonthYear();
  const [filterMonth, setFilterMonth] = useState(curMonth);
  const [filterYear, setFilterYear] = useState(curYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category_id: '', amount: '', month: curMonth, year: curYear });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: budgets, loading, refetch } = useApi(
    () => api.getBudgets({ month: filterMonth, year: filterYear }),
    [filterMonth, filterYear]
  );
  const { data: categories } = useApi(() => api.getCategories({ type: 'expense' }), []);

  const expenseCategories = (categories || []).filter((c) => c.type === 'expense');
  const budgetedIds = new Set((budgets || []).map((b) => b.category_id));
  const availableCategories = expenseCategories.filter((c) => !budgetedIds.has(c.id));

  const totalBudgeted = (budgets || []).reduce((s, b) => s + b.amount, 0);
  const totalSpent = (budgets || []).reduce((s, b) => s + b.spent, 0);

  const openCreate = () => {
    setForm({ category_id: availableCategories[0]?.id || '', amount: '', month: filterMonth, year: filterYear });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.upsertBudget({ ...form, category_id: Number(form.category_id), amount: Number(form.amount) });
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteBudget(id);
    setDeleteConfirm(null);
    refetch();
  };

  const years = Array.from({ length: 5 }, (_, i) => curYear - i);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {MONTHS[filterMonth - 1]} {filterYear} — Presupuestado: <strong>{formatCurrency(totalBudgeted)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="w-36">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="w-24">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Button onClick={openCreate} disabled={availableCategories.length === 0}>
            <Plus size={15} />Agregar
          </Button>
        </div>
      </div>

      {/* Summary card */}
      {(budgets || []).length > 0 && (
        <Card>
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-xs text-gray-400">Total presupuestado</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total gastado</p>
              <p className={clsx('text-xl font-bold', totalSpent > totalBudgeted ? 'text-red-500' : 'text-gray-900')}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Disponible</p>
              <p className={clsx('text-xl font-bold', totalBudgeted - totalSpent < 0 ? 'text-red-500' : 'text-emerald-600')}>
                {formatCurrency(totalBudgeted - totalSpent)}
              </p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Uso global</span>
                <span>{totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{
                    width: `${totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0}%`,
                    backgroundColor: totalSpent > totalBudgeted ? '#ef4444' : '#6366f1',
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? <PageLoader /> : (budgets || []).length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin presupuestos"
          description="Define cuánto quieres gastar en cada categoría este mes."
          action={<Button onClick={openCreate}><Plus size={14} />Agregar presupuesto</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.category_color }} />
                  <span className="text-sm font-semibold text-gray-800">{b.category_name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(b)}>
                  <Trash2 size={13} className="text-red-400" />
                </Button>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(b.amount)}</p>
              <BudgetProgressBar spent={b.spent} budget={b.amount} color={b.category_color} />
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo presupuesto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Categoría"
            required
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input
            label="Monto"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mes" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
            <Select label="Año" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.category_id}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar presupuesto" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar el presupuesto de <strong>{deleteConfirm?.category_name}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
