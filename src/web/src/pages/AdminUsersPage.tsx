import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/useAdmin';

export function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createUser.mutateAsync({ name, email, password });
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">User Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add User</h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <Input label="Name" value={name} onChange={setName} required className="flex-1" />
          <Input label="Email" type="email" value={email} onChange={setEmail} required className="flex-1" />
          <Input label="Password" type="password" value={password} onChange={setPassword} required className="flex-1" />
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? 'Adding...' : 'Add'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-primary-100">
          <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        </div>
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-primary-50 text-left text-gray-600">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'ADMIN' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => setDeleting({ id: u.id, name: u.name })}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete User"
        message={`Are you sure you want to delete ${deleting?.name}? All their data will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteUser.isPending}
        onConfirm={async () => {
          if (deleting) {
            await deleteUser.mutateAsync(deleting.id);
            setDeleting(null);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
