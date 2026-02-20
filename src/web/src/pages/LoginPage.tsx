import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-primary-600 text-center mb-8">TaskFlow</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100">
          <h2 className="text-xl font-semibold text-gray-800">Sign in</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
          <Input label="Email" type="email" value={email} onChange={setEmail} required autoFocus />
          <Input label="Password" type="password" value={password} onChange={setPassword} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
