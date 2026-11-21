import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import AdminDashboard from '../components/admin/AdminDashboard';
import PlayerManager from '../components/admin/PlayerManager';
import ContentEditor from '../components/admin/ContentEditor';
import AuditLog from '../components/admin/AuditLog';
import GmTools from '../components/admin/GmTools';

type AdminTab = 'dashboard' | 'players' | 'content' | 'audit' | 'gm';

export default function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((store) => store.user);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'dashboard', label: 'Tổng quan' },
    { key: 'players', label: 'Người chơi' },
    { key: 'content', label: 'Nội dung' },
    { key: 'audit', label: 'Nhật ký' },
    ...(user?.role === 'OWNER' ? [{ key: 'gm' as const, label: 'Công cụ GM' }] : []),
  ];

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><small>VẠN ĐẠO TRƯỜNG SINH</small><h1>Quản trị thế giới</h1>
        <span>Quyền: <strong>{user?.role}</strong></span></div>
      <nav aria-label="Điều hướng quản trị">
        {tabs.map((tab) => <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''}
          aria-current={activeTab === tab.key ? 'page' : undefined} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}
      </nav>
      <button className="admin-return" type="button" onClick={() => navigate('/game')}>Trở lại game</button>
    </aside>
    <main className="admin-main">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'players' && <PlayerManager />}
      {activeTab === 'content' && <ContentEditor />}
      {activeTab === 'audit' && <AuditLog />}
      {activeTab === 'gm' && user?.role === 'OWNER' && <GmTools />}
    </main>
  </div>;
}
