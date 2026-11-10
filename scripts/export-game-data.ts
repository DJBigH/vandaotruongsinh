import fs from 'fs';
import path from 'path';
import {
  ITEM_TEMPLATES,
  SKILL_TEMPLATES,
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  QUEST_TEMPLATES,
  MAP_TEMPLATES,
  STARTER_ITEMS,
  STARTER_SKILLS,
  BREAKTHROUGH_REQUIREMENTS,
  STORY_CHAPTERS,
} from '../server/src/data/game-content';
import {
  REALM_NAMES,
  REALM_TIERS,
  REALM_STAT_MULTIPLIERS,
  BASE_STATS,
  DEFAULT_DODGE_CONFIG,
  QUALITY_NAMES,
  QUALITY_COLORS,
} from '../shared/src/index';

const outDir = path.resolve('game-data-export');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'items.json'), JSON.stringify(ITEM_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'skills.json'), JSON.stringify(SKILL_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'monsters.json'), JSON.stringify(MONSTER_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'bosses.json'), JSON.stringify(BOSS_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'quests.json'), JSON.stringify(QUEST_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'maps.json'), JSON.stringify(MAP_TEMPLATES, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'story_chapters.json'), JSON.stringify(STORY_CHAPTERS, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'starters.json'), JSON.stringify({ STARTER_ITEMS, STARTER_SKILLS }, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'breakthrough_requirements.json'), JSON.stringify(BREAKTHROUGH_REQUIREMENTS, null, 2), 'utf-8');
fs.writeFileSync(path.join(outDir, 'realms_and_stats.json'), JSON.stringify({
  REALM_NAMES,
  REALM_TIERS,
  REALM_STAT_MULTIPLIERS,
  BASE_STATS,
  DEFAULT_DODGE_CONFIG,
  QUALITY_NAMES,
  QUALITY_COLORS
}, null, 2), 'utf-8');

console.log('SUCCESSFULLY_EXPORTED_ALL_GAME_DATA');
