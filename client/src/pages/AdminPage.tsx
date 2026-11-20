// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin Panel Layout
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

import AdminDashboard from '../components/admin/AdminDashboard';
import PlayerManager from '../components/admin/PlayerManager';
import ContentEditor from '../components/admin/ContentEditor';
import AuditLog from '../components/admin/AuditLog';
import GmTools from '../components/admin/GmTools';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'content' | 'audit' | 'gm'>('dashboard');

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#090d16',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}>
        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#ffd700', fontWeight: 'bold' }}>
            VẠN ĐẠO QUẢN TRỊ
          </h1>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
            Quyền: <span style={{ color: '#81c784', fontWeight: 600 }}>{user?.role}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { key: 'dashboard', label: '📊 Tổng Quan' },
            { key: 'players', label: '👥 Người Chơi' },
            { key: 'content', label: '📦 Quản Trị Nội Dung' },
            { key: 'audit', label: '🛡️ Nhật Ký Thao Tác' },
            ...(user?.role === 'OWNER' ? [{ key: 'gm', label: '⚙️ Công Cụ GM' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.key ? '#c5a059' : 'transparent',
                color: activeTab === tab.key ? '#000' : '#cbd5e1',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Back to Game */}
        <button
          onClick={() => navigate('/game')}
          style={{
            padding: '12px',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#ffd700',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🎮 Vào Thế Giới Game
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'players' && <PlayerManager />}
        {activeTab === 'content' && <ContentEditor />}
        {activeTab === 'audit' && <AuditLog />}
        {activeTab === 'gm' && user?.role === 'OWNER' && <GmTools />}
      </div>
    </div>
  );
}
