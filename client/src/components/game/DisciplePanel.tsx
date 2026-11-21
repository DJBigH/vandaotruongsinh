import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { DiscipleOverview } from '@shared/index';
import * as gameApi from '../../api/game';
import { useGameStore } from '../../stores/gameStore';

export default function DisciplePanel() {
  const { character, setActivePanel, loadCharacter, addNotification } = useGameStore();
  const [overview, setOverview] = useState<DiscipleOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  async function refresh() {
    const response = await gameApi.getDisciple();
    if (response.success && response.data) setOverview(response.data);
  }

  useEffect(() => {
    let mounted = true;
    closeButtonRef.current?.focus();
    gameApi.getDisciple().then((response) => {
      if (mounted && response.success && response.data) setOverview(response.data);
    }).catch(() => {
      if (mounted) setError('Không thể tải trạng thái đệ tử.');
    }).finally(() => { if (mounted) setLoading(false); });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      mounted = false;
      window.removeEventListener('keydown', closeOnEscape);
      (document.getElementById('disciple-menu-button') ?? document.getElementById('game-menu-toggle'))?.focus();
    };
  }, [character?.id]);

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function perform(action: () => Promise<{ success: boolean; message?: string }>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await action();
      if (response.success) {
        addNotification(response.message || 'Đã cập nhật đệ tử.', 'success');
        await Promise.all([refresh(), loadCharacter()]);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Không thể cập nhật đệ tử.';
      setError(message);
      addNotification(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const disciple = overview?.disciple;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.75)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="disciple-title" onKeyDown={trapFocus} style={{
        width: 'min(480px, 100%)', maxHeight: 'min(85vh, 650px)', overflowY: 'auto',
        background: '#0d131d', color: '#e2e8f0', border: '2px solid #c5a059', borderRadius: 12,
        padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.8)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
          <div>
            <h2 id="disciple-title" style={{ margin: 0, color: '#fbbf24' }}>Đệ Tử Đồng Hành</h2>
            <p style={{ margin: '8px 0 0', color: '#aebdca' }}>Một đệ tử đi cùng đạo hữu và hỗ trợ chiến đấu.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={() => setActivePanel(null)} aria-label="Đóng bảng đệ tử" style={{ cursor: 'pointer', background: '#1e293b', color: '#fff', border: '1px solid #64748b', borderRadius: 6, padding: '6px 10px', fontSize: 18 }}>×</button>
        </div>

        {loading && <p role="status">Đang tải...</p>}
        {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}

        {!loading && overview && !disciple && (
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #475569', borderRadius: 8, background: '#17212e' }}>
            <h3 style={{ margin: '0 0 8px', color: '#f8fafc' }}>Dược Sĩ Liễu Muội</h3>
            <p style={{ lineHeight: 1.55 }}>Sau khi vượt qua thử thách ở Thanh Khê, Liễu Muội có thể đồng hành và dùng thuật pháp trợ chiến.</p>
            <p style={{ color: overview.eligible ? '#86efac' : '#fcd34d' }}>{overview.eligible ? 'Đã đủ điều kiện chiêu mộ.' : overview.requirement}</p>
            <p>Chi phí: <strong>{overview.recruitCost} linh thạch</strong> · Đang có {character?.gold ?? 0}</p>
            <button type="button" disabled={busy || !overview.eligible || (character?.gold ?? 0) < overview.recruitCost} onClick={() => perform(gameApi.recruitDisciple)} style={buttonStyle}>Chiêu mộ Liễu Muội</button>
          </div>
        )}

        {!loading && disciple && (
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #475569', borderRadius: 8, background: '#17212e' }}>
            <h3 style={{ margin: '0 0 8px', color: '#f8fafc' }}>{disciple.name}</h3>
            <p style={{ color: disciple.isActive ? '#86efac' : '#cbd5e1' }}>{disciple.isActive ? 'Đang đồng hành' : 'Đang nghỉ ngơi'}</p>
            <p>Cấp {disciple.level}/{disciple.maxLevel} · Công kích {disciple.attack}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" disabled={busy} onClick={() => perform(() => gameApi.setDiscipleActive(!disciple.isActive))} style={buttonStyle}>
                {disciple.isActive ? 'Cho nghỉ ngơi' : 'Cho xuất chiến'}
              </button>
              {disciple.level < disciple.maxLevel && (
                <button type="button" disabled={busy || (character?.gold ?? 0) < disciple.upgradeCost} onClick={() => perform(gameApi.upgradeDisciple)} style={buttonStyle}>
                  Bồi dưỡng · {disciple.upgradeCost} linh thạch
                </button>
              )}
            </div>
            {disciple.level < disciple.maxLevel && (character?.gold ?? 0) < disciple.upgradeCost && <p style={{ color: '#fcd34d' }}>Cần thêm linh thạch để bồi dưỡng.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

const buttonStyle = {
  background: '#8b691f', color: '#fff', border: '1px solid #fbbf24', borderRadius: 8,
  padding: '10px 14px', minHeight: 44, font: 'inherit', fontWeight: 600, cursor: 'pointer',
} as const;
