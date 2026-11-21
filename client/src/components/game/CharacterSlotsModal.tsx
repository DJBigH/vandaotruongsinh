// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - 3 Character Slots Management Modal
// ============================================================

import React, { useState, useEffect } from 'react';
import * as gameApi from '../../api/game';
import { CharacterGender, CultivationPath, DaoAlignment, CULTIVATION_PATH_NAMES, REALM_TIERS, realmName } from '@shared/index';
import CharacterIdentityPicker from './CharacterIdentityPicker';
import { heroAvatarUrl } from '../../game/assets/hero-variants';
import { markOriginCinematic } from '../../game/originCinematic';

interface SlotData {
  slot: number;
  id: string | null;
  name?: string;
  cultivationPath?: CultivationPath;
  realmIndex?: number;
  realmTier?: number;
  alignment?: DaoAlignment;
  gender?: CharacterGender;
  level?: number;
  spiritStones?: number;
  isActive?: boolean;
}

interface Props {
  onClose: () => void;
}

export default function CharacterSlotsModal({ onClose }: Props) {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSlot, setCreatingSlot] = useState<number | null>(null);

  // New character form
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState<CultivationPath>(CultivationPath.SWORD);
  const [newGender, setNewGender] = useState(CharacterGender.MALE);
  const [newAlignment, setNewAlignment] = useState(DaoAlignment.IMMORTAL);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSlots = async () => {
    setLoading(true);
    try {
      const res = await gameApi.getCharacterSlots();
      if (res.success && res.data) {
        setSlots(res.data.slots);
        setActiveCharId(res.data.activeCharacterId);
      }
    } catch (e: any) {
      console.error('Lỗi khi tải danh sách ô nhân vật:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleSwitch = async (characterId: string) => {
    try {
      const res = await gameApi.switchCharacter(characterId);
      if (res.success) {
        if (res.data) markOriginCinematic(res.data.id);
        window.location.reload();
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi khi chuyển đổi nhân vật');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await gameApi.createCharacter({
        name: newName,
        cultivationPath: newPath,
        gender: newGender,
        alignment: newAlignment,
        appearance: 0,
      });
      if (res.success) {
        setCreatingSlot(null);
        setNewName('');
        window.location.reload();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || 'Không thể tạo nhân vật');
    }
  };

  const handleDelete = async (charId: string, charName: string) => {
    if (!window.confirm(`Đạo hữu có chắc chắn muốn hủy bỏ đạo thân [${charName}]? Hành động này không thể hoàn tác!`)) {
      return;
    }
    try {
      const res = await gameApi.deleteCharacter(charId);
      if (res.success) {
        loadSlots();
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi khi xóa nhân vật');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a2823',
        border: '1px solid #ad915d',
        borderRadius: '4px',
        width: '680px',
        maxWidth: '92vw',
        maxHeight: '90dvh',
        overflowY: 'auto',
        padding: '24px',
        color: '#e0e0e0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span> QUẢN LÝ 3 Ô ĐẠO THÂN (NHÂN VẬT)
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#90a4ae',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#90a4ae' }}>Đang nạp linh hồn...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {slots.map((s) => {
              const isOccupied = Boolean(s.id);
              const isActive = s.id === activeCharId || s.isActive;

              return (
                <div
                  key={s.slot}
                  style={{
                    background: isActive ? 'rgba(197, 160, 89, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid #ffd700' : '1px solid #37474f',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: isOccupied ? '#1e293b' : '#0f172a',
                      border: '1px solid #c5a059',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {isOccupied ? (
                        <img
                          src={heroAvatarUrl(s.cultivationPath ?? CultivationPath.SWORD, s.gender ?? CharacterGender.MALE,
                            s.alignment ?? DaoAlignment.IMMORTAL, s.realmIndex ?? 0)}
                          alt={`Chân dung ${s.name}`}
                          style={{ width: '42px', height: '42px', objectFit: 'contain', imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.2rem', color: '#64748b' }}>➕</span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isOccupied ? '#fff' : '#64748b' }}>
                          Ô {s.slot + 1}: {isOccupied ? s.name : 'Chưa Khởi Tạo'}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: '0.75rem', background: '#ffd700', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            ĐANG CHƠI
                          </span>
                        )}
                      </div>

                      {isOccupied && (
                        <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '4px' }}>
                          <span>Hệ: {s.cultivationPath ? CULTIVATION_PATH_NAMES[s.cultivationPath] : 'Kiếm Tu'}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Cảnh giới: {realmName(s.realmIndex ?? 0, s.alignment)} - {REALM_TIERS[s.realmTier ?? 0]}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span style={{ color: '#ffd700' }}>💎 {s.spiritStones ?? 0} Linh Thạch</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isOccupied ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isActive && (
                          <button
                            onClick={() => handleSwitch(s.id!)}
                            style={{
                              background: '#2e7d32',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            Xuất Hồn
                          </button>
                        )}
                        {!isActive && (
                          <button
                            onClick={() => handleDelete(s.id!, s.name!)}
                            style={{
                              background: 'rgba(211, 47, 47, 0.2)',
                              color: '#ef5350',
                              border: '1px solid #ef5350',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setCreatingSlot(s.slot)}
                        style={{
                          background: '#c5a059',
                          color: '#000',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        + Tạo Mới
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Creating Form */}
        {creatingSlot !== null && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid #ffd700',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#ffd700', fontSize: '1rem' }}>
              Khởi Tạo Đạo Thân Mới (Ô {creatingSlot + 1})
            </h3>
            {errorMsg && (
              <div style={{ color: '#ef5350', marginBottom: '8px', fontSize: '0.85rem' }}>{errorMsg}</div>
            )}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#b0bec5', marginBottom: '4px' }}>
                  Đạo Hiệu (Tên nhân vật):
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên đạo hiệu..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#fff',
                  }}
                />
              </div>

              <CharacterIdentityPicker path={newPath} gender={newGender} alignment={newAlignment}
                onPath={setNewPath} onGender={setNewGender} onAlignment={setNewAlignment} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#c5a059',
                    color: '#000',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Xác Nhận Khởi Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingSlot(null)}
                  style={{
                    background: '#475569',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
