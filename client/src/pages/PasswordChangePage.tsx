import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import '../styles/character-create.css';

export default function PasswordChangePage() {
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await changePassword(current, next);
      if (!result.success) return setError(result.error || 'Không đổi được mật khẩu.');
      await checkAuth();
      navigate(user?.role === 'OWNER' ? '/admin' : '/game', { replace: true });
    } catch (problem: any) { setError(problem.response?.data?.error || 'Không đổi được mật khẩu.'); }
    finally { setBusy(false); }
  };
  return <main className="character-create-page" style={{ display: 'grid', placeItems: 'center' }}>
    <form onSubmit={submit} className="character-create-shell character-create-form" style={{ width: 'min(100%, 470px)' }}>
      <h1 style={{ color: '#eed69b', marginBottom: 12 }}>Đổi mật khẩu quản trị</h1>
      <p style={{ lineHeight: 1.55, marginBottom: 20 }}>Mật khẩu ban đầu chỉ dùng một lần. Hãy đặt mật khẩu riêng trước khi mở bảng quản trị.</p>
      {error && <p role="alert" className="character-create-error">{error}</p>}
      <label htmlFor="old-password">Mật khẩu hiện tại</label>
      <input id="old-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
      <label htmlFor="new-password">Mật khẩu mới (ít nhất 12 ký tự)</label>
      <input id="new-password" type="password" minLength={12} autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} required />
      <button className="character-create-submit" disabled={busy} type="submit">{busy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
      <button type="button" onClick={async () => { await logout(); navigate('/', { replace: true }); }}
        style={{ marginTop: 12, background: 'transparent', color: '#c8d3c5', border: 0, cursor: 'pointer' }}>Đăng xuất</button>
    </form>
  </main>;
}
