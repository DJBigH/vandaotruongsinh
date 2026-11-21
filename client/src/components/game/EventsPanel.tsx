import { useEffect, useState } from 'react';
import { claimMeditation, getEvents, type TimedEvent } from '../../api/game';
import { useGameStore } from '../../stores/gameStore';

const clock = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const detail: Record<TimedEvent['id'], string> = {
  'noon-meditation': 'Ngồi tụ linh nhận 100 tu vi, một lần mỗi khung giờ.',
  'world-boss': 'Tới Rừng Thanh Khê hạ Xích Nha Lang Vương · Thiên Khế. Trong khung giờ boss có gấp đôi sinh lực và đòn mạnh hơn; lần đầu hạ gục nhận thêm 500 linh thạch và 600 tu vi.',
  'night-hunt': 'Săn một yêu thú tại Rừng Thanh Khê. Lần đầu trong khung giờ nhận thêm 120 linh thạch và 150 tu vi.',
};
const card = (id: TimedEvent['id']) => `/assets/v120/card_${id}.png`;

export default function EventsPanel() {
  const { setActivePanel, loadCharacter, addNotification } = useGameStore();
  const [data, setData] = useState<Awaited<ReturnType<typeof getEvents>>['data']>(undefined);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { const result = await getEvents(); if (result.success) setData(result.data); }
    catch { addNotification('Không tải được lịch sự kiện', 'warning'); }
  };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer); }, []);
  const meditate = async () => {
    setBusy(true);
    try {
      const result = await claimMeditation();
      if (result.success) { addNotification(result.message || '+100 tu vi', 'success'); await loadCharacter(); await refresh(); }
      else addNotification(result.error || 'Không thể nhận tu vi', 'warning');
    } catch (problem: any) { addNotification(problem.response?.data?.error || 'Không thể nhận tu vi', 'warning'); }
    finally { setBusy(false); }
  };
  return <section role="dialog" aria-modal="true" aria-labelledby="event-heading" className="event-panel">
    <header><div><small>GIỜ VIỆT NAM · MÁY CHỦ QUYẾT ĐỊNH</small><h2 id="event-heading">Thiên thời · Sự kiện</h2></div>
      <button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng sự kiện">✕</button></header>
    {!data ? <p>Đang tải lịch sự kiện…</p> : <>
      <p className="event-now">Giờ máy chủ: {clock.format(new Date(data.serverTime))}</p>
      {data.active ? <article className="event-active"><img className="event-card-art" src={card(data.active.id)} width="640" height="256" alt="" />
        <strong>ĐANG DIỄN RA · {data.active.title}</strong>
        <span>{clock.format(new Date(data.active.startAt))}–{clock.format(new Date(data.active.endAt))}</span>
        <p>{detail[data.active.id]}</p>
        {data.active.claimed && <em>Đã nhận thưởng khung giờ này</em>}
        {data.active.id === 'noon-meditation' && !data.active.claimed && <button type="button" disabled={busy} onClick={meditate}>Tụ linh ngay</button>}
        {data.active.id !== 'noon-meditation' && <button type="button" onClick={() => setActivePanel('map')}>Xem đường tới Rừng Thanh Khê</button>}
      </article> : <p className="event-idle">Hiện không có sự kiện. Hãy chuẩn bị trang bị, đan dược và đường tới rừng.</p>}
      <h3>Lịch tiếp theo</h3>
      <ol>{data.upcoming.map((entry) => <li key={entry.startAt}>
        <img src={card(entry.id)} width="640" height="256" loading="lazy" alt="" />
        <strong>{entry.title}</strong><time dateTime={entry.startAt}>{clock.format(new Date(entry.startAt))}–{clock.format(new Date(entry.endAt))}</time>
        <span>{detail[entry.id]}</span>
      </li>)}</ol>
    </>}
  </section>;
}
