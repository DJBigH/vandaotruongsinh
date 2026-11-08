import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, isLoading, error, clearError, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/game');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(username, password);
    if (success) {
      navigate('/game');
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated background elements */}
      <div style={styles.bgOverlay} />
      <div style={styles.cloud1} />
      <div style={styles.cloud2} />
      <div style={styles.mountainLeft} />
      <div style={styles.mountainRight} />
      <div style={styles.stars} />

      <form onSubmit={handleSubmit} style={styles.card}>
        {/* Title */}
        <div style={styles.titleSection}>
          <div style={styles.titleDecorLeft}>═══</div>
          <h1 style={styles.title}>VẠN ĐẠO TRƯỜNG SINH</h1>
          <div style={styles.titleDecorRight}>═══</div>
        </div>
        <p style={styles.subtitle}>Vạn Đạo Trường Sinh</p>
        <p style={styles.tagline}>Con đường tu tiên bắt đầu từ đây...</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tên đăng nhập</label>
          <input
            className="input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập..."
            required
            style={styles.input}
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
            style={styles.input}
          />
        </div>

        <button
          type="submit"
          className="btn btn-gold"
          disabled={isLoading}
          style={styles.submitBtn}
        >
          {isLoading ? 'Đang xử lý...' : '⚔ Đăng Nhập ⚔'}
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>Chưa có tài khoản? </span>
          <Link to="/register" style={styles.link}>Đăng ký ngay</Link>
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
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(ellipse at 50% 80%, rgba(45, 106, 79, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  cloud1: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: '200px',
    height: '40px',
    background: 'radial-gradient(ellipse, rgba(245, 230, 200, 0.05) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'pulse 8s infinite',
    pointerEvents: 'none',
  },
  cloud2: {
    position: 'absolute',
    top: '25%',
    right: '15%',
    width: '160px',
    height: '30px',
    background: 'radial-gradient(ellipse, rgba(245, 230, 200, 0.04) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'pulse 12s infinite',
    pointerEvents: 'none',
  },
  mountainLeft: {
    position: 'absolute',
    bottom: 0,
    left: '-5%',
    width: '40%',
    height: '35%',
    background: 'linear-gradient(135deg, #1b4332 0%, #0d0d20 100%)',
    clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  mountainRight: {
    position: 'absolute',
    bottom: 0,
    right: '-5%',
    width: '35%',
    height: '30%',
    background: 'linear-gradient(225deg, #1b4332 0%, #0d0d20 100%)',
    clipPath: 'polygon(0 100%, 60% 0, 100% 100%)',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  stars: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '50%',
    background: 'radial-gradient(1px 1px at 20% 10%, rgba(245,230,200,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 60% 20%, rgba(245,230,200,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 80% 5%, rgba(245,230,200,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 40% 15%, rgba(245,230,200,0.2) 0%, transparent 100%), radial-gradient(1px 1px at 10% 25%, rgba(245,230,200,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 90% 12%, rgba(245,230,200,0.4) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(13, 13, 32, 0.9)',
    border: '1px solid rgba(212, 165, 116, 0.3)',
    borderRadius: '12px',
    padding: '40px 36px 32px',
    width: '400px',
    maxWidth: '90vw',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 165, 116, 0.1)',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  titleDecorLeft: {
    color: 'rgba(212, 165, 116, 0.4)',
    fontSize: '12px',
    letterSpacing: '2px',
  },
  titleDecorRight: {
    color: 'rgba(212, 165, 116, 0.4)',
    fontSize: '12px',
    letterSpacing: '2px',
  },
  title: {
    fontFamily: "'Noto Serif', serif",
    fontSize: '24px',
    fontWeight: 700,
    color: '#d4a574',
    textAlign: 'center' as const,
    letterSpacing: '3px',
    textShadow: '0 2px 10px rgba(212, 165, 116, 0.3)',
  },
  subtitle: {
    fontFamily: "'Noto Serif', serif",
    fontSize: '13px',
    color: 'rgba(212, 165, 116, 0.6)',
    textAlign: 'center' as const,
    marginBottom: '4px',
    letterSpacing: '2px',
  },
  tagline: {
    fontSize: '12px',
    color: 'rgba(245, 230, 200, 0.4)',
    textAlign: 'center' as const,
    marginBottom: '28px',
    fontStyle: 'italic',
  },
  error: {
    background: 'rgba(192, 57, 43, 0.15)',
    border: '1px solid rgba(192, 57, 43, 0.3)',
    borderRadius: '6px',
    padding: '10px 14px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#e74c3c',
  },
  fieldGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(245, 230, 200, 0.7)',
    marginBottom: '6px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  input: {
    background: 'rgba(13, 13, 32, 0.6)',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    letterSpacing: '2px',
    marginTop: '4px',
    marginBottom: '20px',
  },
  footer: {
    textAlign: 'center' as const,
    fontSize: '13px',
  },
  footerText: {
    color: 'rgba(245, 230, 200, 0.5)',
  },
  link: {
    color: '#d4a574',
    fontWeight: 600,
  },
};
