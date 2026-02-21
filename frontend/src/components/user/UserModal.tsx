import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { User } from '../../types';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
}

export default function UserModal({ onClose }: Props) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EDITOR' });

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      toast.error('All fields are required');
      return;
    }
    try {
      const user = await createUser(form);
      setUsers((prev) => [...prev, user]);
      setForm({ name: '', email: '', password: '', role: 'EDITOR' });
      setShowAdd(false);
      toast.success('User created');
    } catch {
      toast.error('Failed to create user');
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const updated = await updateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch {
      toast.error('Failed to update user');
    }
  }

  async function handleChangeRole(user: User, role: string) {
    try {
      const updated = await updateUser(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch {
      toast.error('Failed to update role');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg1 border border-bd rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bd">
          <h2 className="text-t1 font-medium text-sm">Manage Users</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="px-3 py-1 bg-aB hover:bg-blue-400 text-bg0 text-xs rounded transition-colors"
            >
              + Add User
            </button>
            <button
              onClick={onClose}
              className="text-t2 hover:text-t1 text-lg leading-none transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Add user form */}
        {showAdd && (
          <div className="px-4 py-3 border-b border-bd bg-bg2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB"
              />
              <input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB"
              />
              <input
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB"
              />
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="bg-bg0 border border-bd rounded px-2 py-1.5 text-t1 text-xs focus:outline-none focus:border-aB"
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1 bg-aG/20 hover:bg-aG/30 text-aG text-xs rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1 text-t2 hover:text-t1 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-t2 text-sm">Loading…</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bd">
                  <th className="text-left px-4 py-2 text-tM font-medium">Name</th>
                  <th className="text-left px-4 py-2 text-tM font-medium">Email</th>
                  <th className="text-left px-4 py-2 text-tM font-medium">Role</th>
                  <th className="text-left px-4 py-2 text-tM font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-bd/50 hover:bg-bg2 transition-colors">
                    <td className="px-4 py-2.5 text-t1">{u.name}</td>
                    <td className="px-4 py-2.5 text-t2 font-mono">{u.email}</td>
                    <td className="px-4 py-2.5">
                      {u.id === currentUser?.id ? (
                        <span className="text-t2">{u.role}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="bg-bg0 border border-bd rounded px-1 py-0.5 text-t2 text-xs focus:outline-none"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.id === currentUser?.id ? (
                        <span className="text-aG text-xs">You</span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${
                            u.active
                              ? 'text-aG bg-aG/10 hover:bg-aG/20'
                              : 'text-aR bg-aR/10 hover:bg-aR/20'
                          }`}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-t2 hover:text-aR transition-colors"
                          title="Delete user"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
