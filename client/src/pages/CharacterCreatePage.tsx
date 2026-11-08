// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character Creation Page
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CultivationPath,
  CULTIVATION_PATH_NAMES,
  CULTIVATION_PATH_DESCRIPTIONS,
  BASE_STATS,
} from '@shared/index';
import { createCharacter } from '../api/game';
import { useGameStore } from '../stores/gameStore';

export default function CharacterCreatePage() {
  const navigate = useNavigate();
  const loadCharacter = useGameStore((s) => s.loadCharacter);

  const [name, setName] = useState('');
  const [selectedPath, setSelectedPath] = useState<CultivationPath>(CultivationPath.SWORD);
  const [appearance, setAppearance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStats = BASE_STATS[selectedPath];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập đạo hiệu nhân vật');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createCharacter({
        name: name.trim(),
        cultivationPath: selectedPath,
        appearance,
      });

      if (res.success && res.data) {
        await loadCharacter();
        navigate('/game');
      } else {
        setError(res.error || 'Tạo nhân vật thất bại');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi tạo nhân vật');
    } finally {
      setLoading(false);
    }
  };

  const appearanceColors = ['#4fc3f7', '#ab47bc', '#66bb6a', '#ffa726', '#ef5350', '#ffd700'];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
      padding: '24px',
      color: '#e0e0e0',
    }}>
      <div style={{
        maxWidth: '840px',
        width: '100%',
        background: 'rgba(20, 26, 38, 0.95)',
        border: '1px solid #c5a059',
        borderRadius: '12px',
        padding: '36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#ffd700',
          fontFamily: '"Noto Serif", serif',
          fontSize: '2rem',
          marginBottom: '8px',
          textShadow: '0 2px 8px rgba(255,215,0,0.3)',
        }}>
          KHỞI TẠO ĐẠO THÂN
        </h1>
        <p style={{ textAlign: 'center', color: '#90a4ae', marginBottom: '28px', fontSize: '0.95rem' }}>
          Mệnh do ta định, bước chân vào đại đạo trường sinh vô tận
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 83, 80, 0.15)',
            border: '1px solid #ef5350',
            color: '#ffcdd2',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate}>
          {/* Đạo Hiệu */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#c5a059' }}>
              Đạo Hiệu (Tên nhân vật)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên đạo hiệu..."
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '6px',
                background: '#0d131d',
                border: '1px solid #37474f',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Chọn Hướng Tu Luyện */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, color: '#c5a059' }}>
              Hướng Tu Luyện
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {Object.values(CultivationPath).map((path) => {
                const isSelected = selectedPath === path;
                return (
                  <div
                    key={path}
                    onClick={() => setSelectedPath(path)}
                    style={{
                      border: isSelected ? '2px solid #ffd700' : '1px solid #37474f',
                      background: isSelected ? 'rgba(197, 160, 89, 0.15)' : '#0d131d',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      color: isSelected ? '#ffd700' : '#cfd8dc',
                      marginBottom: '6px',
                    }}>
                      {CULTIVATION_PATH_NAMES[path]}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#90a4ae', lineHeight: 1.4 }}>
                      {CULTIVATION_PATH_DESCRIPTIONS[path]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ngoại Hình / Khí Chất */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, color: '#c5a059' }}>
              Linh Khí Bổn Mệnh (Ngoại hình)
            </label>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {appearanceColors.map((col, idx) => (
                <div
                  key={idx}
                  onClick={() => setAppearance(idx)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: col,
                    cursor: 'pointer',
                    boxShadow: appearance === idx ? `0 0 14px ${col}` : 'none',
                    border: appearance === idx ? '3px solid #fff' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#000',
                  }}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Bảng Chỉ Số Khởi Đầu */}
          <div style={{
            background: '#0d131d',
            border: '1px solid #263238',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '28px',
          }}>
            <div style={{ color: '#c5a059', fontWeight: 600, marginBottom: '12px', fontSize: '0.9rem' }}>
              Chỉ Số Căn Bản:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '0.9rem' }}>
              <div>Sinh Lực: <strong style={{ color: '#ef5350' }}>{currentStats.maxHp}</strong></div>
              <div>Linh Lực: <strong style={{ color: '#4fc3f7' }}>{currentStats.maxMp}</strong></div>
              <div>Công Kích: <strong style={{ color: '#ffa726' }}>{currentStats.atk}</strong></div>
              <div>Phòng Thủ: <strong style={{ color: '#ab47bc' }}>{currentStats.def}</strong></div>
              <div>Tốc Độ: <strong style={{ color: '#26a69a' }}>{currentStats.spd}</strong></div>
              <div>Chí Mạng: <strong style={{ color: '#ffd700' }}>{currentStats.critRate}%</strong></div>
              <div>Kháng Tính: <strong style={{ color: '#8d6e63' }}>{currentStats.resist}</strong></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #c5a059 0%, #8c6d31 100%)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.4)',
            }}
          >
            {loading ? 'Đang Khởi Tạo Đạo Thân...' : 'Bước Vào Tu Tiên Giới'}
          </button>
        </form>
      </div>
    </div>
  );
}
