import { useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, Wallet, CreditCard, PiggyBank, Landmark, BarChart2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency } from '../utils/format';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Cuenta corriente', icon: Wallet },
  { value: 'savings', label: 'Caja de ahorro', icon: PiggyBank },
  { value: 'cash', label: 'Efectivo', icon: TrendingUp },
  { value: 'credit', label: 'Tarjeta de crédito', icon: CreditCard },
  { value: 'investment', label: 'Inversiones', icon: Landmark },
];

const COLORS = ['#6366f1','#22c55e','#f97316','#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f59e0b'];

const emptyForm = { name: '', type: 'checking', balance: '0', currency: 'USD', color: '#6366f1' };

function AccountForm({ form, setForm, onSubmit, onClose, saving }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre" required placeholder="Ej: Banco Galicia" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
        {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>
      <Input label="Saldo inicial" type="number" step="0.01" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
      <Select label="Moneda" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
        <option value="USD">USD — Dólar</option>
        <option value="ARS">ARS — Peso argentino</option>
        <option value="EUR">EUR — Euro</option>
      </Select>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: accounts, loading, refetch } = useApi(() => api.getAccounts(), []);

  const totalBalance = (accounts || []).reduce((s, a) => s + (a.current_balance ?? a.balance), 0);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type, balance: acc.balance, currency: acc.currency, color: acc.color });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, balance: Number(form.balance) };
      if (editing) await api.updateAccount(editing.id, payload);
      else await api.createAccount(payload);
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteAccount(id);
    setDeleteConfirm(null);
    refetch();
  };

  const getIcon = (type) => {
    const found = ACCOUNT_TYPES.find((t) => t.value === type);
    return found ? found.icon : Wallet;
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cuentas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Balance total: <strong className="text-gray-800">{formatCurrency(totalBalance)}</strong></p>
        </div>
        <Button onClick={openCreate}><Plus size={15} />Nueva cuenta</Button>
      </div>

      {accounts?.length === 0 ? (
        <EmptyState icon={Wallet} title="Sin cuentas" description="Crea tu primera cuenta para empezar." action={<Button onClick={openCreate}><Plus size={14} />Agregar</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(accounts || []).map((acc) => {
            const Icon = getIcon(acc.type);
            const balance = acc.current_balance ?? acc.balance;
            return (
              <Card key={acc.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: acc.color }} />
                <div className="pl-2">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: acc.color + '20' }}>
                        <Icon size={16} style={{ color: acc.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{acc.name}</p>
                        <p className="text-xs text-gray-400">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(acc)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(acc)}><Trash2 size={13} className="text-red-400" /></Button>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                    {formatCurrency(balance, acc.currency)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{acc.currency}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
        <AccountForm form={form} setForm={setForm} onSubmit={handleSubmit} onClose={() => setModalOpen(false)} saving={saving} />
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar cuenta" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar <strong>{deleteConfirm?.name}</strong>? Se eliminarán todas sus transacciones. Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
