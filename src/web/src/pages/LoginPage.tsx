import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const BASE = '/api';

type Step = 'login' | 'email' | 'code' | 'done';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [step, setStep] = useState<Step>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, Intl.DateTimeFormat().resolvedOptions().timeZone);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || 'Request failed');
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(body.error || 'Request failed');
      }
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  function backToLogin() {
    setStep('login');
    setError('');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-primary-600 text-center mb-8">TaskFlow</h1>

        {step === 'login' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100">
            <h2 className="text-xl font-semibold text-gray-800">Sign in</h2>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
            <Input label="Email" type="email" value={email} onChange={setEmail} required autoFocus />
            <Input label="Password" type="password" value={password} onChange={setPassword} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); }}
              className="w-full text-sm text-primary-600 hover:text-primary-800 mt-2"
            >
              Forgot password?
            </button>
          </form>
        )}

        {step === 'email' && (
          <form onSubmit={handleForgotSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100">
            <h2 className="text-xl font-semibold text-gray-800">Reset password</h2>
            <p className="text-sm text-gray-600">Enter your email and we'll send a reset code to your linked Telegram.</p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
            <Input label="Email" type="email" value={resetEmail} onChange={setResetEmail} required autoFocus />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Code'}
            </Button>
            <button type="button" onClick={backToLogin} className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2">
              Back to login
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleResetSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100">
            <h2 className="text-xl font-semibold text-gray-800">Enter reset code</h2>
            <p className="text-sm text-gray-600">Check your Telegram for the 6-character code.</p>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}
            <Input label="Code" type="text" value={resetCode} onChange={setResetCode} required autoFocus />
            <Input label="New password" type="password" value={newPassword} onChange={setNewPassword} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <button type="button" onClick={backToLogin} className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2">
              Back to login
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4 border border-primary-100 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Password reset</h2>
            <p className="text-sm text-gray-600">Your password has been updated. You can now sign in with your new password.</p>
            <Button onClick={backToLogin} className="w-full">
              Back to login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
