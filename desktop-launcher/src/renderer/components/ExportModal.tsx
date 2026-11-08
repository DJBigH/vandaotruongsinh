import React, { useState } from 'react';
import { ExportLogResult } from '../../shared/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportTxt: () => Promise<ExportLogResult>;
  onExportZip: () => Promise<ExportLogResult>;
  onShowInFolder: (path: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportTxt,
  onExportZip,
  onShowInFolder,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [result, setResult] = useState<ExportLogResult | null>(null);

  if (!isOpen) return null;

  const handleExportTxt = async () => {
    setIsExporting(true);
    setResult(null);
    const res = await onExportTxt();
    setIsExporting(false);
    setResult(res);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    setResult(null);
    const res = await onExportZip();
    setIsExporting(false);
    setResult(res);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>🤖 XUẤT NHẬT KÝ & CHẨN ĐOÁN CHO AI PHÂN TÍCH</span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Công cụ này tự động tổng hợp toàn bộ nhật ký của <strong>Launcher, Server Fastify và Client Vite</strong> thành định dạng chuẩn hóa, giúp bạn dễ dàng đính kèm vào khung chat AI để nhờ giải quyết sự cố mà không phải copy log thủ công.
          </div>

          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#34d399',
            }}
          >
            🔒 <strong>Bảo Mật Tự Động:</strong> Mật khẩu tài khoản, JWT Tokens, Bearer headers, Database connection string và đường dẫn cá nhân người dùng Windows đã được che dấu an toàn trước khi lưu.
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                  📄 1. Xuất Nhanh File Văn Bản (.txt)
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Cấu trúc 6 phần (Thông tin, Trạng thái, Thao tác gần nhất, Lỗi & Ngữ cảnh, Log 3 nguồn, Phạm vi).
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleExportTxt}
                disabled={isExporting}
              >
                {isExporting ? 'Đang xuất...' : 'Xuất File .txt'}
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  📦 2. Xuất Gói Chẩn Đoán Đầy Đủ (.zip)
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Bao gồm summary.md, manifest.json, events.jsonl và toàn bộ 3 file log riêng biệt.
                </div>
              </div>

              <button
                className="btn btn-outline"
                onClick={handleExportZip}
                disabled={isExporting}
              >
                {isExporting ? 'Đang nén...' : 'Xuất Gói .zip'}
              </button>
            </div>
          </div>

          {/* Result Alert */}
          {result && (
            <div
              style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '6px',
                background: result.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${result.success ? '#10b981' : '#ef4444'}`,
                color: result.success ? '#34d399' : '#f87171',
                fontSize: '12px',
              }}
            >
              {result.success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>🎉 <strong>Xuất thành công:</strong> {result.fileName}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '11px', wordBreak: 'break-all' }}>
                    {result.filePath}
                  </div>
                  {result.filePath && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '11px', alignSelf: 'flex-start', marginTop: '4px' }}
                      onClick={() => onShowInFolder(result.filePath!)}
                    >
                      📁 Mở Thư Mục Chứa File
                    </button>
                  )}
                </div>
              ) : (
                <div>❌ Lỗi xuất file: {result.error}</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
