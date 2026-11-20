// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Inventory Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import {
  QUALITY_COLORS,
  QUALITY_NAMES,
  ItemQuality,
  type InventoryItem,
} from '@shared/index';

function getItemIcon(item: InventoryItem): string {
  const name = item.name?.toLowerCase() || '';

  if (item.type === 'WEAPON') {
    if (name.includes('trượng') || name.includes('pháp')) return '/assets/vnext/icon_item_staff.png';
    if (name.includes('quyền') || name.includes('sáo') || name.includes('giáp thủ')) return '/assets/vnext/icon_item_fist.png';
    return '/assets/vnext/icon_item_sword.png';
  }
  if (item.type === 'ARMOR') {
    if (name.includes('bào') || name.includes('y')) return '/assets/vnext/icon_item_robe.png';
    return '/assets/vnext/icon_item_armor.png';
  }
  if (item.type === 'SHOES') return '/assets/vnext/icon_item_boots.png';
  if (item.type === 'ACCESSORY') return '/assets/vnext/icon_item_ring.png';
  if (item.type === 'CONSUMABLE') {
    if (name.includes('khí') || name.includes('lam')) return '/assets/vnext/icon_item_pill_blue.png';
    if (name.includes('trúc cơ') || name.includes('kim')) return '/assets/vnext/icon_item_pill_gold.png';
    return '/assets/vnext/icon_item_pill_red.png';
  }
  if (item.type === 'MATERIAL') {
    if (name.includes('linh thạch')) return '/assets/vnext/icon_item_spirit_stone.png';
    if (name.includes('thảo') || name.includes('chi') || name.includes('hoa')) return '/assets/vnext/icon_item_herb.png';
    if (name.includes('khoáng') || name.includes('thiết') || name.includes('thạch')) return '/assets/vnext/icon_item_ore.png';
    if (name.includes('đan') || name.includes('yêu') || name.includes('thú')) return '/assets/vnext/icon_item_beast_core.png';
    if (name.includes('rương') || name.includes('hộp') || name.includes('túi')) return '/assets/vnext/icon_item_chest.png';
    if (name.includes('lệnh') || name.includes('bài')) return '/assets/vnext/icon_item_token.png';
    return '/assets/vnext/icon_item_spirit_stone.png';
  }
  return '/assets/vnext/icon_item_spirit_stone.png';
}

function getEquipmentArt(item: InventoryItem): string | null {
  if (item.type === 'ARMOR' || item.type === 'SHOES') return '/assets/v104/equipment_armor.png';
  if (item.type === 'WEAPON') return item.name.toLowerCase().includes('trượng') || item.name.toLowerCase().includes('pháp')
    ? '/assets/v104/equipment_staff.png' : '/assets/v104/equipment_sword.png';
  return null;
}

export default function InventoryPanel() {
  const { inventory, character, loadInventory, loadCharacter, setActivePanel, addNotification } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [enhancing, setEnhancing] = useState(false);
  const [enchanting, setEnchanting] = useState(false);
  const oreCount = inventory.filter((item) => item.templateId === 'item_013').reduce((total, item) => total + item.quantity, 0);
  const nextLevel = selectedItem && selectedItem.enhanceLevel < 5 ? selectedItem.enhanceLevel + 1 : null;
  const enhanceGold = nextLevel ? 40 * nextLevel * nextLevel : 0;

  useEffect(() => {
    if (selectedItem) setSelectedItem(inventory.find((item) => item.id === selectedItem.id) ?? null);
  }, [inventory]);

  const handleEnhance = async (item: InventoryItem) => {
    if (enhancing) return;
    setEnhancing(true);
    try {
      const res = await gameApi.enhanceItem(item.id);
      if (res.success) {
        addNotification(`${item.name} đã cường hóa +${res.data?.enhanceLevel}`, 'success');
        await Promise.all([loadInventory(), loadCharacter()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể cường hóa trang bị', 'error');
    } finally {
      setEnhancing(false);
    }
  };

  const handleEnchant = async (item: InventoryItem, type: 'FURY' | 'WARD' | 'SWIFT') => {
    if (enchanting) return;
    setEnchanting(true);
    try {
      const res = await gameApi.enchantItem(item.id, type);
      if (res.success) {
        addNotification(`${item.name} đã khắc phù văn`, 'success');
        await Promise.all([loadInventory(), loadCharacter()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể khắc phù văn', 'error');
    } finally { setEnchanting(false); }
  };

  const filteredItems = inventory.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'EQUIP') return item.type === 'WEAPON' || item.type === 'ARMOR' || item.type === 'SHOES' || item.type === 'ACCESSORY';
    if (filterType === 'CONSUMABLE') return item.type === 'CONSUMABLE';
    if (filterType === 'MATERIAL') return item.type === 'MATERIAL';
    return true;
  });

  const handleEquip = async (item: InventoryItem) => {
    try {
      const res = item.isEquipped ? await gameApi.unequipItem(item.id) : await gameApi.equipItem(item.id);
      if (res.success) {
        addNotification(item.isEquipped ? 'Đã tháo trang bị' : 'Đã mặc trang bị');
        await loadInventory();
        await loadCharacter();
        setSelectedItem(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi thao tác', 'error');
    }
  };

  const handleUse = async (item: InventoryItem) => {
    try {
      const res = await gameApi.useItem(item.id);
      if (res.success) {
        addNotification(res.data?.message || 'Đã sử dụng');
        await loadInventory();
        await loadCharacter();
        setSelectedItem(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể sử dụng', 'error');
    }
  };

  const handleLock = async (item: InventoryItem) => {
    try {
      await gameApi.lockItem(item.id, !item.isLocked);
      addNotification(item.isLocked ? 'Đã mở khóa vật phẩm' : 'Đã khóa vật phẩm');
      await loadInventory();
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...item, isLocked: !item.isLocked });
      }
    } catch (err: any) {
      addNotification('Lỗi khi khóa', 'error');
    }
  };

  const handleSell = async (item: InventoryItem) => {
    try {
      const res = await gameApi.sellItem(item.id, 1);
      if (res.success) {
        addNotification(`Đã bán vật phẩm, nhận ${res.data?.gold || 0} linh thạch`);
        await loadInventory();
        await loadCharacter();
        setSelectedItem(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi bán', 'error');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '780px',
      maxWidth: '94vw',
      height: '520px',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🎒 TÚI TRỮ VẬT</h2>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'ALL', label: 'Tất Cả' },
          { key: 'EQUIP', label: 'Trang Bị' },
          { key: 'CONSUMABLE', label: 'Đan Dược' },
          { key: 'MATERIAL', label: 'Nguyên Liệu' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            style={{
              background: filterType === tab.key ? '#c5a059' : '#1e293b',
              color: filterType === tab.key ? '#000' : '#cbd5e1',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body: Grid + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Item Grid */}
        <div style={{
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          gap: '10px',
          paddingRight: '6px',
          alignContent: 'start',
        }}>
          {filteredItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            const qualityColor = QUALITY_COLORS[item.quality] || '#aaa';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  width: '64px',
                  height: '64px',
                  background: isSelected ? 'rgba(197, 160, 89, 0.25)' : '#1e293b',
                  border: `2px solid ${item.isEquipped ? '#ffd700' : qualityColor}`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '4px',
                }}
              >
                <img
                  src={getItemIcon(item)}
                  alt={item.name}
                  style={{
                    width: '38px',
                    height: '38px',
                    imageRendering: 'pixelated',
                    objectFit: 'contain',
                  }}
                />
                {item.quantity > 1 && (
                  <span style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 1px 2px #000',
                  }}>
                    {item.quantity}
                  </span>
                )}
                {item.isEquipped && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    fontSize: '0.65rem',
                    background: '#ffd700',
                    color: '#000',
                    borderRadius: '2px',
                    padding: '1px 3px',
                    fontWeight: 'bold',
                  }}>
                    Đang Mặc
                  </span>
                )}
                {item.isLocked && (
                  <span style={{ position: 'absolute', top: 2, right: 2, fontSize: '0.7rem' }}>🔒</span>
                )}
                {item.enhanceLevel > 0 && <span style={{ position: 'absolute', bottom: 2, left: 3, color: '#ffd700', fontSize: '0.68rem', fontWeight: 700 }}>+{item.enhanceLevel}</span>}
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
              Túi đồ hiện đang trống...
            </div>
          )}
        </div>

        {/* Selected Item Detail */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
        }}>
          {selectedItem ? (
            <div>
              {getEquipmentArt(selectedItem) && <img src={getEquipmentArt(selectedItem)!} alt={`Tranh trang bị ${selectedItem.name}`}
                style={{ display: 'block', width: '100%', maxHeight: 150, objectFit: 'contain', marginBottom: 12,
                  background: '#182321', border: '1px solid #746346', borderRadius: 4 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img
                  src={getItemIcon(selectedItem)}
                  alt={selectedItem.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    imageRendering: 'pixelated',
                    background: '#1e293b',
                    borderRadius: '8px',
                    border: `1px solid ${QUALITY_COLORS[selectedItem.quality] || '#c5a059'}`,
                    padding: '4px',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '1.05rem',
                      color: QUALITY_COLORS[selectedItem.quality] || '#fff',
                    }}>
                      {selectedItem.name}{selectedItem.enhanceLevel > 0 ? ` +${selectedItem.enhanceLevel}` : ''}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#1e293b',
                      color: QUALITY_COLORS[selectedItem.quality] || '#aaa',
                    }}>
                      {QUALITY_NAMES[selectedItem.quality]}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '12px' }}>
                {selectedItem.description}
              </p>

              {/* Stats Preview */}
              {selectedItem.stats && (
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                  <div style={{ color: '#c5a059', fontWeight: 600, marginBottom: '4px' }}>Thuộc tính:</div>
                  {selectedItem.stats.atk && <div>• Công kích: +{selectedItem.stats.atk}</div>}
                  {selectedItem.stats.def && <div>• Phòng ngự: +{selectedItem.stats.def}</div>}
                  {selectedItem.stats.spd && <div>• Tốc độ: +{selectedItem.stats.spd}</div>}
                  {selectedItem.stats.maxHp && <div>• Sinh lực tối đa: +{selectedItem.stats.maxHp}</div>}
                  {selectedItem.stats.maxMp && <div>• Linh lực tối đa: +{selectedItem.stats.maxMp}</div>}
                </div>
              )}

              {selectedItem.slot && (
                <div style={{ background: '#162333', border: '1px solid #546b6b', borderRadius: 6, padding: 10, fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f5d47b' }}>Cường hóa {selectedItem.enhanceLevel}/5</strong>
                  {nextLevel ? (
                    <>
                      <div>+{nextLevel}: {enhanceGold} linh thạch · {nextLevel} Thiết Khoáng</div>
                      <div style={{ color: '#9fb0ba' }}>Hiện có: {character?.gold ?? 0} linh thạch · {oreCount} Thiết Khoáng. Thu khoáng khi khám phá và làm nhiệm vụ.</div>
                      <button type="button" onClick={() => handleEnhance(selectedItem)}
                        disabled={enhancing || (character?.gold ?? 0) < enhanceGold || oreCount < nextLevel}
                        style={{ marginTop: 8, padding: '8px 12px', width: '100%', border: 0, borderRadius: 4, background: '#ad8243', color: '#0f172a', fontWeight: 700,
                          cursor: enhancing ? 'wait' : 'pointer', opacity: (character?.gold ?? 0) < enhanceGold || oreCount < nextLevel ? 0.55 : 1 }}>
                        {enhancing ? 'Đang cường hóa...' : `Cường hóa lên +${nextLevel}`}
                      </button>
                    </>
                  ) : <div>Đã đạt cảnh giới tối đa của trang bị.</div>}
                </div>
              )}

              {selectedItem.slot && <div style={{ background: '#1c2926', border: '1px solid #75664a', borderRadius: 5,
                padding: 10, marginTop: 10, fontSize: '0.82rem' }}>
                <strong style={{ color: '#dcc493' }}>Phù văn trang bị</strong>
                {selectedItem.enchantType ? <p style={{ margin: '7px 0 0' }}>Đã khắc: {{ FURY: 'Liệt Hỏa · Công kích +8', WARD: 'Huyền Giáp · Phòng ngự +6', SWIFT: 'Tật Phong · Tốc độ +2' }[selectedItem.enchantType]}</p>
                  : <><p style={{ margin: '7px 0' }}>Mỗi trang bị chỉ khắc một lần. Cần 300 linh thạch và 3 Thiết Khoáng.</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {([['FURY', 'Liệt Hỏa +8 Công'], ['WARD', 'Huyền Giáp +6 Thủ'], ['SWIFT', 'Tật Phong +2 Tốc']] as const).map(([type, label]) =>
                        <button key={type} type="button" onClick={() => handleEnchant(selectedItem, type)}
                          disabled={enchanting || (character?.gold ?? 0) < 300 || oreCount < 3}
                          style={{ padding: '5px 7px', background: '#806442', border: 0, color: '#fff1d6', borderRadius: 3,
                            cursor: 'pointer', opacity: (character?.gold ?? 0) < 300 || oreCount < 3 ? 0.5 : 1 }}>{label}</button>)}
                    </div></>}
              </div>}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {selectedItem.slot && (
                  <button
                    onClick={() => handleEquip(selectedItem)}
                    style={{
                      flex: 1,
                      background: '#c5a059',
                      border: 'none',
                      color: '#000',
                      fontWeight: 'bold',
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedItem.isEquipped ? 'Tháo Ra' : 'Trang Bị'}
                  </button>
                )}

                {selectedItem.type === 'CONSUMABLE' && (
                  <button
                    onClick={() => handleUse(selectedItem)}
                    style={{
                      flex: 1,
                      background: '#2e7d32',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Sử Dụng
                  </button>
                )}

                <button
                  onClick={() => handleLock(selectedItem)}
                  style={{
                    background: '#334155',
                    border: 'none',
                    color: '#cbd5e1',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedItem.isLocked ? 'Mở Khóa' : 'Khóa'}
                </button>

                {!selectedItem.isEquipped && !selectedItem.isLocked && (
                  <button
                    onClick={() => handleSell(selectedItem)}
                    style={{
                      background: '#991b1b',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Bán
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>
              Chọn một vật phẩm để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
