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
          setError(`Custom shares sum to ${formatCurrency(sum, currency)}, but total is ${formatCurrency(Number(form.amount), currency)}`);
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
    <Modal open={open} onClose={onClose} title="Add expense" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Description" required placeholder="e.g. Dinner" value={form.description} onChange={set('description')} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount" type="number" min="0.01" step="0.01" required placeholder="0.00"
            value={form.amount} onChange={set('amount')} />
          <Input label="Date" type="date" required value={form.date} onChange={set('date')} />
        </div>
        <Select label="Paid by" required value={form.paid_by} onChange={set('paid_by')}>
          <option value="">Select…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label="Split" value={form.split_type} onChange={set('split_type')}>
          <option value="equal">Equally among all members</option>
          <option value="custom">Custom amounts</option>
        </Select>

        {form.split_type === 'custom' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Amount per member</label>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-28 truncate">{m.name}</span>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={customShares[m.id] || ''}
                  onChange={(e) => setCustomShares((p) => ({ ...p, [m.id]: e.target.value }))}
                />
              </div>
            ))}
            <p className={clsx('text-xs', Math.abs(totalCustom - Number(form.amount)) < 0.02 ? 'text-emerald-600' : 'text-amber-600')}>
              Total assigned: {formatCurrency(totalCustom, currency)}
              {form.amount && ` / ${formatCurrency(Number(form.amount), currency)}`}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add expense'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Settle Up Modal ────────────────────────────────────────────────────────────
function SettleModal({ open, onClose, members, currency, suggestion, onSaved }) {
  const [form, setForm] = useState({
    from_member_id: suggestion?.from?.id || '',
    to_member_id: suggestion?.to?.id || '',
    amount: suggestion?.amount || '',
    date: todayISO(),
    note: '',
  });
  const [saving, setSaving] = useState(false);

  // Sync suggestion when it changes
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
    <Modal open={open} onClose={onClose} title="Record payment" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Who paid" required value={form.from_member_id} onChange={set('from_member_id')}>
          <option value="">Select…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label="Paid to" required value={form.to_member_id} onChange={set('to_member_id')}>
          <option value="">Select…</option>
          {members.filter((m) => m.id !== Number(form.from_member_id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set('amount')} />
          <Input label="Date" type="date" required value={form.date} onChange={set('date')} />
        </div>
        <Input label="Note" placeholder="Optional" value={form.note} onChange={set('note')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = ['Expenses', 'Balances', 'Settlements', 'Members'];

// ── Main component ─────────────────────────────────────────────────────────────
export default function SplitGroupDetail({ groupId, onBack }) {
  const [tab, setTab] = useState('Expenses');
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleSuggestion, setSettleSuggestion] = useState(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: group, loading, refetch } = useApi(() => api.getSplitGroup(groupId), [groupId]);

  const handleAddExpense = async (body) => {
    await api.addSplitExpense(groupId, body);
    refetch();
  };

  const handleDeleteExpense = async (eid) => {
    await api.deleteSplitExpense(groupId, eid);
    setDeleteConfirm(null);
    refetch();
  };

  const handleSettle = async (body) => {
    await api.addSettlement(groupId, body);
    refetch();
  };

  const handleDeleteSettlement = async (sid) => {
    await api.deleteSettlement(groupId, sid);
    refetch();
  };

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

  const openSettleFromSuggestion = (s) => {
    setSettleSuggestion(s);
    setSettleOpen(true);
  };

  if (loading || !group) return <PageLoader />;

  const currency = group.currency || 'USD';
  const totalExpenses = (group.expenses || []).reduce((s, e) => s + e.amount, 0);
  const isSettled = (group.suggestions || []).length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span>{(group.members || []).length} members</span>
            <span>{(group.expenses || []).length} expenses</span>
            <span className="font-medium text-gray-700">{formatCurrency(totalExpenses, currency)} total</span>
            {isSettled && (group.expenses || []).length > 0 && (
              <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={13} />All settled</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setSettleSuggestion(null); setSettleOpen(true); }}>
            Record payment
          </Button>
          <Button size="sm" onClick={() => setAddExpenseOpen(true)}><Plus size={14} />Add expense</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t}
            {t === 'Balances' && (group.suggestions || []).length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {group.suggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Expenses tab ── */}
      {tab === 'Expenses' && (
        <div className="space-y-3">
          {(group.expenses || []).length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No expenses yet. Add one!</div>
          ) : (
            group.expenses.map((exp) => (
              <Card key={exp.id} className="!p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{exp.description}</span>
                      <span className="text-xs text-gray-400">{formatDate(exp.date)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Paid by <strong>{exp.paid_by_name}</strong>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(exp.shares || []).map((sh) => (
                        <span key={sh.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                          {sh.member_name}: {formatCurrency(sh.amount, currency)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-base font-bold text-gray-900">{formatCurrency(exp.amount, currency)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'expense', id: exp.id, label: exp.description })}>
                      <Trash2 size={13} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Balances tab ── */}
      {tab === 'Balances' && (
        <div className="space-y-4">
          {/* Member balances */}
          <Card>
            <CardTitle>Individual balances</CardTitle>
            <div className="space-y-2 mt-2">
              {(group.memberBalances || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      paid {formatCurrency(m.paid, currency)} · owes {formatCurrency(m.owed, currency)}
                    </span>
                  </div>
                  <span className={clsx(
                    'text-sm font-semibold',
                    m.balance > 0.005 ? 'text-emerald-600' : m.balance < -0.005 ? 'text-red-500' : 'text-gray-400'
                  )}>
                    {m.balance > 0.005 ? `+${formatCurrency(m.balance, currency)}` :
                     m.balance < -0.005 ? formatCurrency(m.balance, currency) : 'settled up'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Suggested settlements */}
          <Card>
            <CardTitle>
              {isSettled ? 'All settled up! 🎉' : `Suggested payments (${(group.suggestions || []).length})`}
            </CardTitle>
            {isSettled && (group.expenses || []).length > 0 ? (
              <p className="text-sm text-gray-500 mt-1">Everyone is even.</p>
            ) : (group.suggestions || []).length === 0 ? (
              <p className="text-sm text-gray-400 mt-1">No expenses to settle.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {group.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-800">{s.from.name}</span>
                      <ArrowRight size={13} className="text-amber-500" />
                      <span className="font-medium text-gray-800">{s.to.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700">{formatCurrency(s.amount, currency)}</span>
                      <Button size="sm" variant="secondary" onClick={() => openSettleFromSuggestion(s)}>
                        Mark paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Settlements tab ── */}
      {tab === 'Settlements' && (
        <div className="space-y-3">
          {(group.settlements || []).length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No payments recorded yet.</div>
          ) : (
            group.settlements.map((s) => (
              <Card key={s.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-medium text-gray-800">{s.from_name}</span>
                    <ArrowRight size={13} className="text-gray-400" />
                    <span className="font-medium text-gray-800">{s.to_name}</span>
                    {s.note && <span className="text-gray-400">· {s.note}</span>}
                    <span className="text-gray-400">· {formatDate(s.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-emerald-600">{formatCurrency(s.amount, currency)}</span>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'settlement', id: s.id, label: `payment from ${s.from_name}` })}>
                      <Trash2 size={13} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Members tab ── */}
      {tab === 'Members' && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Members ({(group.members || []).length})</CardTitle>
            <div className="space-y-1 mt-2">
              {(group.members || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
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
                placeholder="New member name…"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm"><UserPlus size={13} />Add</Button>
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

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm delete" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteConfirm?.label}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => {
            if (deleteConfirm.type === 'expense') handleDeleteExpense(deleteConfirm.id);
            else handleDeleteSettlement(deleteConfirm.id);
          }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
