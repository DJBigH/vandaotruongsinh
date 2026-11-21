import assert from 'node:assert/strict';
import test from 'node:test';
import { QUEST_TEMPLATES } from '../data/quests';
import { localizeLineageText } from '../modules/quest/lineage-text';

test('Ma quests use Ma locations and NPC names while keeping quest IDs', () => {
  const wrong=/Thanh Khê|Thanh Vân|Đan Hà|U Minh Vực|Kính Tâm|Trấn Yêu Tháp|Đạo Sĩ Tiêu Dao|Trưởng Lão Thanh Khê/;
  for (const quest of Object.values(QUEST_TEMPLATES)) {
    assert.equal(localizeLineageText(quest.name,'IMMORTAL'),quest.name);
    for (const value of [quest.name,quest.description,...quest.objectives.map(item=>item.description)]) {
      assert.doesNotMatch(localizeLineageText(value,'DEMONIC'),wrong,`${quest.id}: ${value}`);
    }
  }
  assert.match(localizeLineageText('Rừng Thanh Khê dẫn tới Thanh Vân Kiếm Tông','DEMONIC'),/U Lâm.*Huyền Ma Tông/);
});
