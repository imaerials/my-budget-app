import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ArrowLeftRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { TypeBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate, todayISO } from '../utils/format';

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const emptyForm = { account_id: '', category_id: '', amount: '', type: 'expense', description: '', date: todayISO(), notes: '' };

function TransactionForm({ form, setForm, accounts, categories, onSubmit, onClose, saving }) {
  const cats = (categories || []).filter((c) => c.type === form.type);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, category_id: '' }))}
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </Select>
        <Input
          label="Monto"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          required
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
      </div>
      <Select
        label="Cuenta"
        required
        value={form.account_id}
        onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
      >
        <option value="">Seleccionar cuenta…</option>
        {(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </Select>
      <Select
        label="Categoría"
        value={form.category_id}
        onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
      >
        <option value="">Sin categoría</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Input
        label="Descripción"
        placeholder="Ej: Supermercado"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <Input
        label="Fecha"
        type="date"
        required
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
      />
      <Input
        label="Notas"
        placeholder="Opcional"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

export default function Transactions() {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const txParams = { month: filterMonth, year: filterYear, type: filterType || undefined, limit: 200 };
  const { data: txData, loading, refetch } = useApi(() => api.getTransactions(txParams), [filterMonth, filterYear, filterType]);
  const { data: accounts } = useApi(() => api.getAccounts(), []);
  const { data: categories } = useApi(() => api.getCategories(), []);

  const txList = (txData?.data || []).filter((t) =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, account_id: accounts?.[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setForm({
      account_id: tx.account_id,
      category_id: tx.category_id || '',
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      notes: tx.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        account_id: Number(form.account_id),
        category_id: form.category_id ? Number(form.category_id) : null,
      };
      if (editing) await api.updateTransaction(editing.id, payload);
      else await api.createTransaction(payload);
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteTransaction(id);
    setDeleteConfirm(null);
    refetch();
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const totals = txList.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else if (t.type === 'expense') acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Transacciones</h1>
        <Button onClick={openCreate}><Plus size={15} />Nueva</Button>
      </div>

      {/* Filters */}
      <Card className="!p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="w-32">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
            <Select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="w-22">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-28">
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 text-sm font-semibold ml-auto">
            <span className="text-emerald-600">+{formatCurrency(totals.income)}</span>
            <span className="text-red-500">-{formatCurrency(totals.expense)}</span>
          </div>
        </div>
      </Card>

      {/* List */}
      {loading ? <PageLoader /> : txList.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Sin transacciones"
          description="Agrega tu primera transacción."
          action={<Button onClick={openCreate}><Plus size={14} />Agregar</Button>}
        />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3"
              >
                {/* Color indicator */}
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: tx.type === 'income' ? '#22c55e' : '#ef4444' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {formatDate(tx.date)}
                    {tx.category_name && <> · <span style={{ color: tx.category_color || '#6366f1' }}>{tx.category_name}</span></>}
                    {tx.account_name && <> · {tx.account_name}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tx)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(tx)}><Trash2 size={13} className="text-red-400" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="!p-0 overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Cuenta</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {txList.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{tx.description || '—'}</td>
                      <td className="px-4 py-3">
                        {tx.category_name ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: (tx.category_color || '#6366f1') + '20', color: tx.category_color || '#6366f1' }}
                          >
                            {tx.category_name}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{tx.account_name}</td>
                      <td className="px-4 py-3"><TypeBadge type={tx.type} /></td>
                      <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tx)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(tx)}><Trash2 size={13} className="text-red-400" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
        <TransactionForm
          form={form}
          setForm={setForm}
          accounts={accounts}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
          saving={saving}
        />
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar transacción" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar <strong>{deleteConfirm?.description || 'esta transacción'}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
