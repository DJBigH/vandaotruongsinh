import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BASE_STATS, DEMONIC_REALM_NAMES, REALM_NAMES, REALM_STAT_MULTIPLIERS, REALM_TIERS } from '@shared';
import { BREAKTHROUGH_REQUIREMENTS } from '../data/game-content';

const target = resolve(import.meta.dirname, '../../../game-data-export');
await mkdir(target, { recursive: true });
await writeFile(resolve(target, 'realms_and_stats.json'), JSON.stringify({
  REALM_NAMES, DEMONIC_REALM_NAMES, REALM_TIERS, REALM_STAT_MULTIPLIERS, BASE_STATS,
}, null, 2) + '\n', 'utf8');
await writeFile(resolve(target, 'breakthrough_requirements.json'),
  JSON.stringify(BREAKTHROUGH_REQUIREMENTS, null, 2) + '\n', 'utf8');
console.log(`Exported ${Object.keys(REALM_NAMES).length} realms per path and ${BREAKTHROUGH_REQUIREMENTS.length} transitions`);
