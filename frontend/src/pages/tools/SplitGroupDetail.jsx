import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency, formatDate, todayISO } from '../../utils/format';
import clsx from 'clsx';

// ── Add Expense Modal ──────────────────────────────────────────────────────────
function AddExpenseModal({ open, onClose, members, currency, onSaved }) {
  const [form, setForm] = useState({ description: '', amount: '', paid_by: '', date: todayISO(), split_type: 'equal' });
  const [customShares, setCustomShares] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const totalCustom = Object.values(customShares).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount), paid_by: Number(form.paid_by) };
      if (form.split_type === 'custom') {
        const shares = members.map((m) => ({ member_id: m.id, amount: Number(customShares[m.id] || 0) }));
        const sum = shares.reduce((s, sh) => s + sh.amount, 0);
        if (Math.abs(sum - Number(form.amount)) > 0.02) {
          setError(`Los montos suman ${formatCurrency(sum, currency)}, el total es ${formatCurrency(Number(form.amount), currency)}`);
          return;
        }
        body.custom_shares = shares;
      }
      await onSaved(body);
      onClose();
      setForm({ description: '', amount: '', paid_by: members[0]?.id || '', date: todayISO(), split_type: 'equal' });
      setCustomShares({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar gasto" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Descripción" required placeholder="Ej: Cena" value={form.description} onChange={set('description')} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monto" type="number" min="0.01" step="0.01" required placeholder="0.00"
            value={form.amount} onChange={set('amount')} />
          <Input label="Fecha" type="date" required value={form.date} onChange={set('date')} />
        </div>
        <Select label="Pagó" required value={form.paid_by} onChange={set('paid_by')}>
          <option value="">Seleccionar…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label="División" value={form.split_type} onChange={set('split_type')}>
          <option value="equal">Igual entre todos</option>
          <option value="custom">Montos personalizados</option>
        </Select>

        {form.split_type === 'custom' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Monto por persona</label>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-24 shrink-0 truncate">{m.name}</span>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={customShares[m.id] || ''}
                  onChange={(e) => setCustomShares((p) => ({ ...p, [m.id]: e.target.value }))}
                />
              </div>
            ))}
            <p className={clsx('text-xs', Math.abs(totalCustom - Number(form.amount)) < 0.02 ? 'text-emerald-600' : 'text-amber-600')}>
              Asignado: {formatCurrency(totalCustom, currency)}
              {form.amount && ` / ${formatCurrency(Number(form.amount), currency)}`}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Settle Modal ───────────────────────────────────────────────────────────────
function SettleModal({ open, onClose, members, currency, suggestion, onSaved }) {
  const [form, setForm] = useState({
    from_member_id: suggestion?.from?.id || '',
    to_member_id:   suggestion?.to?.id   || '',
    amount:         suggestion?.amount   || '',
    date:           todayISO(),
    note:           '',
  });
  const [saving, setSaving] = useState(false);

  useState(() => {
    if (suggestion) setForm((f) => ({ ...f, from_member_id: suggestion.from.id, to_member_id: suggestion.to.id, amount: suggestion.amount }));
  }, [suggestion]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaved({ ...form, from_member_id: Number(form.from_member_id), to_member_id: Number(form.to_member_id), amount: Number(form.amount) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Quién pagó" required value={form.from_member_id} onChange={set('from_member_id')}>
          <option value="">Seleccionar…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label="Pagó a" required value={form.to_member_id} onChange={set('to_member_id')}>
          <option value="">Seleccionar…</option>
          {members.filter((m) => m.id !== Number(form.from_member_id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monto" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set('amount')} />
          <Input label="Fecha" type="date" required value={form.date} onChange={set('date')} />
        </div>
        <Input label="Nota" placeholder="Opcional" value={form.note} onChange={set('note')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'Expenses',    label: 'Gastos'      },
  { id: 'Balances',    label: 'Balances'    },
  { id: 'Settlements', label: 'Pagos'       },
  { id: 'Members',     label: 'Miembros'    },
];

// ── Main ───────────────────────────────────────────────────────────────────────
export default function SplitGroupDetail({ groupId, onBack }) {
  const [tab, setTab] = useState('Expenses');
  const [addExpenseOpen, setAddExpenseOpen]   = useState(false);
  const [settleOpen, setSettleOpen]           = useState(false);
  const [settleSuggestion, setSettleSuggestion] = useState(null);
  const [newMemberName, setNewMemberName]     = useState('');
  const [deleteConfirm, setDeleteConfirm]     = useState(null);

  const { data: group, loading, refetch } = useApi(() => api.getSplitGroup(groupId), [groupId]);

  const handleAddExpense      = async (body) => { await api.addSplitExpense(groupId, body); refetch(); };
  const handleDeleteExpense   = async (eid)  => { await api.deleteSplitExpense(groupId, eid); setDeleteConfirm(null); refetch(); };
  const handleSettle          = async (body) => { await api.addSettlement(groupId, body); refetch(); };
  const handleDeleteSettlement= async (sid)  => { await api.deleteSettlement(groupId, sid); refetch(); };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    await api.addSplitMember(groupId, { name: newMemberName.trim() });
    setNewMemberName('');
    refetch();
  };

  const handleRemoveMember = async (mid) => {
    await api.removeSplitMember(groupId, mid);
    refetch();
  };

  const openSettle = (suggestion = null) => { setSettleSuggestion(suggestion); setSettleOpen(true); };

  if (loading || !group) return <PageLoader />;

  const currency      = group.currency || 'USD';
  const totalExpenses = (group.expenses || []).reduce((s, e) => s + e.amount, 0);
  const isSettled     = (group.suggestions || []).length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-0.5">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{group.name}</h1>
          {group.description && <p className="text-sm text-gray-500 truncate">{group.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
            <span>{(group.members || []).length} miembros</span>
            <span>{(group.expenses || []).length} gastos</span>
            <span className="font-medium text-gray-700">{formatCurrency(totalExpenses, currency)} total</span>
            {isSettled && (group.expenses || []).length > 0 && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle size={13} />Todo saldado
              </span>
            )}
          </div>

          {/* Action buttons — mobile: below title, full width */}
          <div className="flex gap-2 mt-3 sm:hidden">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => openSettle()}>Registrar pago</Button>
            <Button size="sm" className="flex-1" onClick={() => setAddExpenseOpen(true)}>
              <Plus size={14} />Agregar
            </Button>
          </div>
        </div>

        {/* Action buttons — desktop: top right */}
        <div className="hidden sm:flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => openSettle()}>Registrar pago</Button>
          <Button size="sm" onClick={() => setAddExpenseOpen(true)}><Plus size={14} />Agregar gasto</Button>
        </div>
      </div>

      {/* Tab bar — horizontally scrollable, no visible scrollbar */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0',
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
            {id === 'Balances' && (group.suggestions || []).length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {group.suggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Expenses ── */}
      {tab === 'Expenses' && (
        <div className="space-y-3">
          {(group.expenses || []).length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Aún no hay gastos. ¡Agregá uno!</div>
          ) : group.expenses.map((exp) => (
            <Card key={exp.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-gray-900">{exp.description}</span>
                    <span className="text-xs text-gray-400">{formatDate(exp.date)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pagó <strong>{exp.paid_by_name}</strong>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(exp.shares || []).map((sh) => (
                      <span key={sh.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {sh.member_name}: {formatCurrency(sh.amount, currency)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-bold text-gray-900">{formatCurrency(exp.amount, currency)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'expense', id: exp.id, label: exp.description })}>
                    <Trash2 size={13} className="text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Balances ── */}
      {tab === 'Balances' && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Balances individuales</CardTitle>
            <div className="space-y-0 mt-2">
              {(group.memberBalances || []).map((m) => (
                <div key={m.id} className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      pagó {formatCurrency(m.paid, currency)} · debe {formatCurrency(m.owed, currency)}
                    </p>
                  </div>
                  <span className={clsx(
                    'text-sm font-semibold shrink-0',
                    m.balance >  0.005 ? 'text-emerald-600' :
                    m.balance < -0.005 ? 'text-red-500'     : 'text-gray-400'
                  )}>
                    {m.balance > 0.005  ? `+${formatCurrency(m.balance, currency)}` :
                     m.balance < -0.005 ? formatCurrency(m.balance, currency) : 'saldado'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>
              {isSettled ? 'Todo saldado 🎉' : `Pagos sugeridos (${(group.suggestions || []).length})`}
            </CardTitle>
            {isSettled && (group.expenses || []).length > 0 ? (
              <p className="text-sm text-gray-500 mt-1">Todos están a mano.</p>
            ) : (group.suggestions || []).length === 0 ? (
              <p className="text-sm text-gray-400 mt-1">Sin gastos para saldar.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {group.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                      <span className="font-medium text-gray-800 truncate">{s.from.name}</span>
                      <ArrowRight size={13} className="text-amber-500 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{s.to.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-amber-700">{formatCurrency(s.amount, currency)}</span>
                      <Button size="sm" variant="secondary" onClick={() => openSettle(s)}>Pagar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Settlements ── */}
      {tab === 'Settlements' && (
        <div className="space-y-3">
          {(group.settlements || []).length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Aún no hay pagos registrados.</div>
          ) : group.settlements.map((s) => (
            <Card key={s.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm flex-wrap">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-medium text-gray-800">{s.from_name}</span>
                    <ArrowRight size={13} className="text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800">{s.to_name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(s.date)}{s.note && ` · ${s.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-emerald-600">{formatCurrency(s.amount, currency)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'settlement', id: s.id, label: `pago de ${s.from_name}` })}>
                    <Trash2 size={13} className="text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Members ── */}
      {tab === 'Members' && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Miembros ({(group.members || []).length})</CardTitle>
            <div className="space-y-0 mt-2">
              {(group.members || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-800">{m.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 size={13} className="text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddMember} className="flex gap-2 mt-3">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nombre del nuevo miembro…"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm"><UserPlus size={13} />Agregar</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        members={group.members || []}
        currency={currency}
        onSaved={handleAddExpense}
      />

      <SettleModal
        open={settleOpen}
        onClose={() => { setSettleOpen(false); setSettleSuggestion(null); }}
        members={group.members || []}
        currency={currency}
        suggestion={settleSuggestion}
        onSaved={handleSettle}
      />

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar eliminación" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar <strong>{deleteConfirm?.label}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => {
            if (deleteConfirm.type === 'expense') handleDeleteExpense(deleteConfirm.id);
            else handleDeleteSettlement(deleteConfirm.id);
          }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
