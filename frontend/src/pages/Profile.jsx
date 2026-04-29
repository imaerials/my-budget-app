import { useState } from 'react';
import { User, Mail, Calendar, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function Avatar({ name, size = 'lg' }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre no puede estar vacío'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProfile({ name });
      updateUser(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setError('');
    setEditing(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Perfil</h1>

      <Card>
        <div className="flex items-center gap-5">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">{user.name || '—'}</p>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Información personal</h2>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Editar
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                <Check size={14} /> {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X size={14} /> Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            <InfoRow icon={User} label="Nombre" value={user.name || '—'} />
            <InfoRow icon={Mail} label="Correo electrónico" value={user.email} />
            <InfoRow icon={Calendar} label="Miembro desde" value={formatDate(user.created_at)} />
          </dl>
        )}
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
