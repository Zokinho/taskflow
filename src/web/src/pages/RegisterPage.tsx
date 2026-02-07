import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-primary-600 text-center mb-8">TaskFlow</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100">
          <h2 className="text-xl font-semibold text-gray-800">Create account</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
          <Input label="Name" value={name} onChange={setName} required autoFocus />
          <Input label="Email" type="email" value={email} onChange={setEmail} required />
          <Input label="Password" type="password" value={password} onChange={setPassword} required />
          <Input label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
