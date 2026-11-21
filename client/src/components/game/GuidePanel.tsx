import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

const STEPS = [
  {
    title: 'Thanh Khê đang quên tên người',
    body: 'Linh khí biến đổi khiến sói rừng phát cuồng. Trưởng Lão Thanh Khê nhờ bạn tìm nguyên nhân; mỗi hồi truyện sẽ mở thêm một vùng, một lời chứng và một lựa chọn về Thiên Khế.',
    action: 'Bắt đầu bằng nhiệm vụ chính ở góc phải. Gặp Trưởng Lão phía bắc làng.',
  },
  {
    title: 'Di chuyển và tương tác',
    body: 'Dùng WASD hoặc phím mũi tên để đi. Đến gần NPC, cổng, khoáng, rương hoặc linh miếu rồi nhấn E hay nhấp chuột. Chuột trái tấn công, Space né đòn; phím 1–4 dùng kỹ năng.',
    action: 'Nếu bị thương, ghé linh miếu để hồi phục trước khi đi tiếp.',
  },
  {
    title: 'Mỗi vùng có một manh mối',
    body: 'Đi qua cổng để tới vùng mới. Trong Bản Đồ, các vùng đã đặt chân tới có thể dịch chuyển nhanh. Tìm linh miếu của từng vùng để mở lời chứng, nhận linh thạch và tu vi lần đầu.',
    action: 'Bản Đồ ghi tọa độ linh miếu; Sử Ký giữ toàn bộ cốt truyện.',
  },
  {
    title: 'Mạnh lên theo cách của bạn',
    body: 'Nhận trang bị qua nhiệm vụ, trận đánh và Lò Rèn. Trong Túi, dùng Thiết Khoáng để cường hóa tới +10 hoặc khắc một phù văn. Từ +6 trở đi có thể thất bại nhưng món đồ không tụt cấp. Xem Tu Vi để biết mốc đột phá và xác suất thành công. Sự Kiện mở theo giờ Việt Nam, có Lang Vương ở Rừng Thanh Khê.',
    action: 'Lò Rèn cho biết nguyên liệu kiếm ở đâu. Chiêu mộ đệ tử và khám phá từng linh miếu để mở tiếp chính tuyến.',
  },
  {
    title: 'Lĩnh ngộ chiêu và thu phục linh thú',
    body: 'Sau khi đột phá, mở Bí Kíp để học chiêu bằng linh thạch rồi đặt vào phím 1–4. Thú Cưỡi ghi địa điểm, mục tiêu cần săn và tọa độ hang thú. Hạ đủ mục tiêu, đi đến gần linh thú trên bản đồ rồi nhấn E để thu phục. Thú sẽ theo và hỗ trợ di chuyển.',
    action: 'Bí Kíp và Thú Cưỡi luôn mở lại được trong menu ở góc phải.',
  },
];

export default function GuidePanel({ characterId }: { characterId: string }) {
  const [index, setIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const setActivePanel = useGameStore((state) => state.setActivePanel);
  const step = STEPS[index];

  useEffect(() => { nextRef.current?.focus(); }, [index]);

  const finish = (nextPanel: 'quest' | null) => {
    window.localStorage.setItem(`vandao-guide-v105:${characterId}`, 'done');
    setActivePanel(nextPanel);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="guide-title" style={{
      position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(4, 10, 16, 0.76)',
      display: 'grid', placeItems: 'center', padding: 16, boxSizing: 'border-box',
    }}>
      <div style={{ width: 'min(100%, 580px)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
        padding: '28px clamp(18px, 4vw, 32px)', background: '#1c2b25', border: '2px solid #a89162',
        borderRadius: 5, boxShadow: '0 16px 50px #000b', color: '#e7e3d1' }}>
        <div style={{ fontSize: '0.8rem', color: '#d3b46e', fontWeight: 700 }}>HÀNH TRÌNH TU ĐẠO · {index + 1}/{STEPS.length}</div>
        <h2 id="guide-title" style={{ color: '#ffe4a0', fontSize: '1.45rem', margin: '8px 0 15px' }}>{step.title}</h2>
        <p style={{ lineHeight: 1.65, fontSize: '1rem' }}>{step.body}</p>
        <p style={{ lineHeight: 1.5, color: '#9ed9d1', borderLeft: '3px solid #5ba49b', paddingLeft: 12 }}>{step.action}</p>
        <div style={{ display: 'flex', gap: 6, margin: '22px 0', justifyContent: 'center' }} aria-label="Tiến độ hướng dẫn">
          {STEPS.map((_, stepIndex) => <span key={stepIndex} style={{ width: stepIndex === index ? 27 : 9, height: 9, borderRadius: 9,
            background: stepIndex === index ? '#c5a059' : '#465566' }} />)}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => finish(null)} style={{ background: 'transparent', border: '1px solid #718091', color: '#cbd5e1', borderRadius: 6, padding: '9px 14px', cursor: 'pointer' }}>Bỏ qua</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && <button type="button" onClick={() => setIndex(index - 1)} style={{ background: '#273849', border: 0, color: '#e2e8f0', borderRadius: 6, padding: '9px 14px', cursor: 'pointer' }}>Quay lại</button>}
            <button ref={nextRef} type="button" onClick={() => index < STEPS.length - 1 ? setIndex(index + 1) : finish('quest')}
              style={{ background: '#c5a059', border: 0, color: '#111827', borderRadius: 6, padding: '9px 18px', fontWeight: 700, cursor: 'pointer' }}>
              {index < STEPS.length - 1 ? 'Tiếp tục' : 'Mở nhiệm vụ chính'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
