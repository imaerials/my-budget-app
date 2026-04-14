import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

const COLORS = [
  '#6366f1','#22c55e','#f97316','#3b82f6','#ec4899','#8b5cf6',
  '#06b6d4','#f59e0b','#ef4444','#10b981','#64748b','#84cc16',
];

const emptyForm = { name: '', type: 'expense', color: '#6366f1', icon: 'circle' };

function CategoryForm({ form, setForm, onSubmit, onClose, saving }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre" required placeholder="Ej: Alimentación" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
      </Select>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="flex flex-wrap gap-2">
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

function CategoryGroup({ title, categories, onEdit, onDelete }) {
  if (categories.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="flex-1 text-sm font-medium text-gray-800 truncate">{cat.name}</span>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onEdit(cat)}><Pencil size={13} /></Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(cat)}><Trash2 size={13} className="text-red-400" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Categories() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: categories, loading, refetch } = useApi(() => api.getCategories(), []);

  const incomeCategories = (categories || []).filter((c) => c.type === 'income');
  const expenseCategories = (categories || []).filter((c) => c.type === 'expense');

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.updateCategory(editing.id, form);
      else await api.createCategory(form);
      setModalOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteCategory(id);
    setDeleteConfirm(null);
    refetch();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Categorías</h1>
        <Button onClick={openCreate}><Plus size={15} />Nueva categoría</Button>
      </div>

      {(categories || []).length === 0 ? (
        <EmptyState icon={Tag} title="Sin categorías" description="Crea categorías para clasificar tus transacciones." action={<Button onClick={openCreate}><Plus size={14} />Agregar</Button>} />
      ) : (
        <div className="space-y-6">
          <CategoryGroup title="Gastos" categories={expenseCategories} onEdit={openEdit} onDelete={setDeleteConfirm} />
          <CategoryGroup title="Ingresos" categories={incomeCategories} onEdit={openEdit} onDelete={setDeleteConfirm} />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <CategoryForm form={form} setForm={setForm} onSubmit={handleSubmit} onClose={() => setModalOpen(false)} saving={saving} />
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar categoría" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar <strong>{deleteConfirm?.name}</strong>? Las transacciones asociadas quedarán sin categoría.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
