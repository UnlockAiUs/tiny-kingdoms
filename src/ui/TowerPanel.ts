import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/game.config';
import { TOWER_CONFIGS, TowerConfig } from '../config/towers.config';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';

export interface TowerPanelConfig {
  availableTowers: string[];
  onTowerDragStart: (towerId: string, pointer: Phaser.Input.Pointer) => void;
  onTowerDragMove: (towerId: string, x: number, y: number) => void;
  onTowerDragEnd: (towerId: string, x: number, y: number) => boolean;
}

/**
 * Focus Carousel Tower Panel
 * - One tower enlarged in center (selected)
 * - Swipe left/right to change selection
 * - Drag up from center card to place tower
 */
export class TowerPanel extends Phaser.GameObjects.Container {
  private availableTowers: string[];
  private onTowerDragStart: (towerId: string, pointer: Phaser.Input.Pointer) => void;
  private onTowerDragMove: (towerId: string, x: number, y: number) => void;
  private onTowerDragEnd: (towerId: string, x: number, y: number) => boolean;

  // Card containers
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private currentGold: number = 0;

  // Focus carousel state
  private selectedIndex: number = 0;
  private isAnimating: boolean = false;

  // Drag state
  private isDragging: boolean = false;
  private dragTowerId: string | null = null;
  private dragGhost: Phaser.GameObjects.Container | null = null;

  // Swipe detection
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;
  private pointerDown: boolean = false;
  private gestureDecided: boolean = false;

  // Modal blocking - prevents tower placement when modals are open
  private interactionsBlocked: boolean = false;

  // Layout constants - enlarged cards now that gold display is removed
  private readonly CARD_WIDTH = 160;
  private readonly CARD_HEIGHT = 205;
  private readonly CARD_SPACING = 20;
  private readonly CENTER_SCALE = 1.0;
  private readonly SIDE_SCALE = 0.65;
  private readonly SWIPE_THRESHOLD = 60;
  private readonly DRAG_THRESHOLD = 15;

  constructor(scene: Phaser.Scene, config: TowerPanelConfig) {
    super(scene, 0, GAME_CONFIG.HEIGHT - GAME_CONFIG.BOTTOM_PANEL_HEIGHT);

    this.availableTowers = config.availableTowers;
    this.onTowerDragStart = config.onTowerDragStart;
    this.onTowerDragMove = config.onTowerDragMove;
    this.onTowerDragEnd = config.onTowerDragEnd;

    this.setDepth(DEPTH_LAYERS.UI_ELEMENTS);
    this.createPanel();
    this.setupInputHandlers();

    scene.add.existing(this);
  }

  private createPanel(): void {
    const { WIDTH, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;

    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x5D3A1A, 1);
    panelBg.fillRoundedRect(0, 0, WIDTH, BOTTOM_PANEL_HEIGHT, { tl: 16, tr: 16, bl: 0, br: 0 });
    panelBg.fillStyle(0x8B5A2B, 1);
    panelBg.fillRoundedRect(4, 4, WIDTH - 8, BOTTOM_PANEL_HEIGHT - 4, { tl: 14, tr: 14, bl: 0, br: 0 });
    panelBg.fillStyle(0xF5E6C8, 0.95);
    panelBg.fillRoundedRect(8, 8, WIDTH - 16, BOTTOM_PANEL_HEIGHT - 8, { tl: 12, tr: 12, bl: 0, br: 0 });
    panelBg.lineStyle(2, 0xC9A227, 0.8);
    panelBg.strokeRoundedRect(6, 6, WIDTH - 12, BOTTOM_PANEL_HEIGHT - 6, { tl: 13, tr: 13, bl: 0, br: 0 });
    this.add(panelBg);

    // Create tower cards
    this.createTowerCards();

    // Navigation arrows
    this.createNavArrows();

    // Instructions
    const instructions = this.scene.add.text(
      WIDTH / 2,
      BOTTOM_PANEL_HEIGHT - 20,
      'Swipe to browse \u2022 Drag up to place',
      {
        fontSize: '16px',
        fontFamily: '"Silkscreen", monospace',
        color: '#8D7050'
      }
    ).setOrigin(0.5);
    this.add(instructions);

    // Initial layout
    this.updateCardPositions(false);
  }

  private createTowerCards(): void {
    const { WIDTH, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;
    // Center cards vertically (no gold display offset needed)
    const centerY = BOTTOM_PANEL_HEIGHT / 2 - 5;

    this.availableTowers.forEach((towerId, _index) => {
      const config = TOWER_CONFIGS[towerId];
      if (!config) return;

      const card = this.createTowerCard(config);
      card.setPosition(WIDTH / 2, centerY); // All start at center
      card.setData('towerId', towerId);
      card.setData('config', config);
      this.cardContainers.push(card);
      this.add(card);
    });
  }

  private createTowerCard(config: TowerConfig): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, 0);

    // Card background
    const bg = this.scene.add.graphics();
    card.setData('bg', bg);
    this.drawCardBackground(bg, false, true);
    card.add(bg);

    // Tower sprite or emoji - larger for better visibility
    if (this.scene.textures.exists(config.spriteKey)) {
      const sprite = this.scene.add.image(0, -30, config.spriteKey);
      sprite.setScale(0.7);
      card.add(sprite);
    } else {
      const emoji = this.scene.add.text(0, -35, this.getTowerEmoji(config.id), {
        fontSize: '56px'
      }).setOrigin(0.5);
      card.add(emoji);
    }

    // Tower name - larger text
    const name = this.scene.add.text(0, 35, config.name, {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#5D3A1A',
      align: 'center',
      wordWrap: { width: this.CARD_WIDTH - 20 }
    }).setOrigin(0.5);
    card.add(name);
    card.setData('nameText', name);

    // Cost badge - larger and repositioned
    const costBg = this.scene.add.graphics();
    costBg.fillStyle(0xC9A227, 0.5);
    costBg.fillRoundedRect(-40, 60, 80, 35, 10);
    costBg.lineStyle(2, 0xC9A227, 0.9);
    costBg.strokeRoundedRect(-40, 60, 80, 35, 10);
    card.add(costBg);

    const cost = this.scene.add.text(0, 78, `${config.cost}`, {
      fontSize: '24px',
      fontFamily: '"Silkscreen", monospace',
      color: '#5D3A1A',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    card.add(cost);
    card.setData('costText', cost);

    return card;
  }

  private drawCardBackground(bg: Phaser.GameObjects.Graphics, isSelected: boolean, canAfford: boolean): void {
    bg.clear();

    const w = this.CARD_WIDTH;
    const h = this.CARD_HEIGHT;

    if (!canAfford) {
      // Greyed out
      bg.fillStyle(0x000000, 0.05);
      bg.fillRoundedRect(-w/2 + 2, -h/2 + 2, w, h, 12);
      bg.fillStyle(0xBBAAAA, 0.8);
      bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
      bg.lineStyle(2, 0x888888, 0.5);
      bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
    } else if (isSelected) {
      // Selected - golden glow
      bg.fillStyle(0x000000, 0.2);
      bg.fillRoundedRect(-w/2 + 3, -h/2 + 3, w, h, 12);
      bg.fillStyle(0xFFF8DC, 1);
      bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
      bg.lineStyle(4, 0xFFD700, 1);
      bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
    } else {
      // Normal
      bg.fillStyle(0x000000, 0.1);
      bg.fillRoundedRect(-w/2 + 2, -h/2 + 2, w, h, 12);
      bg.fillStyle(0xFAF0DC, 1);
      bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
      bg.lineStyle(2, 0xA67C52, 0.8);
      bg.strokeRoundedRect(-w/2, -h/2, w, h, 12);
    }
  }

  private createNavArrows(): void {
    const { WIDTH, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;
    const centerY = BOTTOM_PANEL_HEIGHT / 2 - 5;

    // Left arrow
    const leftArrow = this.createArrowButton('<', 50, centerY, () => this.navigate(-1));
    this.add(leftArrow);

    // Right arrow
    const rightArrow = this.createArrowButton('>', WIDTH - 50, centerY, () => this.navigate(1));
    this.add(rightArrow);
  }

  private createArrowButton(label: string, x: number, y: number, callback: () => void): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x8B5A2B, 1);
    bg.fillCircle(0, 0, 30);
    bg.lineStyle(3, 0x5D3A1A, 1);
    bg.strokeCircle(0, 0, 30);
    btn.add(bg);

    const text = this.scene.add.text(0, -2, label, {
      fontSize: '36px',
      fontFamily: 'Arial Black',
      color: '#FFF8DC',
      stroke: '#5D3A1A',
      strokeThickness: 2
    }).setOrigin(0.5);
    btn.add(text);

    btn.setSize(60, 60);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      callback();
    });
    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xA67C52, 1);
      bg.fillCircle(0, 0, 32);
      bg.lineStyle(3, 0x5D3A1A, 1);
      bg.strokeCircle(0, 0, 32);
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x8B5A2B, 1);
      bg.fillCircle(0, 0, 30);
      bg.lineStyle(3, 0x5D3A1A, 1);
      bg.strokeCircle(0, 0, 30);
    });

    return btn;
  }

  private setupInputHandlers(): void {
    const { BOTTOM_PANEL_HEIGHT, HEIGHT } = GAME_CONFIG;
    const panelTop = HEIGHT - BOTTOM_PANEL_HEIGHT;

    // Scene-level input for swipe/drag detection
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < panelTop) return; // Not in panel
      if (this.isAnimating) return;
      if (this.interactionsBlocked) return; // Modal is open

      this.pointerStartX = pointer.x;
      this.pointerStartY = pointer.y;
      this.pointerDown = true;
      this.gestureDecided = false;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle active drag
      if (this.isDragging && this.dragGhost) {
        this.dragGhost.setPosition(pointer.x, pointer.y);
        if (this.dragTowerId) {
          this.onTowerDragMove(this.dragTowerId, pointer.x, pointer.y);
        }
        return;
      }

      if (!this.pointerDown || this.gestureDecided) return;

      const deltaX = pointer.x - this.pointerStartX;
      const deltaY = this.pointerStartY - pointer.y; // Positive = up

      // Check for upward drag on center card (start tower placement)
      if (deltaY > this.DRAG_THRESHOLD && Math.abs(deltaX) < deltaY) {
        this.gestureDecided = true;
        this.startDragFromCenter(pointer);
        return;
      }

      // Check for horizontal swipe (change selection)
      if (Math.abs(deltaX) > this.SWIPE_THRESHOLD) {
        this.gestureDecided = true;
        this.pointerDown = false;
        if (deltaX > 0) {
          this.navigate(-1); // Swipe right = previous
        } else {
          this.navigate(1); // Swipe left = next
        }
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.endDrag(pointer);
      }
      this.pointerDown = false;
      this.gestureDecided = false;
    });

    this.scene.input.on('pointerupoutside', () => {
      if (this.isDragging) {
        this.forceCleanupDrag();
      }
      this.pointerDown = false;
      this.gestureDecided = false;
    });

    this.scene.input.on('pointercancel', () => {
      if (this.isDragging) {
        this.forceCleanupDrag();
      }
      this.pointerDown = false;
      this.gestureDecided = false;
    });
  }

  private navigate(direction: number): void {
    if (this.isAnimating || this.isDragging) return;

    const newIndex = this.selectedIndex + direction;
    if (newIndex < 0 || newIndex >= this.availableTowers.length) return;

    this.selectedIndex = newIndex;
    this.updateCardPositions(true);
  }

  private updateCardPositions(animate: boolean): void {
    const { WIDTH, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;
    const centerX = WIDTH / 2;
    const centerY = BOTTOM_PANEL_HEIGHT / 2 - 5;

    if (animate) {
      this.isAnimating = true;
    }

    this.cardContainers.forEach((card, index) => {
      const offset = index - this.selectedIndex;
      const isCenter = offset === 0;

      // Calculate target position
      const targetX = centerX + offset * (this.CARD_WIDTH * 0.7 + this.CARD_SPACING);
      const targetScale = isCenter ? this.CENTER_SCALE : this.SIDE_SCALE;
      const targetAlpha = isCenter ? 1 : 0.5;
      const targetDepth = isCenter ? 10 : 5 - Math.abs(offset);

      // Update card appearance
      const bg = card.getData('bg') as Phaser.GameObjects.Graphics;
      const config = card.getData('config') as TowerConfig;
      const canAfford = this.currentGold >= config.cost;
      this.drawCardBackground(bg, isCenter, canAfford);

      // Update name text: full name for center card, nickname for side cards
      const nameText = card.getData('nameText') as Phaser.GameObjects.Text;
      if (nameText) {
        nameText.setText(isCenter ? config.name : config.nickname);
      }

      card.setDepth(targetDepth);

      if (animate) {
        this.scene.tweens.add({
          targets: card,
          x: targetX,
          y: centerY,
          scaleX: targetScale,
          scaleY: targetScale,
          alpha: targetAlpha,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            if (index === this.selectedIndex) {
              this.isAnimating = false;
            }
          }
        });
      } else {
        card.setPosition(targetX, centerY);
        card.setScale(targetScale);
        card.setAlpha(targetAlpha);
      }
    });
  }

  private startDragFromCenter(pointer: Phaser.Input.Pointer): void {
    const selectedCard = this.cardContainers[this.selectedIndex];
    if (!selectedCard) return;

    const config = selectedCard.getData('config') as TowerConfig;
    if (!config) return;

    // Check affordability
    if (this.currentGold < config.cost) {
      this.showCantAffordFeedback(selectedCard);
      return;
    }

    // Start drag
    this.isDragging = true;
    this.dragTowerId = config.id;

    selectedCard.setAlpha(0.5);
    this.createDragGhost(config, pointer.x, pointer.y);
    this.onTowerDragStart(config.id, pointer);
    // No timeout - user can hold tower as long as they want
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragTowerId) {
      this.forceCleanupDrag();
      return;
    }

    const placed = this.onTowerDragEnd(this.dragTowerId, pointer.x, pointer.y);

    // Restore selected card
    const selectedCard = this.cardContainers[this.selectedIndex];
    if (selectedCard) {
      selectedCard.setAlpha(1);
    }

    // Remove ghost
    if (this.dragGhost) {
      this.scene.tweens.killTweensOf(this.dragGhost);
      this.dragGhost.destroy();
      this.dragGhost = null;
    }

    // If placed, update button state (gold might have changed)
    if (placed) {
      this.updateCardPositions(false);
    }

    this.isDragging = false;
    this.dragTowerId = null;
  }

  private forceCleanupDrag(): void {
    // Restore selected card
    const selectedCard = this.cardContainers[this.selectedIndex];
    if (selectedCard) {
      selectedCard.setAlpha(1);
    }

    // Destroy ghost
    if (this.dragGhost) {
      this.scene.tweens.killTweensOf(this.dragGhost);
      this.dragGhost.destroy();
      this.dragGhost = null;
    }

    this.isDragging = false;
    this.dragTowerId = null;
    this.pointerDown = false;
    this.gestureDecided = false;
  }

  private createDragGhost(config: TowerConfig, x: number, y: number): void {
    this.dragGhost = this.scene.add.container(x, y);
    this.dragGhost.setDepth(DEPTH_LAYERS.OVERLAY);

    // Range indicator
    const range = this.scene.add.graphics();
    range.fillStyle(0x44FF44, 0.12);
    range.fillCircle(0, 0, config.range);
    range.lineStyle(2, 0x44FF44, 0.4);
    range.strokeCircle(0, 0, config.range);
    this.dragGhost.add(range);

    // Tower sprite
    if (this.scene.textures.exists(config.spriteKey)) {
      const sprite = this.scene.add.image(0, 0, config.spriteKey);
      sprite.setScale(0.6);
      this.dragGhost.add(sprite);
    } else {
      const emoji = this.scene.add.text(0, 0, this.getTowerEmoji(config.id), {
        fontSize: '48px'
      }).setOrigin(0.5);
      this.dragGhost.add(emoji);
    }

    // Pulse animation
    this.scene.tweens.add({
      targets: range,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });
  }

  private showCantAffordFeedback(card: Phaser.GameObjects.Container): void {
    const startX = card.x;
    this.scene.tweens.add({
      targets: card,
      x: startX - 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        card.x = startX;
      }
    });
  }

  private getTowerEmoji(towerId: string): string {
    const emojis: Record<string, string> = {
      'ember_watch': '\uD83D\uDD25',
      'rockbound_bastion': '\uD83E\uDEA8',
      'sunflare_cannon': '\u2600\uFE0F',
      'ironspike_launcher': '\u2699\uFE0F',
      'frostcoil_tower': '\u2744\uFE0F',
      'pyrehold': '\uD83D\uDD36',
      'void_obelisk': '\uD83D\uDD2E',
      'stone_mortar': '\uD83D\uDCA3',
      'dread_pyre': '\uD83D\uDC80'
    };
    return emojis[towerId] || '\uD83C\uDFF0';
  }

  public updateGold(amount: number): void {
    this.currentGold = amount;
    this.updateCardPositions(false);
  }

  /**
   * Block/unblock tower placement interactions when modals are open
   */
  public setInteractionsBlocked(blocked: boolean): void {
    this.interactionsBlocked = blocked;

    // If a drag is in progress and we're now blocked, clean it up
    if (blocked && this.isDragging) {
      this.forceCleanupDrag();
    }
  }

  public updateGhostValidity(valid: boolean): void {
    if (!this.dragGhost || !this.dragTowerId) return;

    const range = this.dragGhost.getAt(0) as Phaser.GameObjects.Graphics;
    const config = TOWER_CONFIGS[this.dragTowerId];
    if (!range || !config) return;

    range.clear();
    if (valid) {
      range.fillStyle(0x44FF44, 0.12);
      range.fillCircle(0, 0, config.range);
      range.lineStyle(2, 0x44FF44, 0.4);
      range.strokeCircle(0, 0, config.range);
    } else {
      range.fillStyle(0xFF4444, 0.12);
      range.fillCircle(0, 0, config.range);
      range.lineStyle(2, 0xFF4444, 0.4);
      range.strokeCircle(0, 0, config.range);
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.isDragging) {
      this.forceCleanupDrag();
    }

    this.cardContainers = [];
    super.destroy(fromScene);
  }
}
