// FIX: Provide implementation for the Login component.
import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let response;
    if (isSignUp) {
      response = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: email.split('@')[0] } },
      });
    } else {
      response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }

    const { error: authError } = response;

    if (authError) {
      setError(authError.message);
    } else {
      if (isSignUp) {
        alert('Sign up successful! Please check your email for a confirmation link.');
        setEmail('');
        setPassword('');
        setIsSignUp(false); // Switch back to login view
      } else {
        onLogin();
      }
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="bg-red-900/50 text-red-400 p-3 rounded-md mb-4 text-sm">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>
        </form>
        <p className="text-center text-gray-400 text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-bold text-indigo-400 hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;