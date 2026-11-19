// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Pet (Linh Thú) Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { CharacterPetDto, PetTemplate } from '@shared/index';

export default function PetPanel() {
  const { setActivePanel, addNotification, inventory, loadInventory, loadCharacter } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState<CharacterPetDto[]>([]);
  const [allTemplates, setAllTemplates] = useState<PetTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('pet_001');
  const [actionLoading, setActionLoading] = useState(false);

  // Check how many Linh Thú Hóa Hình Đan (item_060) player has
  const pillItem = inventory.find((i) => i.templateId === 'item_060');
  const pillCount = pillItem?.quantity || 0;

  async function fetchPets() {
    try {
      setLoading(true);
      const res = await gameApi.getPets();
      if (res.success && res.data) {
        setPets(res.data.pets || []);
        setAllTemplates(res.data.allTemplates || []);
      }
    } catch {
      addNotification('Không thể tải thông tin linh thú', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPets();
  }, []);

  const selectedOwned = pets.find((p) => p.templateId === selectedTemplateId);
  const selectedTmpl = allTemplates.find((t) => t.id === selectedTemplateId);

  async function handleUnlock(templateId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.unlockPet(templateId);
      if (res.success) {
        addNotification(res.message || 'Thuần phục thành công!', 'success');
        await fetchPets();
        await loadCharacter();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể thuần phục', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate(petId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.activatePet(petId);
      if (res.success) {
        addNotification(res.message || 'Linh thú đã xuất chiến!', 'success');
        await fetchPets();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi xuất chiến', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFeed(petId: string) {
    if (pillCount <= 0) {
      addNotification('Không có Linh Thú Hóa Hình Đan trong túi!', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await gameApi.feedPet(petId, 'item_060', 1);
      if (res.success) {
        addNotification(res.message || 'Bồi dưỡng thành công!', 'success');
        await fetchPets();
        await loadInventory();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi bồi dưỡng', 'error');
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
        border: '2px solid #ab47bc',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#e1bee7', fontSize: '1.4rem' }}>
              🐉 Linh Thú Thần Thoại
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>
              Bầu bạn trên con đường tu tiên, gia tăng thuộc tính và kích hoạt kỹ năng trợ chiến
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
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang triệu hồi linh thú...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', marginTop: '16px', height: '440px' }}>
            {/* Left: Pet List */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {allTemplates.map((t) => {
                const owned = pets.find((p) => p.templateId === t.id);
                const isSelected = selectedTemplateId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      background: isSelected ? 'rgba(171, 71, 188, 0.25)' : '#131b26',
                      border: `1px solid ${isSelected ? '#ab47bc' : '#37474f'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: owned ? '#ffd700' : '#78909c', fontSize: '0.9rem' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: owned ? '#81c784' : '#ef5350', marginTop: '2px' }}>
                        {owned ? `Cấp ${owned.level}` : 'Chưa thuần phục'}
                      </div>
                    </div>
                    {owned?.isActive && (
                      <span style={{ fontSize: '0.7rem', color: '#fff', background: '#2e7d32', padding: '2px 6px', borderRadius: '4px' }}>
                        Xuất Chiến
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Selected Pet Detail */}
            {selectedTmpl && (
              <div style={{
                background: '#131b26',
                border: '1px solid #37474f',
                borderRadius: '8px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      background: 'radial-gradient(circle, rgba(171, 71, 188, 0.4) 0%, rgba(19, 27, 38, 0.8) 70%)',
                      border: '2px solid #ab47bc',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <img
                        src={selectedTmpl.id === 'pet_003' ? '/assets/vnext/boss_turtle.png' : selectedTmpl.id === 'pet_002' || selectedTmpl.id === 'pet_006' ? '/assets/vnext/monster_wolf.png' : '/assets/vnext/monster_fox.png'}
                        alt={selectedTmpl.name}
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'cover',
                          objectPosition: '0 0',
                          imageRendering: 'pixelated',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#ffd700', fontSize: '1.2rem' }}>{selectedTmpl.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#ab47bc', border: '1px solid #ab47bc', padding: '2px 8px', borderRadius: '4px' }}>
                          Phẩm chất: {selectedTmpl.quality}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#b0bec5', margin: '4px 0 0 0', lineHeight: '1.3' }}>
                        {selectedTmpl.description}
                      </p>
                    </div>
                  </div>

                  {/* Level & EXP if owned */}
                  {selectedOwned && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cfd8dc', marginBottom: '4px' }}>
                        <span>Đẳng cấp: Cấp {selectedOwned.level}</span>
                        <span>EXP: {selectedOwned.exp} / {selectedOwned.maxExp}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (selectedOwned.exp / selectedOwned.maxExp) * 100)}%`, height: '100%', background: '#ab47bc' }} />
                      </div>
                    </div>
                  )}

                  {/* Stat Bonus Box */}
                  <div style={{ background: '#1e293b', borderRadius: '6px', padding: '10px', marginTop: '14px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#81c784', marginBottom: '6px' }}>
                      ⚡ Thuộc Tính Hỗ Trợ Chủ Nhân
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem', color: '#e0e0e0' }}>
                      {Object.entries((selectedOwned ? selectedOwned.statBonus : selectedTmpl.statBonus) || {}).map(([k, v]) => (
                        <div key={k}>
                          • {k.toUpperCase()}: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>+{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combat Skill Box */}
                  <div style={{ background: '#1e293b', borderRadius: '6px', padding: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64b5f6', marginBottom: '4px' }}>
                      🔮 Kỹ Năng Trợ Chiến
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cfd8dc', lineHeight: '1.4' }}>
                      {selectedTmpl.combatSkillDescription}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  {selectedOwned ? (
                    <>
                      <button
                        disabled={actionLoading || selectedOwned.isActive}
                        onClick={() => handleActivate(selectedOwned.id)}
                        style={{
                          flex: 1,
                          background: selectedOwned.isActive ? '#37474f' : '#2e7d32',
                          color: '#fff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: selectedOwned.isActive ? 'default' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {selectedOwned.isActive ? 'Đang Xuất Chiến' : 'Xuất Chiến'}
                      </button>
                      <button
                        disabled={actionLoading || pillCount <= 0}
                        onClick={() => handleFeed(selectedOwned.id)}
                        style={{
                          flex: 1,
                          background: pillCount > 0 ? '#ab47bc' : '#37474f',
                          color: '#fff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: pillCount > 0 ? 'pointer' : 'not-allowed',
                          fontSize: '0.85rem',
                        }}
                      >
                        Cho Ăn Đan ({pillCount} viên)
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUnlock(selectedTmpl.id)}
                      style={{
                        width: '100%',
                        background: '#c5a059',
                        color: '#000',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Khế Ước Thuần Phục (300 💎)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
