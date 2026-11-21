import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { applyGmCommand, getGmCatalog, getGmCharacters, getGmCharacterState,
  type GmCatalog, type GmCharacter, type GmCharacterState, type GmCommand } from '../../api/admin';

export default function GmTools() {
  const username = useAuthStore((store) => store.user?.username);
  const [catalog, setCatalog] = useState<GmCatalog | null>(null);
  const [characters, setCharacters] = useState<GmCharacter[]>([]);
  const [characterId, setCharacterId] = useState('');
  const [character, setCharacter] = useState<GmCharacterState | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gold, setGold] = useState(10000);
  const [exp, setExp] = useState(10000);
  const [cultivationExp, setCultivationExp] = useState(10000);
  const [realmIndex, setRealmIndex] = useState(0);
  const [realmTier, setRealmTier] = useState(0);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [enhanceLevel, setEnhanceLevel] = useState(0);
  const [skillId, setSkillId] = useState('');
  const [skillLevel, setSkillLevel] = useState(1);
  const [mountId, setMountId] = useState('');
  const [mapId, setMapId] = useState('');

  useEffect(() => {
    void Promise.all([getGmCatalog(), getGmCharacters()]).then(([catalogResponse, characterResponse]) => {
      const next = catalogResponse.data;
      const list = characterResponse.data ?? [];
      setCatalog(next ?? null); setCharacters(list);
      setItemId(next?.items[0]?.id ?? ''); setMapId(next?.maps[0]?.id ?? '');
      setCharacterId(list.find((entry) => entry.username === username && entry.isActive)?.id ?? list[0]?.id ?? '');
    }).catch((reason) => setError(reason.response?.data?.error || 'Không tải được bảng GM'));
  }, [username]);

  useEffect(() => {
    if (!characterId) { setCharacter(null); return; }
    void getGmCharacterState(characterId).then((response) => {
      const next = response.data ?? null;
      setCharacter(next);
      if (next) { setRealmIndex(next.realmIndex); setRealmTier(next.realmTier); }
    }).catch((reason) => setError(reason.response?.data?.error || 'Không tải được nhân vật'));
  }, [characterId]);

  const skills = catalog?.skills.filter((skill) => skill.path === character?.cultivationPath) ?? [];
  const mounts = catalog?.mounts.filter((mount) => mount.alignment === 'BOTH' || mount.alignment === character?.alignment) ?? [];
  const selectedSkill = skills.find((entry) => entry.id === skillId)?.id ?? skills[0]?.id ?? '';
  const selectedMount = mounts.find((entry) => entry.id === mountId)?.id ?? mounts[0]?.id ?? '';
  const selectedItem = catalog?.items.find((entry) => entry.id === itemId);

  const apply = async (command: GmCommand, label: string) => {
    if (!characterId || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await applyGmCommand(characterId, command);
      const refreshed = await getGmCharacterState(characterId);
      setCharacter(refreshed.data ?? null);
      setMessage(`${label} đã áp dụng cho ${refreshed.data?.name ?? 'nhân vật'}.`);
    } catch (reason: any) { setError(reason.response?.data?.error || 'Lệnh GM thất bại'); }
    finally { setBusy(false); }
  };
  const findCharacters = async () => {
    try { const response = await getGmCharacters(search.trim()); setCharacters(response.data ?? []); setError(''); }
    catch (reason: any) { setError(reason.response?.data?.error || 'Không tìm được nhân vật'); }
  };

  return <section className="gm-v110">
    <header><small>OWNER · TEST WORLD</small><h2>Bảng điều khiển GM</h2>
      <p>Chọn nhân vật để kiểm thử. Mọi lệnh được lưu trong nhật ký quản trị.</p></header>
    <div className="gm-v110-target">
      <label>Tìm nhân vật<input value={search} onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void findCharacters(); } }} placeholder="Tên hoặc tài khoản" /></label>
      <button type="button" onClick={() => void findCharacters()}>Tìm</button>
      <label>Đối tượng<select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
        {characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.username}{entry.isActive ? ' · đang chơi' : ''}</option>)}
      </select></label>
    </div>
    {error && <p role="alert" className="gm-v110-error">{error}</p>}
    {message && <p role="status" className="gm-v110-notice">{message}</p>}
    {character && <>
      <div className="gm-v110-summary"><strong>{character.name}</strong>
        <span>{catalog?.realms[String(character.realmIndex)]} · bậc {character.realmTier + 1}</span>
        <span>{character.gold.toLocaleString('vi-VN')} linh thạch</span>
        <span>Tu vi {Number(character.cultivationExp).toLocaleString('vi-VN')}</span>
        <span>{catalog?.maps.find((map) => map.id === character.currentMapId)?.name ?? character.currentMapId}</span></div>
      <div className="gm-v110-grid">
        <article><h3>Chiến đấu</h3><p>Bật bất tử hoặc hồi đầy sinh lực và linh lực.</p>
          <div className="gm-v110-actions"><button disabled={busy} onClick={() => void apply({ kind: 'godMode', value: !character.godMode }, 'Bất tử')}>Bất tử: {character.godMode ? 'Bật' : 'Tắt'}</button>
          <button disabled={busy} onClick={() => void apply({ kind: 'heal' }, 'Hồi phục')}>Hồi đầy HP / MP</button></div></article>
        <article><h3>Tài nguyên</h3><p>Cộng thêm lượng tài nguyên đã nhập.</p>
          <div className="gm-v110-fields"><label>Linh thạch<input type="number" min="0" max="1000000" value={gold} onChange={(e) => setGold(Number(e.target.value))} /></label>
            <label>Kinh nghiệm<input type="number" min="0" max="1000000" value={exp} onChange={(e) => setExp(Number(e.target.value))} /></label>
            <label>Tu vi<input type="number" min="0" max="1000000" value={cultivationExp} onChange={(e) => setCultivationExp(Number(e.target.value))} /></label></div>
          <button disabled={busy} onClick={() => void apply({ kind: 'resources', gold, exp, cultivationExp }, 'Tài nguyên')}>Cộng tài nguyên</button></article>
        <article><h3>Cảnh giới</h3><p>Đặt cảnh giới để thử ngoại hình, chiêu và đột phá.</p>
          <div className="gm-v110-fields"><label>Cảnh giới<select value={realmIndex} onChange={(e) => setRealmIndex(Number(e.target.value))}>
            {Object.entries(catalog?.realms ?? {}).map(([index, name]) => <option key={index} value={index}>{name}</option>)}</select></label>
            <label>Bậc<select value={realmTier} onChange={(e) => setRealmTier(Number(e.target.value))}>
              {['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đại viên mãn'].map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label></div>
          <button disabled={busy} onClick={() => void apply({ kind: 'realm', realmIndex, realmTier }, 'Cảnh giới')}>Đặt cảnh giới</button></article>
        <article><h3>Vật phẩm và cường hóa</h3><p>Thêm vật phẩm có thật trong kho game.</p>
          <label>Vật phẩm<select value={itemId} onChange={(e) => setItemId(e.target.value)}>{catalog?.items.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.id}</option>)}</select></label>
          <div className="gm-v110-fields"><label>Số lượng<input type="number" min="1" max="99" value={quantity} disabled={Boolean(selectedItem?.slot)} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
            <label>Cường hóa<select value={enhanceLevel} disabled={!selectedItem?.slot} onChange={(e) => setEnhanceLevel(Number(e.target.value))}>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>+{value}</option>)}</select></label></div>
          <button disabled={busy || !itemId} onClick={() => void apply({ kind: 'item', templateId: itemId, quantity: selectedItem?.slot ? 1 : quantity, enhanceLevel: selectedItem?.slot ? enhanceLevel : 0 }, 'Vật phẩm')}>Thêm vào túi</button></article>
        <article><h3>Bí kíp</h3><p>Chỉ hiện chiêu của phái nhân vật đang chọn.</p>
          <label>Chiêu thức<select value={selectedSkill} onChange={(e) => setSkillId(e.target.value)}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
          <label>Cấp chiêu<input type="number" min="1" max="10" value={skillLevel} onChange={(e) => setSkillLevel(Number(e.target.value))} /></label>
          <button disabled={busy || !selectedSkill} onClick={() => void apply({ kind: 'skill', skillId: selectedSkill, level: skillLevel }, 'Bí kíp')}>Học / đặt cấp chiêu</button></article>
        <article><h3>Thú cưỡi</h3><p>Thu phục tức thì để kiểm tra hoạt ảnh cưỡi.</p>
          <label>Linh thú<select value={selectedMount} onChange={(e) => setMountId(e.target.value)}>{mounts.map((mount) => <option key={mount.id} value={mount.id}>{mount.name}</option>)}</select></label>
          <button disabled={busy || !selectedMount} onClick={() => void apply({ kind: 'mount', mountId: selectedMount }, 'Thú cưỡi')}>Thu phục và cưỡi</button></article>
        <article><h3>Di chuyển thế giới</h3><p>Đến điểm xuất hiện an toàn của bản đồ đã chọn.</p>
          <label>Bản đồ<select value={mapId} onChange={(e) => setMapId(e.target.value)}>{catalog?.maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}</select></label>
          <button disabled={busy || !mapId} onClick={() => void apply({ kind: 'teleport', mapId }, 'Dịch chuyển')}>Dịch chuyển</button></article>
      </div>
    </>}
  </section>;
}
