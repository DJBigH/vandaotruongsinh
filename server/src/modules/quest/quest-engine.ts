// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Quest Engine
// ============================================================

import type { CharacterQuest, Prisma, PrismaClient } from '@prisma/client';
import type { QuestObjective } from '@shared';
import type { QuestTemplate } from '../../data/game-content';

interface QuestProgressEvent {
  type: QuestObjective['type'];
  targetId: string;
  amount: number;
}

export function getQuestPrerequisites(template: QuestTemplate): string[] {
  const ids = new Set(template.prerequisites);
  if (template.prerequisiteQuestId) ids.add(template.prerequisiteQuestId);
  return [...ids];
}

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
  prisma: PrismaClient | Prisma.TransactionClient,
  characterId: string,
  type: QuestObjective['type'],
  targetId: string,
  amount: number = 1,
): Promise<{ updatedQuests: string[] }> {
  const events = [{ type, targetId, amount }];
  if ('$transaction' in prisma) {
    return prisma.$transaction((tx) => updateQuestProgressBatch(tx, characterId, events));
  }
  return updateQuestProgressBatch(prisma, characterId, events);
}

export async function updateQuestProgressBatch(
  tx: Prisma.TransactionClient,
  characterId: string,
  events: readonly QuestProgressEvent[],
): Promise<{ updatedQuests: string[] }> {
  // Progress is read, modified and written as one JSON value. Lock it against simultaneous events.
  const activeQuests = await tx.$queryRaw<Pick<CharacterQuest, 'id' | 'questId' | 'progress'>[]>`
    SELECT id, "questId", progress FROM character_quests
    WHERE "characterId" = ${characterId}::uuid AND status = 'ACTIVE'
    ORDER BY id FOR UPDATE
  `;

  const updatedQuests: string[] = [];

  for (const q of activeQuests) {
    const objectives = q.progress as unknown as QuestObjective[];
    let changed = false;

    for (const obj of objectives) {
      if (obj.current >= obj.required) continue;
      const progress = events
        .filter(({ type, targetId }) => obj.type === type && (!obj.targetId || obj.targetId === targetId))
        .reduce((total, { amount }) => total + amount, 0);
      if (progress > 0) {
        obj.current = Math.min(obj.required, obj.current + progress);
        changed = true;
      }
    }

    if (changed) {
      const isComplete = areObjectivesComplete(objectives);
      await tx.characterQuest.update({
        where: { id: q.id },
        data: {
          progress: objectives as unknown as Prisma.InputJsonValue,
          status: isComplete ? 'COMPLETED' : 'ACTIVE',
        },
      });
      updatedQuests.push(q.questId);
    }
  }

  return { updatedQuests };
}
