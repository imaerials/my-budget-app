import { useState } from 'react';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, todayISO } from '../../utils/format';
import SplitGroupDetail from './SplitGroupDetail';

function CreateGroupModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD' });
  const [memberNames, setMemberNames] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const addMemberField = () => setMemberNames((p) => [...p, '']);
  const setMemberName = (i, v) => setMemberNames((p) => p.map((n, idx) => idx === i ? v : n));
  const removeMemberField = (i) => setMemberNames((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const names = memberNames.map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) return alert('Add at least 2 members.');
    setSaving(true);
    try {
      const group = await api.createSplitGroup(form);
      for (const name of names) {
        await api.addSplitMember(group.id, { name });
      }
      onCreated(group.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New group" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Group name" required placeholder="e.g. Barcelona Trip" value={form.name} onChange={set('name')} autoFocus />
        <Input label="Description" placeholder="Optional" value={form.description} onChange={set('description')} />
        <Select label="Currency" value={form.currency} onChange={set('currency')}>
          <option value="USD">USD — Dollar</option>
          <option value="ARS">ARS — Peso</option>
          <option value="EUR">EUR — Euro</option>
        </Select>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Members</label>
          <div className="space-y-2">
            {memberNames.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Member ${i + 1}`}
                  value={name}
                  onChange={(e) => setMemberName(i, e.target.value)}
                />
                {memberNames.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeMemberField(i)}>
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2 text-indigo-600" onClick={addMemberField}>
            <Plus size={13} /> Add member
          </Button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create group'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Splitter({ onBack }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const { data: groups, loading, refetch } = useApi(() => api.getSplitGroups(), []);

  if (selectedGroupId) {
    return (
      <SplitGroupDetail
        groupId={selectedGroupId}
        onBack={() => { setSelectedGroupId(null); refetch(); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={16} /></Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expense Splitter</h1>
          <p className="text-sm text-gray-500">Split bills with friends and track who owes what</p>
        </div>
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}><Plus size={15} />New group</Button>
      </div>

      {loading ? <PageLoader /> : (groups || []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create a group to start splitting expenses with friends."
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} />New group</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className="text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Users size={16} className="text-indigo-600" />
                </div>
                <span className="text-xs text-gray-400">{g.currency}</span>
              </div>
              <p className="font-semibold text-gray-900">{g.name}</p>
              {g.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>}
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>{g.member_count} members</span>
                <span>{g.expense_count} expenses</span>
                <span className="font-medium text-gray-700">{formatCurrency(g.total_amount, g.currency)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setSelectedGroupId(id)}
      />
    </div>
  );
}
