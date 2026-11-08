// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Crafting / Alchemy Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import type { CraftingRecipe } from '../../api/game';

export default function CraftingPanel() {
  const { inventory, loadInventory, setActivePanel, addNotification } = useGameStore();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await gameApi.getRecipes();
        if (res.success && res.data) {
          setRecipes(res.data);
          if (res.data.length > 0) setSelectedRecipe(res.data[0]);
        }
      } catch (err) {
        console.error('Lỗi tải công thức:', err);
      }
    }
    fetchRecipes();
  }, []);

  const getOwnedCount = (templateId: string) => {
    return inventory
      .filter((i) => i.templateId === templateId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const handleCraft = async () => {
    if (!selectedRecipe) return;
    setLoading(true);
    try {
      const res = await gameApi.craftItem(selectedRecipe.id, quantity);
      if (res.success) {
        addNotification(res.data?.message || 'Luyện chế thành công!', 'success');
        await loadInventory();
      } else {
        addNotification(res.error || 'Thiếu nguyên liệu luyện chế', 'warning');
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi luyện chế', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '740px',
      maxWidth: '92vw',
      height: '480px',
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
        <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🔥 ĐAN ĐẠO & KHÍ ĐẠO</h2>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Recipe List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }}>
          {recipes.map((r) => {
            const isSelected = selectedRecipe?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRecipe(r)}
                style={{
                  background: isSelected ? 'rgba(197, 160, 89, 0.2)' : '#1e293b',
                  border: isSelected ? '1px solid #ffd700' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: isSelected ? '#ffd700' : '#e2e8f0',
                }}
              >
                {r.name}
              </div>
            );
          })}
        </div>

        {/* Selected Recipe Details */}
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {selectedRecipe ? (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#ffd700', fontSize: '1.1rem' }}>
                {selectedRecipe.name}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#c5a059', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>
                  Nguyên Liệu Yêu Cầu (mỗi lần luyện):
                </div>
                {selectedRecipe.ingredients.map((ing, i) => {
                  const owned = getOwnedCount(ing.itemTemplateId);
                  const totalNeed = ing.quantity * quantity;
                  const isEnough = owned >= totalNeed;

                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                      <span>• {ing.name} x{ing.quantity}:</span>
                      <span style={{ color: isEnough ? '#81c784' : '#ef5350', fontWeight: 'bold' }}>
                        {owned} / {totalNeed}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Số lượng luyện:</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '70px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#fff',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>Chọn công thức luyện chế</div>
          )}

          <button
            onClick={handleCraft}
            disabled={loading || !selectedRecipe}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #c5a059 0%, #8c6d31 100%)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang Luyện Đan...' : '🔥 Bắt Đầu Luyện Chế'}
          </button>
        </div>
      </div>
    </div>
  );
}
