import { useEffect, useState } from 'react';
import { REALM_NAMES } from '@shared';
import { equipMount, getMounts, tameMount, type MountInfo } from '../../api/game';
import { useGameStore } from '../../stores/gameStore';

type MountState = { mounts: MountInfo[]; activeMount: string | null };

export default function MountPanel() {
  const { setActivePanel, loadCharacter, addNotification } = useGameStore();
  const [state, setState] = useState<MountState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const result = await getMounts();
    if (result.success && result.data) {
      setState(result.data);
      setSelected((prior) => prior && result.data!.mounts.some((mount) => mount.id === prior)
        ? prior : result.data!.mounts[0]?.id ?? null);
    }
  };
  useEffect(() => { void refresh(); }, []);
  const mount = state?.mounts.find((entry) => entry.id === selected);
  const act = async (mode: 'tame' | 'equip') => {
    if (!mount || !state) return;
    setBusy(true);
    try {
      const result = mode === 'tame' ? await tameMount(mount.id)
        : await equipMount(state.activeMount === mount.id ? null : mount.id);
      if (!result.success) return addNotification(result.error || 'Không thể gọi linh thú', 'warning');
      await refresh();
      await loadCharacter();
      addNotification(mode === 'tame' ? `Đã thu phục ${mount.name}` : 'Đã đổi thú cưỡi', 'success');
    } catch (error: any) {
      addNotification(error.response?.data?.error || 'Không thể gọi linh thú', 'warning');
    } finally { setBusy(false); }
  };
  return <section className="mount-panel v105-panel" role="dialog" aria-modal="true" aria-labelledby="mount-heading">
    <header><div><small>LINH THÚ · THU PHỤC</small><h2 id="mount-heading">Thú cưỡi của đạo hữu</h2></div>
      <button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng thú cưỡi">✕</button></header>
    {!state ? <p>Đang dò dấu chân linh thú…</p> : <div className="mount-layout">
      <div className="mount-list" aria-label="Danh sách linh thú">
        {state.mounts.map((entry) => <button key={entry.id} type="button" className={entry.id === selected ? 'selected' : ''}
          onClick={() => setSelected(entry.id)} aria-current={entry.id === selected ? 'true' : undefined}>
          <img src={`/assets/v120/avatar_${entry.id}_${entry.owned ? 'bonded' : 'wild'}.png`} alt="" width="192" height="192" />
          <span><strong>{entry.name}</strong><small>{entry.owned ? 'ĐÃ THU PHỤC' : `${Math.min(entry.huntProgress, entry.requiredKills)}/${entry.requiredKills} dấu vết`}</small></span>
        </button>)}
      </div>
      {mount && <div className="mount-detail">
        <img className="mount-portrait" src={`/assets/v120/avatar_${mount.id}_${mount.owned ? 'bonded' : 'wild'}.png`}
          alt={mount.name} width="192" height="192" />
        <h3>{mount.name}</h3><p>{mount.description}</p>
        <div className="mount-facts"><span>Địa điểm <strong>{mount.mapName}</strong></span>
          <span>Truy dấu <strong>{mount.preyName} · {Math.min(mount.huntProgress, mount.requiredKills)}/{mount.requiredKills}</strong></span>
          <span>Hang thú <strong>Tọa độ {mount.denPosition.x}, {mount.denPosition.y}</strong></span>
          <span>Cảnh giới <strong>{REALM_NAMES[mount.realmIndex]} trở lên</strong></span>
          <span>Khi cưỡi <strong>+{mount.speedBonus} tốc độ</strong></span></div>
        <progress max={mount.requiredKills} value={Math.min(mount.huntProgress, mount.requiredKills)}
          aria-label={`Dấu vết ${mount.name}`} />
        {mount.owned ? <button type="button" disabled={busy} onClick={() => void act('equip')}>
          {state.activeMount === mount.id ? 'Xuống thú cưỡi' : 'Cưỡi linh thú'}</button>
          : <button type="button" disabled={busy || !mount.realmReady || mount.huntProgress < mount.requiredKills}
            onClick={() => void act('tame')}>
            {!mount.realmReady ? 'Chưa đủ cảnh giới' : mount.huntProgress < mount.requiredKills
              ? 'Hãy đi săn để tìm dấu vết' : 'Đến bản đồ và thu phục'}</button>}
        <small>Hạ mục tiêu để tìm dấu vết, đến gần linh thú tại tọa độ trên rồi nhấn E để thu phục. Sau khi thu phục sẽ tự cưỡi.</small>
      </div>}
    </div>}
  </section>;
}
