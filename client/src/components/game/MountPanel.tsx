import { useEffect, useState } from 'react';
import { equipMount, getMounts } from '../../api/game';
import { useGameStore } from '../../stores/gameStore';

type MountState = NonNullable<Awaited<ReturnType<typeof getMounts>>['data']>;

export default function MountPanel() {
  const { setActivePanel, loadCharacter, addNotification } = useGameStore();
  const [state, setState] = useState<MountState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getMounts().then((result) => { if (result.success) setState(result.data ?? null); }); }, []);
  const toggle = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const result = await equipMount(state.activeMount ? null : state.mount.id);
      if (!result.success) return addNotification(result.error || 'Không thể gọi thú cưỡi', 'warning');
      await loadCharacter();
      setState({ ...state, activeMount: result.data?.activeMount ?? null });
      addNotification(result.data?.activeMount ? 'Thú cưỡi đã theo chân đạo hữu' : 'Đã xuống thú cưỡi', 'success');
    } catch (problem: any) { addNotification(problem.response?.data?.error || 'Không thể gọi thú cưỡi', 'warning'); }
    finally { setBusy(false); }
  };
  return <section className="mount-panel" role="dialog" aria-modal="true" aria-labelledby="mount-heading">
    <header><h2 id="mount-heading">Thú cưỡi bản mệnh</h2><button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng thú cưỡi">✕</button></header>
    {!state ? <p>Đang tải linh thú…</p> : <div className="mount-content">
      <img src={`/assets/v104/${state.mount.id}.png`} alt={state.mount.name} />
      <div><small>{state.mount.id === 'mount_crane' ? 'TU TIÊN' : 'TU MA'} · CẢNH GIỚI TRÚC CƠ</small>
        <h3>{state.mount.name}</h3><p>{state.mount.description}</p>
        <p>Đang cưỡi: tăng <strong>2 tốc độ</strong> trong bản đồ. Máy chủ xác thực tốc độ di chuyển.</p>
        <button type="button" disabled={!state.unlocked || busy} onClick={toggle}>
          {!state.unlocked ? 'Đạt Trúc Cơ để mở' : state.activeMount ? 'Xuống thú cưỡi' : 'Gọi thú cưỡi'}
        </button>
      </div>
    </div>}
  </section>;
}
