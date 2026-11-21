// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Map & Teleport Panel
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { alignmentSlug } from '../../game/assets/lineage';

interface MapMeta {
  desc: string;
  realm: string;
  icon: string;
}

interface WorldMapOverview {
  id: string;
  name: string;
  discovered: boolean;
  clueFound: boolean;
  clue?: string;
  clueSite?: { x: number; y: number };
}

const MAP_METADATA: Record<string, MapMeta> = {
  map_huyen_u_khe: {
    desc: 'Nơi xuất sinh của huyết mạch Ma Tôn. Huyền U Lão Giả che giấu di vật của người, mở đường ra U Lâm.',
    realm: 'Luyện Khí · Sơ Kỳ',
    icon: '/assets/v160/prop_shrine_demonic.png',
  },
  map_thanh_khe: {
    desc: 'Tân Thủ Thôn an bình dưới chân núi, có Trưởng Lão chỉ dẫn, Dược Sĩ bốc thuốc và Vệ Binh bảo hộ.',
    realm: 'Luyện Khí · Sơ Kỳ',
    icon: '/assets/vnext/building_house.png',
  },
  map_thanh_khe_rung: {
    desc: 'Vùng hoang dã quanh làng, nơi sói xám ẩn náu. Sâu bên trong là hang ổ của Xích Nha Lang Vương.',
    realm: 'Luyện Khí · Trung Kỳ',
    icon: '/assets/vnext/icon_item_beast_core.png',
  },
  map_thanh_van: {
    desc: 'Thanh Vân Kiếm Tông ngút ngàn mây trắng. Nơi luyện kiếm khôi lỗi và thần thú Huyền Giáp Linh Quy trấn giữ.',
    realm: 'Luyện Khí · Viên Mãn',
    icon: '/assets/vnext/icon_item_sword.png',
  },
  map_dan_ha: {
    desc: 'Thung lũng địa hỏa hội tụ các bậc đại sư luyện đan, ẩn chứa Đan Lô Hỏa Linh và Xích Luyện Đan Sư.',
    realm: 'Trúc Cơ · Sơ Kỳ',
    icon: '/assets/vnext/prop_alchemy_furnace.png',
  },
  map_co_kiem_di_tich: {
    desc: 'Chiến trường thượng cổ chôn vùi vạn kiếm. Viễn Cổ Chiến Vệ và Cổ Kiếm Tôn Giả canh giữ kiếm ý vô thượng.',
    realm: 'Trúc Cơ · Trung Kỳ',
    icon: '/assets/vnext/icon_item_sword.png',
  },
  map_u_minh_vuc: {
    desc: 'Ranh giới âm dương, nơi Bạch Cốt Dạ Xoa và U Minh Quỷ Tốt hoành hành dưới trướng Hắc Ám Diêm La.',
    realm: 'Trúc Cơ · Hậu Kỳ',
    icon: '/assets/vnext/icon_item_ring.png',
  },
  map_kinh_tam_canh: {
    desc: 'Ảo cảnh tâm ma phản chiếu tận sâu đáy lòng người tu đạo, đối mặt với Tâm Ma Hóa Thân để đốn ngộ.',
    realm: 'Kim Đan · Sơ Kỳ',
    icon: '/assets/vnext/icon_item_spirit_stone.png',
  },
  map_long_mach_thien_son: {
    desc: 'Dãy núi tuyết ngàn năm phong ấn long mạch, băng hàn thấu cốt, nơi Chân Long Tàn Hồn ngự trị.',
    realm: 'Kim Đan · Trung Kỳ',
    icon: '/assets/vnext/icon_item_ore.png',
  },
  map_thien_khe_dai: {
    desc: 'Tế đài cổ đại tiếp giáp Thiên Đạo ý chí, nơi chư vị đại năng tiếp nhận đại thiên kiếp để phi thăng.',
    realm: 'Kim Đan · Viên Mãn',
    icon: '/assets/vnext/icon_item_token.png',
  },
  map_tran_yeu_thap: {
    desc: 'Tháp cổ giam giữ ma thần và yêu vương vạn cổ: Cửu U Minh Hoàng, Diệt Thế Lôi Long, Vạn Đạo Thiên Tôn.',
    realm: 'Endgame Đỉnh Phong',
    icon: '/assets/vnext/icon_item_chest.png',
  },
};

export default function MapPanel() {
  const { character, currentMap, setActivePanel, addNotification } = useGameStore();
  const teleporting = useRef(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [maps, setMaps] = useState<WorldMapOverview[]>([]);
  const visitedCount = maps.filter((map) => map.discovered).length;
  const clueCount = maps.filter((map) => map.clueFound).length;

  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await gameApi.getWorldMaps();
        if (res.success && res.data) {
          setMaps(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách bản đồ:', err);
      }
    }
    fetchMaps();
  }, []);

  const handleTeleport = async (mapId: string, name: string) => {
    if (teleporting.current) return;
    teleporting.current = true;
    setIsTeleporting(true);
    try {
      const res = await gameApi.teleport(mapId);
      if (res.success) {
        addNotification(`Đã dịch chuyển tới ${name}!`, 'success');
        if (useGameStore.getState().activePanel === 'map') setActivePanel(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể dịch chuyển', 'error');
    } finally {
      teleporting.current = false;
      setIsTeleporting(false);
    }
  };

  return (
    <div role="dialog" aria-labelledby="world-map-heading" style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 40px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f172a',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h2 id="world-map-heading" style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🗺️ THẦN CHÂU ĐỊA ĐỒ</h2>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
            Đã đặt chân tới {visitedCount}/{maps.length} vùng · Tìm thấy {clueCount}/{maps.length} manh mối. Chạm linh miếu để ghi lại sự thật và nhận tu vi.
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          aria-label="Đóng bản đồ"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gap: '10px', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '4px' }}>
        {maps.map((m) => {
          const isCurrent = (currentMap?.id ?? character?.currentMapId) === m.id;
          const meta = MAP_METADATA[m.id] || {
            desc: 'Vùng đất linh khí u ẩn, chờ đạo hữu đến khám phá.',
            realm: 'Trúc Cơ Kỳ',
            icon: '/assets/vnext/prop_ancient_rock.png',
          };

          return (
            <div
              key={m.id}
              style={{
                background: isCurrent ? 'rgba(197, 160, 89, 0.18)' : m.discovered ? '#1e293b' : '#151d29',
                border: isCurrent ? '1px solid #ffd700' : '1px solid #334155',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '6px',
                  background: '#0f172a',
                  border: isCurrent ? '1px solid #ffd700' : '1px solid #475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <img
                    src={`/assets/v160/avatar_${m.id}_${alignmentSlug(character?.alignment)}.png`}
                    alt={m.name}
                    style={{
                      height: '44px',
                      maxWidth: '44px',
                      filter: m.discovered ? 'none' : 'grayscale(1) brightness(.45)',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isCurrent ? '#ffd700' : '#f1f5f9' }}>
                      {m.name}
                    </span>
                    {isCurrent ? (
                      <span style={{ fontSize: '0.72rem', background: '#ffd700', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Vị trí hiện tại
                      </span>
                    ) : m.discovered ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        {meta.realm}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: '#26303b', color: '#aebbc6', padding: '1px 6px', borderRadius: 4 }}>
                        Chưa đặt chân tới
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                    {m.discovered ? meta.desc : 'Đi qua cổng nối từ vùng đang khám phá để mở đường tới đây.'}
                  </div>
                  {m.discovered && (
                    <div style={{ fontSize: '0.79rem', color: m.clueFound ? '#d8c18c' : '#9ed9d1', marginTop: 6, lineHeight: 1.4 }}>
                      {m.clueFound ? `✦ ${m.clue}` : m.clueSite ? `◇ Chưa tìm manh mối · Linh miếu ở tọa độ (${m.clueSite.x}, ${m.clueSite.y})` : '◇ Chưa tìm manh mối'}
                    </div>
                  )}
                </div>
              </div>

              {!isCurrent && m.discovered && (
                <button
                  onClick={() => handleTeleport(m.id, m.name)}
                  disabled={isTeleporting}
                  style={{
                    background: '#c5a059',
                    border: 'none',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: isTeleporting ? 'wait' : 'pointer',
                    flexShrink: 0,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  Dịch Chuyển
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
