import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_STATS, CharacterGender, CultivationPath, DaoAlignment } from '@shared/index';
import { createCharacter } from '../api/game';
import { useGameStore } from '../stores/gameStore';
import CharacterIdentityPicker from '../components/game/CharacterIdentityPicker';

export default function CharacterCreatePage() {
  const navigate = useNavigate();
  const loadCharacter = useGameStore((state) => state.loadCharacter);
  const [name, setName] = useState('');
  const [path, setPath] = useState(CultivationPath.SWORD);
  const [gender, setGender] = useState(CharacterGender.MALE);
  const [alignment, setAlignment] = useState(DaoAlignment.IMMORTAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const stats = BASE_STATS[path];

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Hãy đặt đạo hiệu cho nhân vật.');
    setLoading(true);
    setError('');
    try {
      const result = await createCharacter({ name: name.trim(), cultivationPath: path, gender, alignment, appearance: 0 });
      if (!result.success) return setError(result.error || 'Không thể tạo nhân vật.');
      await loadCharacter();
      navigate('/game');
    } catch (problem: any) {
      setError(problem.response?.data?.error || 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="character-create-page">
    <section className="character-create-shell" aria-labelledby="character-create-title">
      <header className="character-create-header">
        <small>VẠN ĐẠO TRƯỜNG SINH · KHỞI ĐẦU</small>
        <h1 id="character-create-title">Chọn đạo thân của bạn</h1>
        <p>Ba hướng chiến đấu, hai con đường. Hình xem trước là sprite dùng trực tiếp trong thế giới.</p>
      </header>
      <form className="character-create-form" onSubmit={create}>
        {error && <p className="character-create-error" role="alert">{error}</p>}
        <label htmlFor="hero-name">Đạo hiệu</label>
        <input id="hero-name" value={name} maxLength={20} minLength={2} onChange={(event) => setName(event.target.value)}
          placeholder="Nhập tên đạo hiệu..." required autoComplete="off" />
        <CharacterIdentityPicker path={path} gender={gender} alignment={alignment}
          onPath={setPath} onGender={setGender} onAlignment={setAlignment} />
        <div className="character-create-stats" aria-label="Chỉ số khởi đầu">
          <span>Sinh lực <strong>{stats.maxHp}</strong></span><span>Linh lực <strong>{stats.maxMp}</strong></span>
          <span>Công <strong>{stats.atk}</strong></span><span>Thủ <strong>{stats.def}</strong></span>
          <span>Tốc <strong>{stats.spd}</strong></span>
        </div>
        <button className="character-create-submit" type="submit" disabled={loading}>
          {loading ? 'Đang khởi tạo đạo thân…' : 'Bước vào Thanh Khê'}
        </button>
      </form>
    </section>
  </main>;
}
