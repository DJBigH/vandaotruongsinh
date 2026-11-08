// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Content Editor Component
// ============================================================

import React, { useEffect, useState } from 'react';
import * as adminApi from '../../api/admin';
import type { ContentItem } from '../../api/admin';

export default function ContentEditor() {
  const [contentType, setContentType] = useState<'items' | 'monsters' | 'bosses' | 'quests'>('items');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editJson, setEditJson] = useState('');

  const fetchContent = async () => {
    try {
      const res = await adminApi.getContent(contentType, 1, search);
      if (res.success && res.data) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error('Lỗi tải cấu hình:', err);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [contentType, search]);

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setEditJson(JSON.stringify(item.data, null, 2));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const parsed = JSON.parse(editJson);
      const res = await adminApi.saveContent(contentType, editingItem.id, parsed);
      if (res.success) {
        alert('Cập nhật cấu hình thành công! Đã tạo bản ghi ContentVersion mới.');
        setEditingItem(null);
        fetchContent();
      }
    } catch (err: any) {
      alert('Định dạng JSON không hợp lệ hoặc có lỗi khi lưu!');
    }
  };

  return (
    <div>
      <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>📦 QUẢN TRỊ NỘI DUNG GAME</h2>

      {/* Type Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'items', label: 'Vật Phẩm (15)' },
          { key: 'monsters', label: 'Quái Vật (5)' },
          { key: 'bosses', label: 'Boss Thủ Lĩnh (2)' },
          { key: 'quests', label: 'Nhiệm Vụ (4)' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setContentType(t.key as any)}
            style={{
              background: contentType === t.key ? '#c5a059' : '#1e293b',
              color: contentType === t.key ? '#000' : '#cbd5e1',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Tìm theo mã hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 14px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#fff',
            outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Mã Định Danh (ID)</th>
              <th style={{ padding: '12px' }}>Tên Gọi</th>
              <th style={{ padding: '12px' }}>Phiên Bản</th>
              <th style={{ padding: '12px' }}>Cập Nhật Lần Cuối</th>
              <th style={{ padding: '12px' }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #334155', fontSize: '0.9rem' }}>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#81c784' }}>{item.id}</td>
                <td style={{ padding: '12px', fontWeight: 600, color: '#ffd700' }}>{item.name}</td>
                <td style={{ padding: '12px' }}>v{item.version}</td>
                <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  {new Date(item.updatedAt).toLocaleString()}
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => openEdit(item)}
                    style={{ background: '#c5a059', border: 'none', color: '#000', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Chỉnh Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* JSON Edit Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <form onSubmit={handleSave} style={{
            background: '#1e293b',
            border: '2px solid #c5a059',
            borderRadius: '10px',
            padding: '24px',
            width: '640px',
            maxWidth: '92vw',
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#ffd700' }}>
              Chỉnh Sửa: {editingItem.name} ({editingItem.id})
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
              Máy chủ tuân thủ cấu hình có phiên bản (ContentVersion). Lưu chỉnh sửa sẽ tạo bản ghi phiên bản mới mà không ảnh hưởng trực tiếp đến người chơi đang trong phiên.
            </p>

            <textarea
              rows={16}
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#81c784',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #64748b', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#c5a059', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
              >
                Lưu & Xuất Bản Phiên Bản Mới
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
