import type { GameAction } from './actions';

const directions: Readonly<Record<string, 'up' | 'down' | 'left' | 'right'>> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

const actions: Readonly<Record<string, GameAction>> = {
  Space: 'DODGE', Digit1: 'SKILL_1', Digit2: 'SKILL_2', Digit3: 'SKILL_3', Digit4: 'SKILL_4',
};

export class GameControls {
  private held = new Set<string>();
  private action: GameAction | null = null;

  keyDown(code: string, repeat: boolean): boolean {
    if (!directions[code] && !actions[code]) return false;
    if (!repeat && !this.held.has(code)) {
      this.held.add(code);
      if (actions[code]) this.action = actions[code];
    }
    return true;
  }

  keyUp(code: string) {
    this.held.delete(code);
  }

  movement() {
    const directionsHeld = new Set([...this.held].map(code => directions[code]));
    return {
      x: Number(directionsHeld.has('right')) - Number(directionsHeld.has('left')),
      y: Number(directionsHeld.has('down')) - Number(directionsHeld.has('up')),
    };
  }

  takeAction() {
    const action = this.action;
    this.action = null;
    return action;
  }

  clear() {
    this.held.clear();
    this.action = null;
  }
}
