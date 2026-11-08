import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    const success = await register(username, email, password);
    if (success) {
      navigate('/game');
    }
  };

  const displayError = localError || error;

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.mountainLeft} />
      <div style={styles.mountainRight} />
      <div style={styles.stars} />

      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.titleSection}>
          <div style={styles.titleDecor}>═══</div>
          <h1 style={styles.title}>VẠN ĐẠO TRƯỜNG SINH</h1>
          <div style={styles.titleDecor}>═══</div>
        </div>
        <p style={styles.subtitle}>Tạo Tài Khoản Mới</p>
        <p style={styles.tagline}>Bước đầu trên con đường tu tiên...</p>

        {displayError && <div style={styles.error}>{displayError}</div>}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tên đăng nhập</label>
          <input
            className="input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập..."
            required
            minLength={3}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email..."
            required
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Mật khẩu</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu..."
            required
            minLength={6}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Xác nhận mật khẩu</label>
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu..."
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-gold"
          disabled={isLoading}
          style={styles.submitBtn}
        >
          {isLoading ? 'Đang xử lý...' : '✦ Đăng Ký ✦'}
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>Đã có tài khoản? </span>
          <Link to="/" style={styles.link}>Đăng nhập</Link>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0d0d20 0%, #1a1a3e 30%, #1b4332 70%, #0d0d20 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    background: 'radial-gradient(ellipse at 50% 80%, rgba(45, 106, 79, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  mountainLeft: {
    position: 'absolute', bottom: 0, left: '-5%',
    width: '40%', height: '35%',
    background: 'linear-gradient(135deg, #1b4332 0%, #0d0d20 100%)',
    clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
    opacity: 0.5, pointerEvents: 'none',
  },
  mountainRight: {
    position: 'absolute', bottom: 0, right: '-5%',
    width: '35%', height: '30%',
    background: 'linear-gradient(225deg, #1b4332 0%, #0d0d20 100%)',
    clipPath: 'polygon(0 100%, 60% 0, 100% 100%)',
    opacity: 0.4, pointerEvents: 'none',
  },
  stars: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '50%',
    background: 'radial-gradient(1px 1px at 25% 12%, rgba(245,230,200,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 55% 18%, rgba(245,230,200,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 75% 8%, rgba(245,230,200,0.5) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(13, 13, 32, 0.9)',
    border: '1px solid rgba(212, 165, 116, 0.3)',
    borderRadius: '12px',
    padding: '36px 36px 28px',
    width: '400px', maxWidth: '90vw',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 165, 116, 0.1)',
  },
  titleSection: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '12px', marginBottom: '4px',
  },
  titleDecor: {
    color: 'rgba(212, 165, 116, 0.4)', fontSize: '12px', letterSpacing: '2px',
  },
  title: {
    fontFamily: "'Noto Serif', serif",
    fontSize: '22px', fontWeight: 700, color: '#d4a574',
    textAlign: 'center' as const, letterSpacing: '3px',
    textShadow: '0 2px 10px rgba(212, 165, 116, 0.3)',
  },
  subtitle: {
    fontFamily: "'Noto Serif', serif",
    fontSize: '14px', color: '#d4a574',
    textAlign: 'center' as const, marginBottom: '4px',
    letterSpacing: '1px',
  },
  tagline: {
    fontSize: '12px', color: 'rgba(245, 230, 200, 0.4)',
    textAlign: 'center' as const, marginBottom: '24px', fontStyle: 'italic',
  },
  error: {
    background: 'rgba(192, 57, 43, 0.15)',
    border: '1px solid rgba(192, 57, 43, 0.3)',
    borderRadius: '6px', padding: '10px 14px',
    marginBottom: '16px', fontSize: '13px', color: '#e74c3c',
  },
  fieldGroup: { marginBottom: '14px' },
  label: {
    display: 'block', fontSize: '12px',
    color: 'rgba(245, 230, 200, 0.7)',
    marginBottom: '6px', fontWeight: 500, letterSpacing: '0.5px',
  },
  submitBtn: {
    width: '100%', padding: '12px', fontSize: '15px',
    letterSpacing: '2px', marginTop: '4px', marginBottom: '18px',
  },
  footer: { textAlign: 'center' as const, fontSize: '13px' },
  footerText: { color: 'rgba(245, 230, 200, 0.5)' },
  link: { color: '#d4a574', fontWeight: 600 },
};
