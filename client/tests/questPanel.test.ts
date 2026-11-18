import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import React, { createElement } from 'react';
import type { AxiosInstance } from 'axios';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { ItemQuality, ItemType, QuestStatus, QuestType, type InventoryItem, type QuestInfo } from '../../shared/src/index';

async function loadQuestPanel(t: TestContext) {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    esbuild: { jsx: 'transform' },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { default: QuestPanel } = await vite.ssrLoadModule('/src/components/game/QuestPanel.tsx') as
    typeof import('../src/components/game/QuestPanel');
  const { useGameStore } = await vite.ssrLoadModule('/src/stores/gameStore.ts') as
    typeof import('../src/stores/gameStore');

  return { vite, QuestPanel, useGameStore };
}

const completed: QuestInfo = {
  id: 'character-quest-001',
  templateId: 'quest_main_01',
  name: 'Dị Biến Thanh Khê',
  description: 'Giúp đỡ Trưởng Lão Thanh Khê.',
  type: QuestType.MAIN,
  chapter: 1,
  status: QuestStatus.COMPLETED,
  objectives: [
    { id: 'talk', description: 'Gặp Trưởng Lão', type: 'TALK', current: 1, required: 1 },
    { id: 'kill', description: 'Trừ Sói Xám', type: 'KILL', current: 3, required: 3 },
  ],
  rewards: { exp: 30, gold: 15, cultivationExp: 10, items: [] },
};


test('ongoing quest view shows completed objectives and one unclaimed reward', async (t) => {
  const { QuestPanel, useGameStore } = await loadQuestPanel(t);
  Object.assign(useGameStore.getInitialState(), {
    activeQuestId: completed.id,
    quests: [
      completed,
      {
        ...completed, id: 'character-quest-002', templateId: 'quest_side_02',
        name: 'Thăm dò bờ suối', status: QuestStatus.ACTIVE,
        objectives: [{ id: 'explore', description: 'Khảo sát', type: 'EXPLORE', current: 0, required: 1 }],
      },
      { ...completed, id: 'character-quest-003', name: 'Bản ghi đã nhận thưởng', status: QuestStatus.TURNED_IN },
      { ...completed, id: 'quest_side_04', name: 'Ủy thác mới', status: QuestStatus.AVAILABLE },
    ],
  });
  const html = renderToStaticMarkup(createElement(QuestPanel));

  assert.match(html, /Dị Biến Thanh Khê/u);
  assert.match(html, /Gặp Trưởng Lão \(1\/1\)/u);
  assert.match(html, /Trừ Sói Xám \(3\/3\)/u);
  assert.match(html, /Đang Theo Dõi/u);
  assert.match(html, /Thăm dò bờ suối/u);
  assert.equal((html.match(/>Nhận Thưởng<\/button>/gu) ?? []).length, 1);
  assert.doesNotMatch(html, /Bản ghi đã nhận thưởng|Ủy thác mới|>Tiếp Nhận<\/button>/u);
});

test('claiming a quest refreshes the bag only after the server commits its reward', async (t) => {
  const { vite, QuestPanel, useGameStore } = await loadQuestPanel(t);
  const { default: apiClient } = await vite.ssrLoadModule('/src/api/client.ts') as { default: AxiosInstance };
  Object.assign(useGameStore.getInitialState(), {
    quests: [{ ...completed, templateId: 'quest_main_03' }],
    addNotification: () => {},
  });

  const armor: InventoryItem = {
    id: 'reward-armor-row', templateId: 'item_006', name: 'Linh Giáp Vệ', description: 'Giáp linh lực',
    type: ItemType.ARMOR, quality: ItemQuality.SPIRITUAL, quantity: 1, isEquipped: false,
    isLocked: false, slot: 'ARMOR',
  };
  let committed = false;
  let inventoryReads = 0;
  apiClient.defaults.adapter = async (config) => {
    const route = `${config.method} ${config.url}`;
    let data;
    switch (route) {
      case 'post /game/quests/quest_main_03/turnin':
        if (!committed) {
          throw Object.assign(new Error('Chưa thể hoàn thành nhiệm vụ'), { response: { status: 400 } });
        }
        data = { message: 'Hoàn thành nhiệm vụ!' };
        break;
      case 'get /game/quests':
        data = [{ ...completed, status: QuestStatus.TURNED_IN }];
        break;
      case 'get /game/character':
        data = null;
        break;
      case 'get /game/inventory':
        inventoryReads++;
        data = committed ? [armor] : [];
        break;
      default:
        throw new Error(`Unexpected request: ${route}`);
    }
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  };

  // Exercise the real rendered claim button callback without a DOM dependency.
  const originalCreateElement = React.createElement;
  let claim: (() => Promise<void>) | undefined;
  React.createElement = ((...args: Parameters<typeof createElement>) => {
    const [type, props, ...children] = args;
    if (type === 'button' && children.includes('Nhận Thưởng')) {
      claim = (props as { onClick?: () => Promise<void> })?.onClick;
    }
    return originalCreateElement(...args);
  }) as typeof createElement;
  try {
    renderToStaticMarkup(createElement(QuestPanel));
  } finally {
    React.createElement = originalCreateElement;
  }

  assert.ok(claim, 'the rendered quest has a claim control');
  await claim();
  assert.equal(inventoryReads, 0);
  assert.deepEqual(useGameStore.getState().inventory, []);

  committed = true;
  await claim();
  assert.deepEqual(useGameStore.getState().inventory, [armor]);
  assert.equal(inventoryReads, 1);
});
