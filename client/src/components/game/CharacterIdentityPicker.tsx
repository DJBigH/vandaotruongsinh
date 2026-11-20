import React from 'react';
import { CharacterGender, CultivationPath, DaoAlignment, CULTIVATION_PATH_NAMES } from '@shared/index';
import { heroVariantKey } from '../../game/assets/hero-variants';
import '../../styles/character-create.css';

interface Props {
  path: CultivationPath;
  gender: CharacterGender;
  alignment: DaoAlignment;
  onPath: (path: CultivationPath) => void;
  onGender: (gender: CharacterGender) => void;
  onAlignment: (alignment: DaoAlignment) => void;
}

export default function CharacterIdentityPicker({ path, gender, alignment, onPath, onGender, onAlignment }: Props) {
  const preview = `/assets/v104/${heroVariantKey(path, gender, alignment, 0)}_preview.png`;
  return <div className="identity-picker">
    <div className="identity-preview">
      <img src={preview} alt={`Ngoại hình ${gender === 'MALE' ? 'nam' : 'nữ'} · ${alignment === 'IMMORTAL' ? 'tu tiên' : 'tu ma'} · ${CULTIVATION_PATH_NAMES[path]}`} />
      <span>ĐẠO THÂN · {CULTIVATION_PATH_NAMES[path]}</span>
      <small>Nguồn sprite 64×64 · bốn hướng · ngoại hình đổi khi đột phá</small>
    </div>
    <div className="identity-controls">
      <fieldset><legend>Hướng tu luyện</legend><div className="identity-options">
        {Object.values(CultivationPath).map((choice) => <button key={choice} type="button" aria-pressed={path === choice}
          onClick={() => onPath(choice)}>{CULTIVATION_PATH_NAMES[choice]}</button>)}
      </div></fieldset>
      <fieldset><legend>Đạo thân</legend><div className="identity-options">
        <button type="button" aria-pressed={gender === CharacterGender.MALE} onClick={() => onGender(CharacterGender.MALE)}>Nam</button>
        <button type="button" aria-pressed={gender === CharacterGender.FEMALE} onClick={() => onGender(CharacterGender.FEMALE)}>Nữ</button>
      </div></fieldset>
      <fieldset><legend>Con đường</legend><div className="identity-options">
        <button type="button" aria-pressed={alignment === DaoAlignment.IMMORTAL} onClick={() => onAlignment(DaoAlignment.IMMORTAL)}>Tu Tiên · giữ tâm</button>
        <button type="button" aria-pressed={alignment === DaoAlignment.DEMONIC} onClick={() => onAlignment(DaoAlignment.DEMONIC)}>Tu Ma · phá giới</button>
      </div></fieldset>
      <p className="identity-note">Hai con đường dùng chung chính tuyến Thiên Khế, khác diện mạo và dấu ấn tu luyện. Ba hướng chiến đấu giữ kỹ năng riêng.</p>
    </div>
  </div>;
}
