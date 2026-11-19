// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Turn-Based Combat Scene
// ============================================================

import Phaser from 'phaser';
import { eventBridge } from '../EventBridge';
import * as gameApi from '../../api/game';
import { useGameStore } from '../../stores/gameStore';
import { creatureAppearance } from '../exploration/presentation';
import {
  CombatAction,
  type CombatState,
  type CombatUnitState,
} from '@shared/index';

export default class CombatScene extends Phaser.Scene {
  private combatState: CombatState | null = null;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private enemySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  private playerHpBar!: Phaser.GameObjects.Graphics;
  private playerMpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBars: Map<string, Phaser.GameObjects.Graphics> = new Map();

  private logContainer!: Phaser.GameObjects.Container;
  private actionMenuContainer!: Phaser.GameObjects.Container;
  private skillSubmenuContainer!: Phaser.GameObjects.Container;

  private isProcessingAction: boolean = false;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: { combatState: CombatState }) {
    this.combatState = data.combatState;
    this.isProcessingAction = false;
  }

  create() {
    const width = 960;
    const height = 640;

    // 1. Background (Dark spiritual arena)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1128, 0x0a1128, 0x1c2541, 0x1c2541, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative circle
    const circle = this.add.graphics();
    circle.lineStyle(2, 0xc5a059, 0.4);
    circle.strokeCircle(width / 2, height / 2 - 40, 200);

    // 2. Render Units
    this.renderCombatants();

    // 3. Combat Log Box
    this.createLogBox();

    // 4. Action Menu
    this.createActionMenu();

    // 5. Update state display
    if (this.combatState) {
      this.refreshDisplay();
    }
  }

  private renderCombatants() {
    if (!this.combatState) return;

    // Player (Left side) - Chuẩn mỹ thuật Chibi 2D theo Đạo Thân (Kiếm/Pháp/Thể)
    const char = useGameStore.getState().character;
    const path = char?.cultivationPath || 'SWORD';
    const playerTexture = path === 'SPELL' ? 'player_magic_idle' : path === 'BODY' ? 'player_body_idle' : 'player_idle';
    this.playerSprite = this.add.sprite(220, 260, playerTexture).setScale(2.0);
    const animKey = `${playerTexture}_right`;
    if (this.anims.exists(animKey)) {
      this.playerSprite.play(animKey);
    }

    this.add.text(220, 180, this.combatState.playerState.name, {
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.playerHpBar = this.add.graphics();
    this.playerMpBar = this.add.graphics();

    // Enemies (Right side) - Sử dụng toàn bộ Spritesheet và hiệu ứng thực tế từ creatureAppearance
    this.enemySprites.clear();
    this.enemyHpBars.clear();

    const enemies = this.combatState.enemies;
    enemies.forEach((enemy, index) => {
      const x = 700 + (index * 40);
      const y = 260 + (index * 50);

      const isBoss = enemy.id.startsWith('boss');
      const app = creatureAppearance({ id: enemy.id, monsterId: enemy.id, type: isBoss ? 'BOSS' : 'NORMAL' } as any);
      const sprite = this.add.sprite(x, y, app.texture).setScale((app.scale || 1.0) * 1.5);
      if (app.tint) sprite.setTint(app.tint);
      if (app.walk && this.anims.exists(app.walk)) {
        sprite.play(app.walk);
      }
      // Quay mặt sang trái về phía người chơi
      sprite.setFlipX(true);
      this.enemySprites.set(enemy.id, sprite);

      this.add.text(x, y - 60, enemy.name, {
        fontSize: '16px',
        color: isBoss ? '#ef5350' : '#e0e0e0',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const hpBar = this.add.graphics();
      this.enemyHpBars.set(enemy.id, hpBar);
    });
  }

  private createLogBox() {
    this.logContainer = this.add.container(480, 110);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-240, -40, 480, 80, 8);
    bg.lineStyle(1, 0x37474f, 0.8);
    bg.strokeRoundedRect(-240, -40, 480, 80, 8);
    this.logContainer.add(bg);

    const logText = this.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#e0e0e0',
      align: 'center',
      wordWrap: { width: 450 },
    }).setOrigin(0.5);
    logText.setName('logText');
    this.logContainer.add(logText);
  }

  private createActionMenu() {
    this.actionMenuContainer = this.add.container(480, 480);
    this.skillSubmenuContainer = this.add.container(480, 480).setVisible(false);

    // Main action buttons
    const actions = [
      { label: '⚔️ Tấn Công', action: CombatAction.ATTACK },
      { label: '✨ Kỹ Năng', action: CombatAction.SKILL },
      { label: '🛡️ Phòng Thủ', action: CombatAction.DEFEND },
      { label: '🧪 Dược Phẩm', action: CombatAction.ITEM },
      { label: '🏃 Rút Lui', action: CombatAction.FLEE },
    ];

    const btnWidth = 140;
    const spacing = 16;
    const startX = -((actions.length * btnWidth + (actions.length - 1) * spacing) / 2) + btnWidth / 2;

    actions.forEach((btn, idx) => {
      const x = startX + idx * (btnWidth + spacing);
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x1a237e, 0.8);
      buttonBg.fillRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);
      buttonBg.lineStyle(2, 0xc5a059, 0.8);
      buttonBg.strokeRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);

      const text = this.add.text(0, 0, btn.label, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const btnContainer = this.add.container(x, 0, [buttonBg, text]);
      btnContainer.setSize(btnWidth, 44);
      btnContainer.setInteractive({ useHandCursor: true });

      btnContainer.on('pointerover', () => {
        buttonBg.clear();
        buttonBg.fillStyle(0x303f9f, 1);
        buttonBg.fillRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);
        buttonBg.lineStyle(2, 0xffd700, 1);
        buttonBg.strokeRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);
      });

      btnContainer.on('pointerout', () => {
        buttonBg.clear();
        buttonBg.fillStyle(0x1a237e, 0.8);
        buttonBg.fillRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);
        buttonBg.lineStyle(2, 0xc5a059, 0.8);
        buttonBg.strokeRoundedRect(-btnWidth / 2, -22, btnWidth, 44, 6);
      });

      btnContainer.on('pointerdown', () => {
        if (this.isProcessingAction) return;

        if (btn.action === CombatAction.SKILL) {
          this.openSkillSubmenu();
        } else if (btn.action === CombatAction.ITEM) {
          // Use default healing potion if available
          this.sendAction(CombatAction.ITEM, undefined, 'item_009');
        } else {
          this.sendAction(btn.action);
        }
      });

      this.actionMenuContainer.add(btnContainer);
    });
  }

  private openSkillSubmenu() {
    this.actionMenuContainer.setVisible(false);
    this.skillSubmenuContainer.removeAll(true);
    this.skillSubmenuContainer.setVisible(true);

    const skills = this.combatState?.playerState.skills || [];
    const btnWidth = 180;
    const spacing = 16;
    const startX = -((skills.length * btnWidth + (skills.length - 1) * spacing) / 2) + btnWidth / 2;

    skills.forEach((skill, idx) => {
      const x = startX + idx * (btnWidth + spacing);
      const isReady = skill.currentCooldown === 0 && this.combatState!.playerState.mp >= skill.mpCost;

      const bg = this.add.graphics();
      bg.fillStyle(isReady ? 0x2e7d32 : 0x424242, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -24, btnWidth, 48, 6);
      bg.lineStyle(2, isReady ? 0x66bb6a : 0x757575, 1);
      bg.strokeRoundedRect(-btnWidth / 2, -24, btnWidth, 48, 6);

      const label = `${skill.name}\n${skill.mpCost} MP ${skill.currentCooldown > 0 ? `(CD ${skill.currentCooldown})` : ''}`;
      const text = this.add.text(0, 0, label, {
        fontSize: '12px',
        color: isReady ? '#ffffff' : '#9e9e9e',
        align: 'center',
      }).setOrigin(0.5);

      const container = this.add.container(x, 0, [bg, text]);
      container.setSize(btnWidth, 48);

      if (isReady) {
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', () => {
          this.skillSubmenuContainer.setVisible(false);
          this.actionMenuContainer.setVisible(true);
          this.sendAction(CombatAction.SKILL, skill.id);
        });
      }

      this.skillSubmenuContainer.add(container);
    });

    // Back button
    const backBg = this.add.graphics();
    backBg.fillStyle(0xb71c1c, 0.8);
    backBg.fillRoundedRect(-50, 40, 100, 30, 4);
    const backText = this.add.text(0, 55, 'Quay lại', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
    const backBtn = this.add.container(0, 0, [backBg, backText]);
    backBtn.setSize(100, 30);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.skillSubmenuContainer.setVisible(false);
      this.actionMenuContainer.setVisible(true);
    });
    this.skillSubmenuContainer.add(backBtn);
  }

  private async sendAction(action: CombatAction, skillId?: string, itemId?: string) {
    if (!this.combatState || this.isProcessingAction) return;
    this.isProcessingAction = true;

    // Hiệu ứng tấn công bộc phá theo phong cách Chibi Tu Tiên
    const char = useGameStore.getState().character;
    const path = char?.cultivationPath || 'SWORD';
    const attackAnim = path === 'SWORD' ? 'player_slash_right' : path === 'SPELL' ? 'player_cast_right' : 'player_slash_right';
    const idleAnim = path === 'SPELL' ? 'player_magic_idle_right' : path === 'BODY' ? 'player_body_idle_right' : 'player_idle_right';

    if (this.anims.exists(attackAnim)) {
      this.playerSprite.play(attackAnim);
    }

    this.tweens.add({
      targets: this.playerSprite,
      x: 270,
      duration: 140,
      yoyo: true,
      onComplete: () => {
        if (this.anims.exists(idleAnim)) {
          this.playerSprite.play(idleAnim);
        }
      },
    });

    try {
      const res = await gameApi.combatAction({
        sessionId: this.combatState.id,
        action,
        skillId,
        itemId,
      });

      if (res.success && res.data) {
        this.combatState = res.data;
        this.refreshDisplay();

        // Shake target if damaged
        this.cameras.main.shake(100, 0.005);

        // Check if finished
        if (this.combatState.isFinished) {
          this.handleCombatEnd();
        }
      }
    } catch (err: any) {
      console.error('Lỗi hành động:', err);
    } finally {
      this.isProcessingAction = false;
    }
  }

  private refreshDisplay() {
    if (!this.combatState) return;

    const player = this.combatState.playerState;

    // Draw Player HP Bar
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x212121, 0.8);
    this.playerHpBar.fillRect(140, 320, 160, 12);
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    this.playerHpBar.fillStyle(0xef5350, 1);
    this.playerHpBar.fillRect(140, 320, 160 * hpRatio, 12);

    // Draw Player MP Bar
    this.playerMpBar.clear();
    this.playerMpBar.fillStyle(0x212121, 0.8);
    this.playerMpBar.fillRect(140, 336, 160, 8);
    const mpRatio = Math.max(0, player.mp / player.maxMp);
    this.playerMpBar.fillStyle(0x42a5f5, 1);
    this.playerMpBar.fillRect(140, 336, 160 * mpRatio, 8);

    // Draw Enemy HP Bars
    this.combatState.enemies.forEach((enemy) => {
      const bar = this.enemyHpBars.get(enemy.id);
      if (bar) {
        bar.clear();
        bar.fillStyle(0x212121, 0.8);
        bar.fillRect(620, 320, 160, 12);
        const eRatio = Math.max(0, enemy.hp / enemy.maxHp);
        bar.fillStyle(0xef5350, 1);
        bar.fillRect(620, 320, 160 * eRatio, 12);
      }
    });

    // Update log
    const lastLogs = this.combatState.log.slice(-2);
    const logText = this.logContainer.getByName('logText') as Phaser.GameObjects.Text;
    if (logText) {
      logText.setText(lastLogs.map((l) => l.message).join('\n'));
    }
  }

  private handleCombatEnd() {
    this.actionMenuContainer.setVisible(false);

    const isWin = this.combatState?.result === 'WIN';
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x000000, 0.85);
    modalBg.fillRect(0, 0, 960, 640);

    const titleColor = isWin ? '#ffd700' : '#ef5350';
    const titleText = isWin ? 'CHIẾN THẮNG QUANG VINH!' : 'BỊ ĐÁNH TRỌNG THƯƠNG!';

    this.add.text(480, 220, titleText, {
      fontSize: '28px',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    let rewardDetails = '';
    if (isWin && this.combatState?.rewards) {
      const r = this.combatState.rewards;
      rewardDetails = `Kinh nghiệm: +${r.exp} | Tu vi: +${r.cultivationExp} | Linh thạch: +${r.gold}\n` +
        (r.items.length > 0 ? `Chiến lợi phẩm: ${r.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}` : '');
    } else {
      rewardDetails = 'Đã an toàn quay về điểm hồi sinh...';
    }

    this.add.text(480, 280, rewardDetails, {
      fontSize: '15px',
      color: '#e0e0e0',
      align: 'center',
    }).setOrigin(0.5);

    // Return button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xc5a059, 1);
    btnBg.fillRoundedRect(480 - 80, 360 - 20, 160, 40, 6);

    const btnText = this.add.text(480, 360, 'Tiếp Tục', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnContainer = this.add.container(0, 0, [btnBg, btnText]);
    btnContainer.setSize(160, 40);
    btnContainer.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(480 - 80, 360 - 20, 160, 40),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    btnContainer.on('pointerdown', () => {
      eventBridge.emit('combatEnded');
      this.scene.start('ExplorationScene');
    });
  }
}
