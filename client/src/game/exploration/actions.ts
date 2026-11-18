import type { WsServerMessage } from '../../../../shared/src/index';

type SkillAction = 'SKILL_1' | 'SKILL_2' | 'SKILL_3' | 'SKILL_4';
export type GameAction = 'ATTACK' | 'DODGE' | SkillAction;
export type Aim = { x: number; y: number; angle: number };
export type Cooldowns = NonNullable<WsServerMessage['cooldowns']>;
type ConfirmedAction = { action: GameAction; angle: number };

const ACTION_RETRY_MS = 350;

export class ActionConfirmation {
  private cooldowns: Cooldowns | null = null;
  private pending = new Map<GameAction, { angle: number | null; retryAt: number }>();

  request(action: GameAction, angle: number, now: number): boolean {
    const queued = this.pending.get(action);
    if (!this.cooldowns || cooldown(this.cooldowns, action) !== 0 ||
      (queued && now < queued.retryAt)) return false;
    // A cooldown rise cannot identify which attempt succeeded after a retry.
    this.pending.set(action, { angle: queued ? null : angle, retryAt: now + ACTION_RETRY_MS });
    return true;
  }

  update(next: Cooldowns, now: number, facingAngle: number): ConfirmedAction[] {
    const confirmed: ConfirmedAction[] = [];
    for (const [action, intent] of this.pending) {
      const remaining = cooldown(next, action);
      const started = remaining !== undefined && remaining > 0 &&
        this.cooldowns && cooldown(this.cooldowns, action) === 0;
      if (started) {
        const angle = now < intent.retryAt && intent.angle !== null ? intent.angle : facingAngle;
        confirmed.push({ action, angle });
      }
      if (started || remaining === undefined) this.pending.delete(action);
    }
    this.cooldowns = next;
    return confirmed;
  }

  reset() {
    this.pending.clear();
    this.cooldowns = null;
  }
}

function cooldown(cooldowns: Cooldowns, action: GameAction): number | undefined {
  if (action === 'ATTACK') return cooldowns.attackRemainingSec;
  if (action === 'DODGE') return cooldowns.dodgeRemainingSec;
  return cooldowns.skillsRemainingSec[Number(action.slice(-1)) - 1];
}

/** Pairs the current action's completion listener and safety timer. */
export class ActionAnimationLock {
  private cleanup: (() => void) | null = null;

  get active() {
    return this.cleanup !== null;
  }

  start(register: (complete: () => void) => () => void) {
    this.clear();
    const complete = () => {
      if (this.cleanup === cleanup) this.clear();
    };
    const cleanup = register(complete);
    this.cleanup = cleanup;
  }

  clear() {
    const cleanup = this.cleanup;
    this.cleanup = null;
    cleanup?.();
  }
}
