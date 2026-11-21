import { useEffect, useState } from 'react';
import { realmName } from '@shared/index';
import { useGameStore } from '../../stores/gameStore';
import { craftItem, getRecipes, type CraftingRecipe } from '../../api/game';
import { weaponArt, weaponPortrait } from '../../game/assets/weaponArt';

export default function CraftingPanel() {
  const { inventory, character, loadInventory, setActivePanel, addNotification } = useGameStore();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [category, setCategory] = useState<'weapons' | 'elixirs'>('weapons');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getRecipes().then((result) => { if (result.success) setRecipes(result.data ?? []); }); }, []);
  const weapons = (recipe: CraftingRecipe) => recipe.id.startsWith('recipe_weapon_') || recipe.id === 'recipe_003';
  const shown = recipes.filter((recipe) => category === 'weapons' ? weapons(recipe) : !weapons(recipe));
  const selected = shown.find((recipe) => recipe.id === selectedId) ?? shown[0];
  const isWeapon = selected && weapons(selected);
  const owned = (id: string) => inventory.filter((item) => item.templateId === id)
    .reduce((sum, item) => sum + item.quantity, 0);
  const enough = !!selected && selected.ingredients.every((item) => owned(item.itemTemplateId) >= item.quantity * quantity);
  const realmReady = !!selected && (character?.realmIndex ?? 0) >= (selected.minRealmIndex ?? 0);
  const craft = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await craftItem(selected.id, isWeapon ? 1 : quantity);
      if (!result.success) return addNotification(result.error || 'Không thể rèn vật phẩm', 'warning');
      addNotification(result.data?.message || `Đã tạo ${selected.result.name}`, 'success');
      await loadInventory();
    } catch (error: any) { addNotification(error.response?.data?.error || 'Không thể rèn vật phẩm', 'warning'); }
    finally { setBusy(false); }
  };
  return <section className="craft-panel v105-panel" role="dialog" aria-modal="true" aria-labelledby="craft-heading">
    <header><div><small>KHÍ ĐẠO · ĐAN ĐẠO</small><h2 id="craft-heading">Lò rèn & đan phòng</h2></div>
      <button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng lò rèn">✕</button></header>
    <div className="craft-tabs" role="group" aria-label="Loại công thức">
      <button type="button" aria-pressed={category === 'weapons'} onClick={() => { setCategory('weapons'); setSelectedId(null); setQuantity(1); }}>Vũ khí ({recipes.filter(weapons).length})</button>
      <button type="button" aria-pressed={category === 'elixirs'} onClick={() => { setCategory('elixirs'); setSelectedId(null); }}>Đan dược ({recipes.filter((recipe) => !weapons(recipe)).length})</button>
    </div>
    <div className="craft-layout">
      <div className="craft-list" aria-label="Công thức rèn">
        {shown.map((recipe) => <button type="button" key={recipe.id} className={selected?.id === recipe.id ? 'selected' : ''}
          onClick={() => { setSelectedId(recipe.id); setQuantity(1); }} aria-current={selected?.id === recipe.id ? 'true' : undefined}>
          <img src={weapons(recipe) ? weaponArt(recipe.result.itemTemplateId, recipe.result.name)
            : '/assets/vnext/icon_item_pill_gold.png'} alt="" />
          <span><strong>{recipe.result.name}</strong><small>{recipe.minRealmIndex
            ? `${realmName(recipe.minRealmIndex, character?.alignment)} trở lên` : `${realmName(0, character?.alignment)} trở lên`}</small></span></button>)}
      </div>
      <div className="craft-detail">{selected ? <>
        <img className="craft-portrait" src={isWeapon ? weaponPortrait(selected.result.itemTemplateId, selected.result.name)
          : '/assets/vnext/icon_item_pill_gold.png'} alt={selected.result.name} />
        <h3>{selected.result.name}</h3><p>{selected.result.description}</p>
        <p><strong>Phẩm cấp:</strong> {selected.result.quality} · <strong>Cảnh giới:</strong> {realmName(selected.minRealmIndex ?? 0, character?.alignment)}</p>
        {selected.result.stats && <div className="craft-stats">{Object.entries(selected.result.stats).map(([stat, value]) =>
          <span key={stat}>{stat.toUpperCase()} +{value}</span>)}</div>}
        <h4>Nguyên liệu</h4><div className="craft-materials">{selected.ingredients.map((ingredient) => {
          const have = owned(ingredient.itemTemplateId); const need = ingredient.quantity * (isWeapon ? 1 : quantity);
          return <div key={ingredient.itemTemplateId}><span>{ingredient.name}</span>
            <strong className={have >= need ? 'enough' : 'missing'}>{have}/{need}</strong></div>;
        })}</div>
        {selected.sourceHint && <p className="craft-source">Tìm tại: {selected.sourceHint}</p>}
        {!isWeapon && <label>Số lượng <input type="number" min={1} max={99} value={quantity}
          onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number(event.target.value) || 1)))} /></label>}
        <button type="button" disabled={busy || !realmReady || !enough} onClick={() => void craft()}>
          {!realmReady ? 'Chưa đủ cảnh giới' : !enough ? 'Thiếu nguyên liệu' : busy ? 'Đang chế tạo…' : isWeapon ? 'Rèn vũ khí' : 'Luyện đan'}</button>
      </> : <p>Đang tải công thức…</p>}</div>
    </div>
  </section>;
}
