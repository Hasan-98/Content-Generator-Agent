import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { login as apiLogin } from '../../api/auth';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      login(token, user);
      toast.success(`Welcome back, ${user.name}!`);
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-aB font-mono">Content Creator Studio</h1>
          <p className="text-t2 text-sm mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg1 border border-bd rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-t2 text-xs mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-t1 text-sm placeholder-tM focus:outline-none focus:border-aB transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-t2 text-xs mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-t1 text-sm placeholder-tM focus:outline-none focus:border-aB transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aB hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-bg0 font-medium py-2 rounded text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
