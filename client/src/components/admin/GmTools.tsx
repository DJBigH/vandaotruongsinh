import { useEffect, useState } from 'react';
import { applyGmCheat, getGmState, type GmState } from '../../api/admin';

export default function GmTools() {
  const [state, setState] = useState<GmState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getGmState().then((res) => setState(res.data ?? null)).catch((err) => setError(err.response?.data?.error || 'Không tải được nhân vật GM')); }, []);
  const run = async (command: { godMode?: boolean; gold?: number; cultivationExp?: number }) => {
    setBusy(true); setError('');
    try { const result = await applyGmCheat(command); if (result.data) setState({ ...state!, ...result.data }); }
    catch (err: any) { setError(err.response?.data?.error || 'Lệnh GM thất bại'); }
    finally { setBusy(false); }
  };
  return <section className="gm-panel">
    <p className="gm-kicker">CHỈ DÀNH CHO CHỦ GAME</p>
    <h2>Công cụ GM</h2>
    <p>Mọi thao tác được lưu trong nhật ký quản trị và chỉ tác động đến nhân vật đang chọn của tài khoản chủ.</p>
    {error && <p role="alert" className="gm-error">{error}</p>}
    {state && <div className="gm-card">
      <h3>{state.name}</h3>
      <p>{state.gold.toLocaleString('vi-VN')} linh thạch · {Number(state.cultivationExp).toLocaleString('vi-VN')} tu vi</p>
      <button type="button" disabled={busy} onClick={() => void run({ godMode: !state.godMode })}>
        Bất tử: {state.godMode ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
      </button>
      <div className="gm-actions">
        <button type="button" disabled={busy} onClick={() => void run({ gold: 1000 })}>+1.000 linh thạch</button>
        <button type="button" disabled={busy} onClick={() => void run({ cultivationExp: 1000 })}>+1.000 tu vi</button>
      </div>
    </div>}
  </section>;
}
