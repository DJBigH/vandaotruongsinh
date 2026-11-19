// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Demon Subduing Tower (Trấn Yêu Tháp) Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

export default function TowerPanel() {
  const { setActivePanel, addNotification, loadCharacter, loadInventory } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [floors, setFloors] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchTower() {
    try {
      setLoading(true);
      const res = await gameApi.getTowerFloors();
      if (res.success && res.data) {
        setFloors(res.data.floors || []);
      }
    } catch {
      addNotification('Không thể tải thông tin Trấn Yêu Tháp', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTower();
  }, []);

  async function handleChallenge(bossId: string) {
    try {
      setActivePanel(null);
      const res = await gameApi.startCombat(bossId);
      if (res.success && res.data) {
        // Trigger combat scene in Phaser
        const gameInstance = (window as any).phaserGame;
        if (gameInstance) {
          gameInstance.scene.stop('ExplorationScene');
          gameInstance.scene.start('CombatScene', { combatState: res.data });
        }
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể khiêu chiến tầng tháp', 'error');
    }
  }

  async function handleClaim(floor: number) {
    try {
      setActionLoading(true);
      const res = await gameApi.claimTowerFloor(floor);
      if (res.success) {
        addNotification(res.message || 'Lĩnh thưởng thành công!', 'success');
        await fetchTower();
        await Promise.all([loadCharacter(), loadInventory()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa thể lĩnh thưởng', 'warning');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        width: '760px',
        maxHeight: '85vh',
        background: '#0d131d',
        border: '2px solid #ef5350',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(239, 83, 80, 0.3)',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ef5350', fontSize: '1.4rem' }}>
              🗼 Trấn Yêu Tháp (Endgame Boss Rush)
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>
              Nơi phong ấn 6 đại ma thần và kiếm tổ viễn cổ. Thử thách tối thượng cho bậc đại tu sĩ!
            </div>
          </div>
          <button
            onClick={() => setActivePanel(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b0bec5',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang mở phong ấn cổ tháp...</div>
        ) : (
          <div style={{ marginTop: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
            {floors.map((fl) => (
              <div
                key={fl.floor}
                style={{
                  background: fl.isCleared ? 'rgba(76, 175, 80, 0.1)' : '#131b26',
                  border: `1px solid ${fl.isCleared ? '#81c784' : '#37474f'}`,
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    border: '1px solid #ef5350',
                    background: '#1a0505',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    <img
                      src={fl.bossId === 'boss_017' ? '/assets/vnext/boss_turtle.png' : fl.bossId === 'boss_013' ? '/assets/vnext/monster_snake.png' : fl.bossId === 'boss_014' ? '/assets/vnext/monster_fox.png' : fl.bossId === 'boss_016' ? '/assets/vnext/monster_ghost.png' : fl.bossId === 'boss_019' ? '/assets/vnext/npc_mentor.png' : fl.bossId === 'boss_020' || fl.bossId === 'boss_012' ? '/assets/vnext/npc_elder.png' : '/assets/vnext/boss_lang_vuong.png'}
                      alt={fl.bossName}
                      style={{ width: '42px', height: '42px', objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '1rem' }}>{fl.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#ffb74d', background: 'rgba(255, 183, 77, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                        Cảnh giới đề cử: {fl.recommendedRealm}
                      </span>
                      {fl.isCleared && (
                        <span style={{ fontSize: '0.75rem', color: '#81c784', background: 'rgba(76, 175, 80, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                          ✅ Đã Vượt Ải
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#cfd8dc', marginTop: '4px' }}>
                      👹 Boss trấn giữ: <strong style={{ color: '#ef5350' }}>{fl.bossName}</strong> - {fl.bossTitle}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginTop: '4px' }}>
                      🎁 Quà vượt ải: +{fl.rewards.exp} EXP, +{fl.rewards.gold} 💎, +{fl.rewards.cultivationExp} Tu vi
                      {fl.rewards.items?.length > 0 && ` | Vật phẩm: ${fl.rewards.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '110px' }}>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleChallenge(fl.bossId)}
                    style={{
                      background: '#b71c1c',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    ⚔️ Khiêu Chiến
                  </button>
                  {fl.isCleared && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleClaim(fl.floor)}
                      style={{
                        background: '#2e7d32',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Lĩnh Thưởng
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
