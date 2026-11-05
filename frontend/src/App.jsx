import { useEffect, useState } from 'react';

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Request failed');
  return body;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login'
  );
  const [message, setMessage] = useState('');
  useEffect(() => {
    api('/api/me')
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
      });
      setUser(data.user);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  return (
    <main>
      <nav>
        <div className="brand">
          <span className="shield">S</span> SecureGuard
        </div>
        <span>Research prototype</span>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">WEB APPLICATION SECURITY</p>
          <h1>
            Assess risk.
            <br />
            <em>Prevent vulnerabilities.</em>
          </h1>
          <p className="lede">
            A controlled platform for studying security controls, validating mitigations, and
            producing reproducible evidence.
          </p>
          <div className="features">
            <span>✓ Isolated lab</span>
            <span>✓ Repeatable tests</span>
            <span>✓ Evidence-based reports</span>
          </div>
        </div>
        <div className="card">
          {user ? (
            <div>
              <p className="eyebrow">AUTHENTICATED</p>
              <h2>Welcome</h2>
              <p>{user.email}</p>
              <p>Role: {user.role}</p>
              <button onClick={logout}>Sign out</button>
            </div>
          ) : (
            <>
              <div className="tabs">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Sign in
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => setMode('register')}
                >
                  Register
                </button>
              </div>
              <form onSubmit={submit}>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength="15"
                  />
                </label>
                <small>Use at least 15 characters; long, unique passphrases work well.</small>
                {message && (
                  <p className="error" role="alert">
                    {message}
                  </p>
                )}
                <button type="submit">
                  {mode === 'login' ? 'Sign in securely' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
