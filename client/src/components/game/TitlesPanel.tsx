import { useEffect, useState } from 'react';
import { equipTitle, getTitles, type TitleInfo } from '../../api/game';
import { useGameStore } from '../../stores/gameStore';
import { alignmentSlug } from '../../game/assets/lineage';
import '../../styles/origin-v160.css';

export default function TitlesPanel() {
  const { character, setActivePanel, loadCharacter, addNotification } = useGameStore();
  const [titles, setTitles] = useState<TitleInfo[]>([]);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const branch = alignmentSlug(character?.alignment);
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    void getTitles().then(result => {
      if (cancelled) return;
      if (result.success && result.data) {
        setTitles(result.data.titles); setEquipped(result.data.equippedTitleId); setLoadState('ready');
      } else setLoadState('error');
    }).catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [character?.id, retry]);
  const choose = async (id: string | null) => {
    setBusy(true);
    try {
      const result = await equipTitle(id);
      if (!result.success) return addNotification(result.error || 'Không thể đeo danh hiệu', 'warning');
      setEquipped(id); await loadCharacter();
      addNotification(id ? 'Đã đeo danh hiệu' : 'Đã tháo danh hiệu', 'success');
    } catch { addNotification('Không kết nối được máy chủ', 'error'); }
    finally { setBusy(false); }
  };
  return <section className="titles-panel" role="dialog" aria-modal="true" aria-labelledby="titles-heading">
    <header><div><small>DANH HIỆU · {branch === 'immortal' ? 'TIÊN ĐẠO' : 'MA ĐẠO'}</small>
      <h2 id="titles-heading">Ấn ký trên đạo lộ</h2></div>
      <button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng danh hiệu">✕</button></header>
    <p>Danh hiệu đã đeo xuất hiện phía trên nhân vật với lụa ấn chuyển động. Tiến cấp để mở thêm.</p>
    {loadState === 'loading' && <p role="status">Đang tải danh hiệu…</p>}
    {loadState === 'error' && <p role="alert">Chưa tải được danh hiệu. <button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></p>}
    <div className="titles-grid">
      {titles.map(title => <article key={title.id} className={title.unlocked ? 'unlocked' : 'locked'}>
        <img src={`/assets/v160/avatar_title_${branch}_${title.id}.png`} width="96" height="96" alt="" />
        <div><h3>{title.name}</h3><small>Cấp {title.level} · Cảnh giới {title.realmIndex + 1}</small></div>
        <button type="button" disabled={busy || !title.unlocked} onClick={() => void choose(equipped === title.id ? null : title.id)}>
          {!title.unlocked ? 'Chưa mở' : equipped === title.id ? 'Tháo xuống' : 'Đeo danh hiệu'}</button>
      </article>)}
    </div>
  </section>;
}
