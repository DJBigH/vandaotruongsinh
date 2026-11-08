// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Quest Engine
// ============================================================

import { PrismaClient } from '@prisma/client';
import { QuestStatus, QuestObjective } from '@shared';
import { QUEST_TEMPLATES, QuestTemplate } from '../../data/game-content';

/**
 * Initializes objectives tracking for a newly accepted quest
 */
export function initQuestObjectives(template: QuestTemplate): QuestObjective[] {
  return template.objectives.map((obj) => ({
    id: obj.id,
    description: obj.description,
    type: obj.type,
    targetId: obj.targetId,
    required: obj.required,
    current: 0,
  }));
}

/**
 * Checks if all objectives in a quest are fulfilled
 */
export function areObjectivesComplete(objectives: QuestObjective[]): boolean {
  return objectives.every((o) => o.current >= o.required);
}

/**
 * Updates quest progress for an objective type (e.g. KILL, TALK)
 */
export async function updateQuestProgress(
  prisma: PrismaClient,
  characterId: string,
  type: 'KILL' | 'COLLECT' | 'TALK' | 'EXPLORE' | 'REACH_REALM',
  targetId: string,
  amount: number = 1,
): Promise<{ updatedQuests: string[] }> {
  const activeQuests = await prisma.characterQuest.findMany({
    where: { characterId, status: 'ACTIVE' },
  });

  const updatedQuests: string[] = [];

  for (const q of activeQuests) {
    const objectives = q.progress as unknown as QuestObjective[];
    let changed = false;

    for (const obj of objectives) {
      if (obj.type === type && (!obj.targetId || obj.targetId === targetId)) {
        if (obj.current < obj.required) {
          obj.current = Math.min(obj.required, obj.current + amount);
          changed = true;
        }
      }
    }

    if (changed) {
      const isComplete = areObjectivesComplete(objectives);
      await prisma.characterQuest.update({
        where: { id: q.id },
        data: {
          progress: objectives as any,
          status: isComplete ? 'COMPLETED' : 'ACTIVE',
        },
      });
      updatedQuests.push(q.questId);
    }
  }

  return { updatedQuests };
}
