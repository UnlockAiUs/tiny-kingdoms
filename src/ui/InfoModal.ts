import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/game.config';
import { TOWER_CONFIGS, TowerConfig } from '../config/towers.config';
import { ENEMY_CONFIGS, EnemyConfig } from '../config/enemies.config';
import { DamageType, EnemyType, ENEMY_DAMAGE_MULTIPLIERS } from '../config/damage.config';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';

type TabType = 'towers' | 'enemies';

// Warm fantasy color palette
const COLORS = {
  // Backgrounds
  parchment: 0xF5E6C8,
  parchmentDark: 0xE8D4B0,
  parchmentLight: 0xFAF0DC,

  // Browns
  woodDark: 0x5D3A1A,
  woodMed: 0x8B5A2B,
  woodLight: 0xA67C52,
  leather: 0x6B4423,

  // Golds
  gold: 0xFFD700,
  goldDark: 0xC9A227,
  goldLight: 0xFFE55C,

  // Accent colors
  cream: 0xFFF8DC,
  tan: 0xD4B896,
  rust: 0xB85C38,

  // Text
  textDark: 0x3D2817,
  textMed: 0x5D4037,
  textLight: 0x8D7050,

  // Status colors
  healthRed: 0xC62828,
  speedGreen: 0x2E7D32,
  damageOrange: 0xEF6C00,
  rewardGold: 0xF9A825,

  // Type indicator colors
  vulnerable: 0x4CAF50,
  resistant: 0xE53935,
  neutral: 0x757575
};

export class InfoModal extends Phaser.GameObjects.Container {
  private overlay!: Phaser.GameObjects.Graphics;
  private modalBg!: Phaser.GameObjects.Graphics;
  private closeBtn!: Phaser.GameObjects.Container;
  private tabButtons: Map<TabType, Phaser.GameObjects.Container> = new Map();
  private currentTab: TabType = 'towers';
  private contentContainer!: Phaser.GameObjects.Container;
  private detailOverlay: Phaser.GameObjects.Container | null = null;

  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private contentMask!: Phaser.GameObjects.Graphics;
  private scrollZone!: Phaser.GameObjects.Zone;

  private isVisible: boolean = false;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private lastPointerY: number = 0;
  private pointerDownTime: number = 0;
  private readonly DRAG_THRESHOLD: number = 8; // pixels to move before considered a drag

  // Prevent card clicks immediately after tab switch or detail close
  private blockCardClicks: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(DEPTH_LAYERS.UI_ELEMENTS + 100);
    this.setVisible(false);

    this.createModal();

    // CRITICAL: Disable overlay interactivity initially since modal starts hidden
    // In Phaser, setVisible(false) doesn't disable interactivity!
    this.overlay.disableInteractive();

    scene.add.existing(this);
  }

  private createModal(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    // Dark overlay
    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, WIDTH, HEIGHT);
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.overlay.on('pointerdown', () => this.hide());
    this.add(this.overlay);

    // Modal dimensions - NEARLY FULLSCREEN for mobile readability
    const modalWidth = WIDTH - 20;
    const modalHeight = HEIGHT - 30;
    const modalX = 10;
    const modalY = 15;

    // Modal background with parchment style
    this.modalBg = this.scene.add.graphics();
    this.drawModalBackground(modalX, modalY, modalWidth, modalHeight);
    this.modalBg.setInteractive(
      new Phaser.Geom.Rectangle(modalX, modalY, modalWidth, modalHeight),
      Phaser.Geom.Rectangle.Contains
    );
    this.add(this.modalBg);

    // Header bar - matching the HUD style
    const headerBar = this.scene.add.graphics();
    // Shadow
    headerBar.fillStyle(0x000000, 0.3);
    headerBar.fillRoundedRect(modalX + 5, modalY + 5, modalWidth - 10, 75, { tl: 10, tr: 10, bl: 0, br: 0 });
    // Outer wood frame
    headerBar.fillStyle(COLORS.woodDark, 1);
    headerBar.fillRoundedRect(modalX, modalY, modalWidth, 75, { tl: 10, tr: 10, bl: 0, br: 0 });
    // Inner wood
    headerBar.fillStyle(COLORS.woodMed, 1);
    headerBar.fillRoundedRect(modalX + 4, modalY + 4, modalWidth - 8, 67, { tl: 8, tr: 8, bl: 0, br: 0 });
    // Gold trim at bottom
    headerBar.lineStyle(2, COLORS.goldDark, 0.6);
    headerBar.lineBetween(modalX + 10, modalY + 73, modalX + modalWidth - 10, modalY + 73);
    this.add(headerBar);

    // Title with Cinzel font - matching other UI
    const title = this.scene.add.text(WIDTH / 2, modalY + 38, 'CODEX', {
      fontSize: '38px',
      fontFamily: '"Cinzel", serif',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#3D2817',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.add(title);

    // Close button - styled to match
    this.closeBtn = this.createCloseButton(modalX + modalWidth - 50, modalY + 38);
    this.add(this.closeBtn);

    // Tabs
    this.createTabs(modalX, modalY + 85, modalWidth);

    // Content area with mask
    const contentY = modalY + 155;
    const contentHeight = modalHeight - 180;

    this.contentMask = this.scene.add.graphics();
    this.contentMask.fillStyle(0xffffff);
    this.contentMask.fillRect(modalX + 10, contentY, modalWidth - 20, contentHeight);

    this.contentContainer = this.scene.add.container(0, 0);
    this.contentContainer.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.contentMask));
    this.add(this.contentContainer);

    // Store dimensions for content
    this.setData('modalX', modalX);
    this.setData('modalY', modalY);
    this.setData('modalWidth', modalWidth);
    this.setData('modalHeight', modalHeight);
    this.setData('contentY', contentY);
    this.setData('contentHeight', contentHeight);

    // Setup scroll with touch support
    this.setupScroll(modalX, contentY, modalWidth, contentHeight);
  }

  private drawModalBackground(x: number, y: number, w: number, h: number): void {
    // Outer border (dark wood frame)
    this.modalBg.fillStyle(COLORS.woodDark, 1);
    this.modalBg.fillRoundedRect(x, y, w, h, 12);

    // Inner border (lighter wood)
    this.modalBg.fillStyle(COLORS.woodMed, 1);
    this.modalBg.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 10);

    // Parchment background
    this.modalBg.fillStyle(COLORS.parchment, 1);
    this.modalBg.fillRoundedRect(x + 8, y + 8, w - 16, h - 16, 8);

    // Gold trim line
    this.modalBg.lineStyle(2, COLORS.goldDark, 0.8);
    this.modalBg.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 9);
  }

  private createCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);
    const size = 28;

    const bg = this.scene.add.graphics();
    this.drawCloseButtonBg(bg, size, false);
    btn.add(bg);

    // Draw X icon
    const icon = this.scene.add.graphics();
    this.drawCloseIcon(icon);
    btn.add(icon);

    btn.setSize(size * 2 + 8, size * 2 + 8);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.hide());
    btn.on('pointerover', () => this.drawCloseButtonBg(bg, size, true));
    btn.on('pointerout', () => this.drawCloseButtonBg(bg, size, false));

    return btn;
  }

  private drawCloseButtonBg(bg: Phaser.GameObjects.Graphics, size: number, hover: boolean): void {
    bg.clear();
    if (hover) {
      bg.fillStyle(0xE53935, 1);
      bg.fillRoundedRect(-size - 2, -size - 2, size * 2 + 4, size * 2 + 4, 8);
      bg.fillStyle(0xEF5350, 1);
      bg.fillRoundedRect(-size + 1, -size + 1, size * 2 - 2, size * 2 - 2, 6);
    } else {
      bg.fillStyle(0xB71C1C, 1);
      bg.fillRoundedRect(-size, -size, size * 2, size * 2, 8);
      bg.fillStyle(0xC62828, 1);
      bg.fillRoundedRect(-size + 3, -size + 3, size * 2 - 6, size * 2 - 6, 6);
    }
    bg.lineStyle(2, 0x7f0000, 1);
    bg.strokeRoundedRect(-size, -size, size * 2, size * 2, 8);
  }

  private drawCloseIcon(gfx: Phaser.GameObjects.Graphics): void {
    gfx.lineStyle(4, 0xFFFFFF, 1);
    gfx.lineBetween(-10, -10, 10, 10);
    gfx.lineBetween(10, -10, -10, 10);
  }

  private createTabs(modalX: number, y: number, modalWidth: number): void {
    const tabs: { id: TabType; label: string }[] = [
      { id: 'towers', label: 'TOWERS' },
      { id: 'enemies', label: 'ENEMIES' }
    ];

    const tabWidth = (modalWidth - 50) / 2;
    const tabHeight = 55;

    tabs.forEach((tab, index) => {
      const x = modalX + 20 + index * (tabWidth + 10);
      const btn = this.scene.add.container(x + tabWidth / 2, y + tabHeight / 2);

      const bg = this.scene.add.graphics();
      btn.add(bg);

      const text = this.scene.add.text(0, 0, tab.label, {
        fontSize: '24px',
        fontFamily: '"Cinzel", serif',
        color: '#5D3A1A',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.add(text);

      btn.setSize(tabWidth, tabHeight);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.selectTab(tab.id));

      btn.setData('bg', bg);
      btn.setData('text', text);
      btn.setData('width', tabWidth);
      btn.setData('height', tabHeight);

      this.tabButtons.set(tab.id, btn);
      this.add(btn);
    });

    this.updateTabStyles();
  }

  private updateTabStyles(): void {
    this.tabButtons.forEach((btn, tabId) => {
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      const text = btn.getData('text') as Phaser.GameObjects.Text;
      const isActive = tabId === this.currentTab;
      const width = btn.getData('width') as number;
      const height = btn.getData('height') as number;

      bg.clear();
      if (isActive) {
        // Active tab - wood button style with gold highlight
        bg.fillStyle(COLORS.woodDark, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.fillStyle(COLORS.woodMed, 1);
        bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 6);
        // Gold top highlight
        bg.fillStyle(COLORS.goldDark, 0.4);
        bg.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height / 3, { tl: 5, tr: 5, bl: 0, br: 0 });
        bg.lineStyle(2, COLORS.goldDark, 0.8);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        text.setColor('#FFD700');
        text.setFontSize(26);
        text.setStroke('#3D2817', 2);
      } else {
        // Inactive tab - muted parchment
        bg.fillStyle(COLORS.parchmentDark, 0.8);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, COLORS.woodLight, 0.6);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        text.setColor('#8D7050');
        text.setFontSize(22);
        text.setStroke('#F5E6C8', 0);
      }
    });
  }

  private selectTab(tab: TabType): void {
    this.currentTab = tab;
    this.scrollY = 0;
    this.updateTabStyles();

    // Block card clicks briefly to prevent pointerup from triggering on newly created cards
    this.blockCardClicks = true;
    this.scene.time.delayedCall(100, () => {
      this.blockCardClicks = false;
    });

    this.renderContent();
  }

  private setupScroll(x: number, y: number, width: number, height: number): void {
    // Store scroll area bounds for hit testing
    this.setData('scrollAreaX', x);
    this.setData('scrollAreaY', y);
    this.setData('scrollAreaWidth', width);
    this.setData('scrollAreaHeight', height);

    // Create scroll zone but DON'T add it to container - just use for wheel events
    this.scrollZone = this.scene.add.zone(x + width / 2, y + height / 2, width, height);
    this.scrollZone.setInteractive();
    this.scrollZone.setDepth(DEPTH_LAYERS.UI_ELEMENTS + 99); // Below modal but still catches wheel
    // CRITICAL: Start disabled since modal starts hidden - will be enabled in show()
    this.scrollZone.disableInteractive();

    // Mouse wheel scroll - attach to scene input for reliability
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _dx: number, _dy: number, dz: number) => {
      if (!this.isVisible) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dz * 0.5, 0, this.maxScrollY);
      this.updateContentPosition();
    });

    // Touch/mouse drag scroll - use scene input directly
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isVisible) return;

      // Check if pointer is within scroll area
      if (this.isPointerInScrollArea(pointer)) {
        this.dragStartY = pointer.y;
        this.lastPointerY = pointer.y;
        this.pointerDownTime = Date.now();
        this.isDragging = false;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isVisible || this.pointerDownTime === 0) return;

      const deltaFromStart = Math.abs(pointer.y - this.dragStartY);

      // Only start dragging after moving past threshold
      if (deltaFromStart > this.DRAG_THRESHOLD) {
        this.isDragging = true;
      }

      // Only scroll if we're actually dragging
      if (this.isDragging) {
        const deltaY = this.lastPointerY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY, 0, this.maxScrollY);
        this.updateContentPosition();
      }

      this.lastPointerY = pointer.y;
    });

    this.scene.input.on('pointerup', () => {
      // Reset drag state with small delay to allow click events to check isDragging
      this.scene.time.delayedCall(10, () => {
        this.isDragging = false;
        this.pointerDownTime = 0;
      });
    });
  }

  private isPointerInScrollArea(pointer: Phaser.Input.Pointer): boolean {
    const x = this.getData('scrollAreaX') as number;
    const y = this.getData('scrollAreaY') as number;
    const width = this.getData('scrollAreaWidth') as number;
    const height = this.getData('scrollAreaHeight') as number;

    return pointer.x >= x && pointer.x <= x + width &&
           pointer.y >= y && pointer.y <= y + height;
  }

  /**
   * Check if a card container is within the visible content area.
   * This prevents clicks on cards that have scrolled outside the mask bounds
   * from blocking tabs/close button.
   */
  private isCardInVisibleArea(card: Phaser.GameObjects.Container): boolean {
    const contentY = this.getData('contentY') as number;
    const contentHeight = this.getData('contentHeight') as number;

    // Card's world Y position = card.y + contentContainer.y
    // (contentContainer is at -scrollY, card.y is the position set during creation)
    const cardWorldY = card.y + this.contentContainer.y;
    const cardHeight = card.height || 140; // Default card height

    // Card is visible if any part of it is within the content bounds
    const cardTop = cardWorldY;
    const cardBottom = cardWorldY + cardHeight;
    const contentBottom = contentY + contentHeight;

    return cardBottom > contentY && cardTop < contentBottom;
  }

  private updateContentPosition(): void {
    this.contentContainer.y = -this.scrollY;
  }

  private renderContent(): void {
    this.contentContainer.removeAll(true);

    if (this.currentTab === 'towers') {
      this.renderTowerCards();
    } else {
      this.renderEnemyCards();
    }
  }

  private renderTowerCards(): void {
    const modalX = this.getData('modalX') as number;
    const contentY = this.getData('contentY') as number;
    const modalWidth = this.getData('modalWidth') as number;
    const contentHeight = this.getData('contentHeight') as number;

    // MUCH larger cards for mobile - single column for better touch
    const cardWidth = modalWidth - 30;
    const cardHeight = 140; // MUCH larger
    const gap = 15;
    const startX = modalX + 15;

    // Add deployed towers summary at top
    let currentY = contentY + 10;
    const deployedStats = this.getDeployedTowerStats();

    if (deployedStats.totalCount > 0) {
      const summaryHeight = this.renderDeployedSummary(startX, currentY, cardWidth, deployedStats);
      currentY += summaryHeight + 15;
    }

    const towers = Object.values(TOWER_CONFIGS);

    towers.forEach((tower, index) => {
      const x = startX;
      const y = currentY + index * (cardHeight + gap);

      const card = this.createTowerCard(x, y, cardWidth, cardHeight, tower);
      this.contentContainer.add(card);
    });

    const totalContentHeight = (deployedStats.totalCount > 0 ? 80 : 0) + towers.length * (cardHeight + gap);
    this.maxScrollY = Math.max(0, totalContentHeight - contentHeight + 20);
  }

  private getDeployedTowerStats(): {
    totalCount: number;
    totalInvestment: number;
    byType: Map<string, { count: number; levels: number[] }>;
  } {
    const stats = {
      totalCount: 0,
      totalInvestment: 0,
      byType: new Map<string, { count: number; levels: number[] }>()
    };

    // Get towers from the scene (BattleScene stores them in 'towers' array)
    const battleScene = this.scene as any;
    const towers = battleScene.towers || [];

    for (const tower of towers) {
      stats.totalCount++;
      stats.totalInvestment += tower.totalInvested || tower.config.cost;

      const typeId = tower.config.id;
      if (!stats.byType.has(typeId)) {
        stats.byType.set(typeId, { count: 0, levels: [] });
      }
      const typeStats = stats.byType.get(typeId)!;
      typeStats.count++;
      typeStats.levels.push(tower.level || 1);
    }

    return stats;
  }

  private renderDeployedSummary(
    x: number,
    y: number,
    width: number,
    stats: { totalCount: number; totalInvestment: number; byType: Map<string, { count: number; levels: number[] }> }
  ): number {
    const container = this.scene.add.container(x, y);

    // Summary background
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.goldDark, 0.12);
    bg.fillRoundedRect(0, 0, width, 90, 8);
    bg.lineStyle(2, COLORS.goldDark, 0.3);
    bg.strokeRoundedRect(0, 0, width, 90, 8);
    container.add(bg);

    // Title
    const title = this.scene.add.text(15, 10, 'DEPLOYED', {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#C9A227',
      fontStyle: 'bold'
    });
    container.add(title);

    // Stats - two columns
    const countLabel = this.scene.add.text(15, 38, 'COUNT', {
      fontSize: '12px',
      fontFamily: '"Cinzel", serif',
      color: '#8D7050'
    });
    container.add(countLabel);

    const countValue = this.scene.add.text(15, 55, `${stats.totalCount}`, {
      fontSize: '26px',
      fontFamily: '"Cinzel", serif',
      color: '#5D3A1A',
      fontStyle: 'bold'
    });
    container.add(countValue);

    const investLabel = this.scene.add.text(100, 38, 'INVESTED', {
      fontSize: '12px',
      fontFamily: '"Cinzel", serif',
      color: '#8D7050'
    });
    container.add(investLabel);

    const investValue = this.scene.add.text(100, 55, `${stats.totalInvestment}`, {
      fontSize: '26px',
      fontFamily: '"Cinzel", serif',
      color: '#C9A227',
      fontStyle: 'bold'
    });
    container.add(investValue);

    // Level breakdown
    let level2Count = 0;
    let level3Count = 0;
    stats.byType.forEach(typeStats => {
      typeStats.levels.forEach(level => {
        if (level === 2) level2Count++;
        if (level === 3) level3Count++;
      });
    });

    if (level2Count > 0 || level3Count > 0) {
      const levelLabel = this.scene.add.text(220, 38, 'UPGRADES', {
        fontSize: '12px',
        fontFamily: '"Cinzel", serif',
        color: '#8D7050'
      });
      container.add(levelLabel);

      const levelValue = this.scene.add.text(220, 55, `Lv2: ${level2Count}  Lv3: ${level3Count}`, {
        fontSize: '18px',
        fontFamily: '"Cinzel", serif',
        color: '#5D4037'
      });
      container.add(levelValue);
    }

    this.contentContainer.add(container);

    return 90;
  }

  private createTowerCard(x: number, y: number, width: number, height: number, tower: TowerConfig): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);

    // Card background with parchment style
    const bg = this.scene.add.graphics();
    this.drawCardBackground(bg, 0, 0, width, height, COLORS.parchmentLight);
    card.add(bg);

    // Tower icon
    const iconSize = 90;
    if (this.scene.textures.exists(tower.iconKey)) {
      const icon = this.scene.add.image(iconSize / 2 + 12, height / 2, tower.iconKey);
      icon.setDisplaySize(iconSize, iconSize);
      card.add(icon);
    } else {
      const placeholder = this.scene.add.graphics();
      placeholder.fillStyle(this.getDamageTypeColor(tower.damageType), 0.8);
      placeholder.fillCircle(iconSize / 2 + 12, height / 2, iconSize / 2 - 5);
      placeholder.lineStyle(3, COLORS.woodMed, 1);
      placeholder.strokeCircle(iconSize / 2 + 12, height / 2, iconSize / 2 - 5);
      card.add(placeholder);
    }

    // Tower name
    const name = this.scene.add.text(iconSize + 25, 15, tower.name, {
      fontSize: '22px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold'
    });
    card.add(name);

    // Damage type badge
    const dmgColor = this.getDamageTypeColor(tower.damageType);
    const dmgBadge = this.scene.add.graphics();
    dmgBadge.fillStyle(dmgColor, 0.2);
    dmgBadge.fillRoundedRect(iconSize + 25, 45, 100, 26, 5);
    dmgBadge.lineStyle(1, dmgColor, 0.6);
    dmgBadge.strokeRoundedRect(iconSize + 25, 45, 100, 26, 5);
    card.add(dmgBadge);

    const dmgType = this.scene.add.text(iconSize + 75, 58, this.getDamageTypeName(tower.damageType), {
      fontSize: '16px',
      fontFamily: '"Cinzel", serif',
      color: `#${dmgColor.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);
    card.add(dmgType);

    // Stats row - clean labels without emojis
    const statsY = 85;
    const statsStyle = { fontSize: '14px', fontFamily: '"Cinzel", serif', color: '#8D7050' };
    const valueStyle = { fontSize: '20px', fontFamily: '"Cinzel", serif', fontStyle: 'bold' };

    // Cost
    const costLabel = this.scene.add.text(iconSize + 25, statsY, 'COST', statsStyle);
    card.add(costLabel);
    const costValue = this.scene.add.text(iconSize + 25, statsY + 16, `${tower.cost}`, { ...valueStyle, color: '#C9A227' });
    card.add(costValue);

    // Damage
    const dmgLabel = this.scene.add.text(iconSize + 100, statsY, 'DMG', statsStyle);
    card.add(dmgLabel);
    const dmgValue = this.scene.add.text(iconSize + 100, statsY + 16, `${tower.damage}`, { ...valueStyle, color: '#C62828' });
    card.add(dmgValue);

    // Range
    const rngLabel = this.scene.add.text(iconSize + 165, statsY, 'RNG', statsStyle);
    card.add(rngLabel);
    const rngValue = this.scene.add.text(iconSize + 165, statsY + 16, `${tower.range}`, { ...valueStyle, color: '#2E7D32' });
    card.add(rngValue);

    // Tap indicator - drawn arrow
    const tapArrow = this.scene.add.graphics();
    tapArrow.fillStyle(0xA67C52, 1);
    tapArrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
    card.add(tapArrow);
    card.setData('tapArrow', tapArrow);

    // Make interactive - use custom hit callback that respects visible scroll area
    const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
    card.setInteractive(hitArea, (area: Phaser.Geom.Rectangle, x: number, y: number) => {
      // First check if point is within the hit area
      if (!Phaser.Geom.Rectangle.Contains(area, x, y)) return false;
      // Then check if card is within visible scroll area
      return this.isCardInVisibleArea(card);
    });

    // Use pointerup for tap detection - more reliable than pointerdown
    card.on('pointerup', () => {
      // Only trigger if we weren't dragging and card clicks aren't blocked
      if (!this.isDragging && !this.blockCardClicks) {
        this.showTowerDetail(tower);
      }
    });

    card.on('pointerover', () => {
      if (!this.isDragging) {
        bg.clear();
        this.drawCardBackground(bg, 0, 0, width, height, COLORS.cream, true);
        const arrow = card.getData('tapArrow') as Phaser.GameObjects.Graphics;
        arrow.clear();
        arrow.fillStyle(0x5D3A1A, 1);
        arrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
      }
    });

    card.on('pointerout', () => {
      bg.clear();
      this.drawCardBackground(bg, 0, 0, width, height, COLORS.parchmentLight);
      const arrow = card.getData('tapArrow') as Phaser.GameObjects.Graphics;
      arrow.clear();
      arrow.fillStyle(0xA67C52, 1);
      arrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
    });

    return card;
  }

  private renderEnemyCards(): void {
    const modalX = this.getData('modalX') as number;
    const contentY = this.getData('contentY') as number;
    const modalWidth = this.getData('modalWidth') as number;
    const contentHeight = this.getData('contentHeight') as number;

    // MUCH larger single column for mobile
    const cardWidth = modalWidth - 30;
    const cardHeight = 140; // MUCH larger
    const gap = 15;
    const startX = modalX + 15;

    const enemies = Object.values(ENEMY_CONFIGS);

    enemies.forEach((enemy, index) => {
      const x = startX;
      const y = contentY + index * (cardHeight + gap) + 10;

      const card = this.createEnemyCard(x, y, cardWidth, cardHeight, enemy);
      this.contentContainer.add(card);
    });

    this.maxScrollY = Math.max(0, enemies.length * (cardHeight + gap) - contentHeight + 20);
  }

  private createEnemyCard(x: number, y: number, width: number, height: number, enemy: EnemyConfig): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);

    // Determine card accent color based on tier
    const tierColor = this.getEnemyTierAccent(enemy);

    // Card background
    const bg = this.scene.add.graphics();
    this.drawCardBackground(bg, 0, 0, width, height, COLORS.parchmentLight, false, tierColor);
    card.add(bg);

    // Enemy sprite
    const iconSize = 90;
    if (this.scene.textures.exists(enemy.spriteKey)) {
      const sprite = this.scene.add.sprite(iconSize / 2 + 12, height / 2, enemy.spriteKey, 0);
      sprite.setDisplaySize(iconSize, iconSize);
      card.add(sprite);

      // Play walk animation
      const walkAnim = `${enemy.spriteKey}_walk`;
      if (this.scene.anims.exists(walkAnim)) {
        sprite.play(walkAnim);
      }
    } else {
      const placeholder = this.scene.add.graphics();
      placeholder.fillStyle(tierColor, 0.6);
      placeholder.fillCircle(iconSize / 2 + 12, height / 2, iconSize / 2 - 5);
      card.add(placeholder);
    }

    // Enemy name
    const name = this.scene.add.text(iconSize + 25, 15, enemy.name, {
      fontSize: '22px',
      fontFamily: '"Cinzel", serif',
      color: '#3D2817',
      fontStyle: 'bold'
    });
    card.add(name);

    // Types as badges
    const types = enemy.enemyTypes.slice(0, 2);
    types.forEach((type, i) => {
      const badgeX = iconSize + 25 + i * 85;
      const badge = this.scene.add.graphics();
      badge.fillStyle(COLORS.tan, 0.6);
      badge.fillRoundedRect(badgeX, 45, 80, 24, 5);
      badge.lineStyle(1, COLORS.woodLight, 0.8);
      badge.strokeRoundedRect(badgeX, 45, 80, 24, 5);
      card.add(badge);

      const typeText = this.scene.add.text(badgeX + 40, 57, this.getEnemyTypeName(type), {
        fontSize: '14px',
        fontFamily: '"Cinzel", serif',
        color: '#5D4037'
      }).setOrigin(0.5);
      card.add(typeText);
    });

    // Stats row - clean labels without emojis
    const statsY = 85;
    const statsStyle = { fontSize: '14px', fontFamily: '"Cinzel", serif', color: '#8D7050' };
    const valueStyle = { fontSize: '20px', fontFamily: '"Cinzel", serif', fontStyle: 'bold' };

    // Health
    const hpLabel = this.scene.add.text(iconSize + 25, statsY, 'HP', statsStyle);
    card.add(hpLabel);
    const hpValue = this.scene.add.text(iconSize + 25, statsY + 16, `${enemy.health}`, { ...valueStyle, color: '#C62828' });
    card.add(hpValue);

    // Speed
    const spdLabel = this.scene.add.text(iconSize + 100, statsY, 'SPD', statsStyle);
    card.add(spdLabel);
    const spdValue = this.scene.add.text(iconSize + 100, statsY + 16, `${enemy.speed}`, { ...valueStyle, color: '#2E7D32' });
    card.add(spdValue);

    // Wave
    const waveLabel = this.scene.add.text(iconSize + 175, statsY, 'WAVE', statsStyle);
    card.add(waveLabel);
    const waveValue = this.scene.add.text(iconSize + 175, statsY + 16, `${enemy.unlockWave}+`, { ...valueStyle, color: '#5D4037' });
    card.add(waveValue);

    // Tap indicator - drawn arrow
    const tapArrow = this.scene.add.graphics();
    tapArrow.fillStyle(0xA67C52, 1);
    tapArrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
    card.add(tapArrow);
    card.setData('tapArrow', tapArrow);

    // Make interactive - use custom hit callback that respects visible scroll area
    const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
    card.setInteractive(hitArea, (area: Phaser.Geom.Rectangle, x: number, y: number) => {
      // First check if point is within the hit area
      if (!Phaser.Geom.Rectangle.Contains(area, x, y)) return false;
      // Then check if card is within visible scroll area
      return this.isCardInVisibleArea(card);
    });

    // Use pointerup for tap detection - more reliable than pointerdown
    card.on('pointerup', () => {
      // Only trigger if we weren't dragging and card clicks aren't blocked
      if (!this.isDragging && !this.blockCardClicks) {
        this.showEnemyDetail(enemy);
      }
    });

    card.on('pointerover', () => {
      if (!this.isDragging) {
        bg.clear();
        this.drawCardBackground(bg, 0, 0, width, height, COLORS.cream, true, tierColor);
        const arrow = card.getData('tapArrow') as Phaser.GameObjects.Graphics;
        arrow.clear();
        arrow.fillStyle(0x5D3A1A, 1);
        arrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
      }
    });

    card.on('pointerout', () => {
      bg.clear();
      this.drawCardBackground(bg, 0, 0, width, height, COLORS.parchmentLight, false, tierColor);
      const arrow = card.getData('tapArrow') as Phaser.GameObjects.Graphics;
      arrow.clear();
      arrow.fillStyle(0xA67C52, 1);
      arrow.fillTriangle(width - 30, height / 2 - 10, width - 30, height / 2 + 10, width - 15, height / 2);
    });

    return card;
  }

  private drawCardBackground(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor: number,
    isHover: boolean = false,
    accentColor?: number
  ): void {
    // Card shadow
    graphics.fillStyle(0x000000, 0.1);
    graphics.fillRoundedRect(x + 3, y + 3, w, h, 10);

    // Main card background
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(x, y, w, h, 10);

    // Border
    const borderColor = isHover ? COLORS.gold : (accentColor || COLORS.woodLight);
    graphics.lineStyle(isHover ? 3 : 2, borderColor, 1);
    graphics.strokeRoundedRect(x, y, w, h, 10);

    // Left accent stripe if tier color provided
    if (accentColor) {
      graphics.fillStyle(accentColor, 0.8);
      graphics.fillRoundedRect(x, y, 6, h, { tl: 10, bl: 10, tr: 0, br: 0 });
    }
  }

  private showTowerDetail(tower: TowerConfig): void {
    if (this.detailOverlay) {
      this.detailOverlay.destroy();
    }

    // Disable background interactions while detail is shown
    this.disableBackgroundInteractions();

    const { WIDTH, HEIGHT } = GAME_CONFIG;
    // MUCH larger detail modal - nearly fullscreen for mobile
    const detailWidth = WIDTH - 30;
    const detailHeight = HEIGHT - 50;
    const detailX = 15;
    const detailY = 25;

    // Create detail overlay as a separate scene object with very high depth
    // This ensures it appears above everything and blocks all interactions
    const container = this.scene.add.container(0, 0);
    container.setDepth(DEPTH_LAYERS.UI_ELEMENTS + 200); // Very high depth
    this.detailOverlay = container;

    // Overlay background - blocks all interactions behind it
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT), Phaser.Geom.Rectangle.Contains);
    overlay.on('pointerup', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.hideDetail();
    });
    container.add(overlay);

    // Detail panel - parchment style - stop propagation on panel clicks
    const panel = this.scene.add.graphics();
    this.drawDetailPanel(panel, detailX, detailY, detailWidth, detailHeight);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(detailX, detailY, detailWidth, detailHeight),
      Phaser.Geom.Rectangle.Contains
    );
    panel.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    container.add(panel);

    // Close button - LARGER
    const closeBtn = this.createDetailCloseButton(detailX + detailWidth - 45, detailY + 45);
    container.add(closeBtn);

    // Tower icon - MUCH larger
    const iconSize = 130;
    if (this.scene.textures.exists(tower.iconKey)) {
      const icon = this.scene.add.image(detailX + 80, detailY + 100, tower.iconKey);
      icon.setDisplaySize(iconSize, iconSize);
      container.add(icon);
    }

    // Tower name - MUCH larger
    const name = this.scene.add.text(detailX + 160, detailY + 40, tower.name, {
      fontSize: '28px',
      fontFamily: '"Cinzel", serif',
      fontStyle: 'bold',
      color: '#3D2817',
      stroke: '#F5E6C8',
      strokeThickness: 1
    });
    container.add(name);

    // Role - larger
    const role = this.scene.add.text(detailX + 160, detailY + 78, tower.role, {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#8D7050'
    });
    container.add(role);

    // Description - larger
    const desc = this.scene.add.text(detailX + 160, detailY + 110, tower.description, {
      fontSize: '16px',
      fontFamily: '"Cinzel", serif',
      color: '#5D4037',
      wordWrap: { width: detailWidth - 200 }
    });
    container.add(desc);

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(3, COLORS.goldDark, 0.5);
    divider.lineBetween(detailX + 20, detailY + 175, detailX + detailWidth - 20, detailY + 175);
    container.add(divider);

    // Stats section - larger spacing
    let statsY = detailY + 195;

    this.addSectionHeader(container, detailX + 20, statsY, 'STATS');
    statsY += 40;

    const stats = [
      { label: 'Damage', value: `${tower.damage}`, color: COLORS.healthRed },
      { label: 'Range', value: `${tower.range}px`, color: COLORS.speedGreen },
      { label: 'Fire Rate', value: `${(1000 / tower.fireRate).toFixed(1)}/s`, color: COLORS.damageOrange },
      { label: 'Cost', value: `${tower.cost} gold`, color: COLORS.rewardGold }
    ];

    stats.forEach((stat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const statX = detailX + 20 + col * (detailWidth / 2 - 20);
      const statY = statsY + row * 40;

      const label = this.scene.add.text(statX, statY, `${stat.label}:`, {
        fontSize: '18px',
        fontFamily: '"Cinzel", serif',
        color: '#8D7050'
      });
      container.add(label);

      const value = this.scene.add.text(statX + 120, statY, stat.value, {
        fontSize: '20px',
        fontFamily: '"Cinzel", serif',
        fontStyle: 'bold',
        color: `#${stat.color.toString(16).padStart(6, '0')}`
      });
      container.add(value);
    });
    statsY += 95;

    // Damage type section
    this.addSectionHeader(container, detailX + 20, statsY, 'DAMAGE TYPE');
    statsY += 38;

    const dmgTypeBadge = this.createTypeBadgeLarge(
      this.getDamageTypeName(tower.damageType),
      this.getDamageTypeColor(tower.damageType),
      detailX + 20,
      statsY
    );
    container.add(dmgTypeBadge);

    if (tower.secondaryDamageType) {
      const secBadge = this.createTypeBadgeLarge(
        this.getDamageTypeName(tower.secondaryDamageType),
        this.getDamageTypeColor(tower.secondaryDamageType),
        detailX + 160,
        statsY
      );
      container.add(secBadge);
    }
    statsY += 55;

    // Strong against - visual badges for mobile readability
    if (tower.strongAgainst.length > 0) {
      this.addSectionHeader(container, detailX + 20, statsY, 'STRONG AGAINST', COLORS.vulnerable);
      statsY += 38;

      const badgeWidth = (detailWidth - 60) / 2;
      const badgeHeight = 44;
      tower.strongAgainst.forEach((enemy, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const badgeX = detailX + 20 + col * (badgeWidth + 10);
        const badgeY = statsY + row * (badgeHeight + 8);

        const badge = this.scene.add.graphics();
        badge.fillStyle(0x2E7D32, 0.15);
        badge.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        badge.lineStyle(3, 0x2E7D32, 0.9);
        badge.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        container.add(badge);

        const label = this.scene.add.text(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2, enemy, {
          fontSize: '20px',
          fontFamily: '"Cinzel", serif',
          fontStyle: 'bold',
          color: '#1B5E20'
        }).setOrigin(0.5);
        container.add(label);
      });
      statsY += Math.ceil(tower.strongAgainst.length / 2) * (badgeHeight + 8) + 16;
    }

    // Weak against - visual badges for mobile readability
    if (tower.weakAgainst.length > 0) {
      this.addSectionHeader(container, detailX + 20, statsY, 'WEAK AGAINST', COLORS.resistant);
      statsY += 38;

      const badgeWidth = (detailWidth - 60) / 2;
      const badgeHeight = 44;
      tower.weakAgainst.forEach((enemy, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const badgeX = detailX + 20 + col * (badgeWidth + 10);
        const badgeY = statsY + row * (badgeHeight + 8);

        const badge = this.scene.add.graphics();
        badge.fillStyle(0xC62828, 0.15);
        badge.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        badge.lineStyle(3, 0xC62828, 0.9);
        badge.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        container.add(badge);

        const label = this.scene.add.text(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2, enemy, {
          fontSize: '20px',
          fontFamily: '"Cinzel", serif',
          fontStyle: 'bold',
          color: '#B71C1C'
        }).setOrigin(0.5);
        container.add(label);
      });
      statsY += Math.ceil(tower.weakAgainst.length / 2) * (badgeHeight + 8) + 16;
    }

    // Special ability
    if (tower.special) {
      this.addSectionHeader(container, detailX + 20, statsY, 'SPECIAL ABILITY', 0x7B1FA2);
      statsY += 32;

      const specialDesc = this.getSpecialDescription(tower.special);
      const specialText = this.scene.add.text(detailX + 20, statsY, specialDesc, {
        fontSize: '16px',
        fontFamily: '"Cinzel", serif',
        color: '#7B1FA2',
        wordWrap: { width: detailWidth - 40 }
      });
      container.add(specialText);
    }
  }

  private showEnemyDetail(enemy: EnemyConfig): void {
    if (this.detailOverlay) {
      this.detailOverlay.destroy();
    }

    // Disable background interactions while detail is shown
    this.disableBackgroundInteractions();

    const { WIDTH, HEIGHT } = GAME_CONFIG;
    // MUCH larger detail modal - nearly fullscreen for mobile
    const detailWidth = WIDTH - 30;
    const detailHeight = HEIGHT - 50;
    const detailX = 15;
    const detailY = 25;

    // Create detail overlay as a separate scene object with very high depth
    // This ensures it appears above everything and blocks all interactions
    const container = this.scene.add.container(0, 0);
    container.setDepth(DEPTH_LAYERS.UI_ELEMENTS + 200); // Very high depth
    this.detailOverlay = container;

    // Overlay background - blocks all interactions behind it
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, WIDTH, HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, WIDTH, HEIGHT), Phaser.Geom.Rectangle.Contains);
    overlay.on('pointerup', (_ptr: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.hideDetail();
    });
    container.add(overlay);

    // Detail panel - stop propagation on panel clicks
    const tierColor = this.getEnemyTierAccent(enemy);
    const panel = this.scene.add.graphics();
    this.drawDetailPanel(panel, detailX, detailY, detailWidth, detailHeight, tierColor);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(detailX, detailY, detailWidth, detailHeight),
      Phaser.Geom.Rectangle.Contains
    );
    panel.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    container.add(panel);

    // Close button - LARGER
    const closeBtn = this.createDetailCloseButton(detailX + detailWidth - 45, detailY + 45);
    container.add(closeBtn);

    // Enemy sprite - MUCH larger and animated
    const iconSize = 130;
    if (this.scene.textures.exists(enemy.spriteKey)) {
      const sprite = this.scene.add.sprite(detailX + 80, detailY + 100, enemy.spriteKey, 0);
      sprite.setDisplaySize(iconSize, iconSize);
      container.add(sprite);

      const walkAnim = `${enemy.spriteKey}_walk`;
      if (this.scene.anims.exists(walkAnim)) {
        sprite.play(walkAnim);
      }
    }

    // Enemy name - MUCH larger
    const name = this.scene.add.text(detailX + 160, detailY + 40, enemy.name, {
      fontSize: '28px',
      fontFamily: '"Cinzel", serif',
      fontStyle: 'bold',
      color: '#3D2817',
      stroke: '#F5E6C8',
      strokeThickness: 1
    });
    container.add(name);

    // Types as badges - larger
    enemy.enemyTypes.forEach((type, i) => {
      const badge = this.createTypeBadgeLarge(
        this.getEnemyTypeName(type),
        COLORS.tan,
        detailX + 160 + i * 130,
        detailY + 78
      );
      container.add(badge);
    });

    // Wave unlock - larger
    const waveBadge = this.scene.add.text(detailX + 160, detailY + 125, `Appears: Wave ${enemy.unlockWave}+`, {
      fontSize: '16px',
      fontFamily: '"Cinzel", serif',
      color: '#8D7050'
    });
    container.add(waveBadge);

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(3, tierColor, 0.5);
    divider.lineBetween(detailX + 20, detailY + 175, detailX + detailWidth - 20, detailY + 175);
    container.add(divider);

    // Stats section - larger spacing
    let statsY = detailY + 195;

    this.addSectionHeader(container, detailX + 20, statsY, 'STATS');
    statsY += 40;

    const stats = [
      { label: 'Health', value: `${enemy.health}`, color: COLORS.healthRed },
      { label: 'Speed', value: `${enemy.speed}`, color: COLORS.speedGreen },
      { label: 'Damage', value: `${enemy.damage}`, color: COLORS.damageOrange },
      { label: 'Reward', value: `${enemy.reward} gold`, color: COLORS.rewardGold }
    ];

    stats.forEach((stat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const statX = detailX + 20 + col * (detailWidth / 2 - 20);
      const statY = statsY + row * 40;

      const label = this.scene.add.text(statX, statY, `${stat.label}:`, {
        fontSize: '18px',
        fontFamily: '"Cinzel", serif',
        color: '#8D7050'
      });
      container.add(label);

      const value = this.scene.add.text(statX + 110, statY, stat.value, {
        fontSize: '20px',
        fontFamily: '"Cinzel", serif',
        fontStyle: 'bold',
        color: `#${stat.color.toString(16).padStart(6, '0')}`
      });
      container.add(value);
    });
    statsY += 95;

    // Vulnerabilities section - display as large visual badges for mobile
    const vulnerabilities = this.getVulnerabilities(enemy.enemyTypes);
    this.addSectionHeader(container, detailX + 20, statsY, 'WEAK TO', COLORS.vulnerable);
    statsY += 38;

    if (vulnerabilities.length > 0) {
      // Display as badge grid - 2 per row with color coding
      const badgeWidth = (detailWidth - 60) / 2;
      const badgeHeight = 44;
      vulnerabilities.forEach((vuln, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const badgeX = detailX + 20 + col * (badgeWidth + 10);
        const badgeY = statsY + row * (badgeHeight + 8);

        // Badge background with green for weakness
        const badge = this.scene.add.graphics();
        badge.fillStyle(0x2E7D32, 0.15);
        badge.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        badge.lineStyle(3, 0x2E7D32, 0.9);
        badge.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        container.add(badge);

        // Badge text - large and readable
        const vulnLabel = this.scene.add.text(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2, vuln, {
          fontSize: '20px',
          fontFamily: '"Cinzel", serif',
          fontStyle: 'bold',
          color: '#1B5E20'
        }).setOrigin(0.5);
        container.add(vulnLabel);
      });
      statsY += Math.ceil(vulnerabilities.length / 2) * (badgeHeight + 8) + 16;
    } else {
      const noVuln = this.scene.add.text(detailX + 20, statsY, 'No specific weaknesses', {
        fontSize: '18px',
        fontFamily: '"Cinzel", serif',
        color: '#8D7050',
        fontStyle: 'italic'
      });
      container.add(noVuln);
      statsY += 42;
    }

    // Resistances section - display as large visual badges
    const resistances = this.getResistances(enemy.enemyTypes);
    this.addSectionHeader(container, detailX + 20, statsY, 'RESISTANT TO', COLORS.resistant);
    statsY += 38;

    if (resistances.length > 0) {
      // Display as badge grid - 2 per row
      const badgeWidth = (detailWidth - 60) / 2;
      const badgeHeight = 44;
      resistances.forEach((res, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const badgeX = detailX + 20 + col * (badgeWidth + 10);
        const badgeY = statsY + row * (badgeHeight + 8);

        // Badge background with red for resistance
        const badge = this.scene.add.graphics();
        badge.fillStyle(0xC62828, 0.15);
        badge.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        badge.lineStyle(3, 0xC62828, 0.9);
        badge.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        container.add(badge);

        // Badge text - large and readable
        const resLabel = this.scene.add.text(badgeX + badgeWidth / 2, badgeY + badgeHeight / 2, res, {
          fontSize: '20px',
          fontFamily: '"Cinzel", serif',
          fontStyle: 'bold',
          color: '#B71C1C'
        }).setOrigin(0.5);
        container.add(resLabel);
      });
      statsY += Math.ceil(resistances.length / 2) * (badgeHeight + 8) + 16;
    } else {
      const noRes = this.scene.add.text(detailX + 20, statsY, 'No specific resistances', {
        fontSize: '18px',
        fontFamily: '"Cinzel", serif',
        color: '#8D7050',
        fontStyle: 'italic'
      });
      container.add(noRes);
      statsY += 42;
    }

    // Abilities
    if (enemy.abilities) {
      this.addSectionHeader(container, detailX + 20, statsY, 'SPECIAL ABILITY', 0x7B1FA2);
      statsY += 32;

      const abilityDesc = this.getAbilityDescription(enemy.abilities);
      const abilityText = this.scene.add.text(detailX + 20, statsY, abilityDesc, {
        fontSize: '16px',
        fontFamily: '"Cinzel", serif',
        color: '#7B1FA2',
        wordWrap: { width: detailWidth - 40 }
      });
      container.add(abilityText);
    }
  }

  private drawDetailPanel(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    accentColor: number = COLORS.goldDark
  ): void {
    // Shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillRoundedRect(x + 5, y + 5, w, h, 12);

    // Outer frame
    graphics.fillStyle(COLORS.woodDark, 1);
    graphics.fillRoundedRect(x, y, w, h, 12);

    // Inner frame
    graphics.fillStyle(COLORS.woodMed, 1);
    graphics.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 10);

    // Parchment
    graphics.fillStyle(COLORS.parchment, 1);
    graphics.fillRoundedRect(x + 8, y + 8, w - 16, h - 16, 8);

    // Accent trim
    graphics.lineStyle(2, accentColor, 0.8);
    graphics.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 9);
  }

  private addSectionHeader(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    color: number = COLORS.woodDark
  ): void {
    const header = this.scene.add.text(x, y, text, {
      fontSize: '20px',
      fontFamily: '"Cinzel", serif',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`
    });
    container.add(header);
  }

  // Type badge for detail modals
  private createTypeBadgeLarge(text: string, bgColor: number, x: number, y: number): Phaser.GameObjects.Container {
    const badge = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(bgColor, 0.4);
    bg.fillRoundedRect(0, 0, 120, 36, 8);
    bg.lineStyle(2, bgColor, 0.8);
    bg.strokeRoundedRect(0, 0, 120, 36, 8);
    badge.add(bg);

    const label = this.scene.add.text(60, 18, text, {
      fontSize: '18px',
      fontFamily: '"Cinzel", serif',
      color: '#5D4037'
    }).setOrigin(0.5);
    badge.add(label);

    return badge;
  }

  // Close button for detail modals - stops propagation, matches main close button style
  private createDetailCloseButton(x: number, y: number): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);
    const size = 28;

    const bg = this.scene.add.graphics();
    this.drawDetailCloseButtonBg(bg, size, false);
    btn.add(bg);

    // Draw X icon
    const icon = this.scene.add.graphics();
    icon.lineStyle(4, 0xFFFFFF, 1);
    icon.lineBetween(-10, -10, 10, 10);
    icon.lineBetween(10, -10, -10, 10);
    btn.add(icon);

    btn.setSize(size * 2 + 8, size * 2 + 8);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerup', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.hideDetail();
    });

    btn.on('pointerover', () => this.drawDetailCloseButtonBg(bg, size, true));
    btn.on('pointerout', () => this.drawDetailCloseButtonBg(bg, size, false));

    return btn;
  }

  private drawDetailCloseButtonBg(bg: Phaser.GameObjects.Graphics, size: number, hover: boolean): void {
    bg.clear();
    if (hover) {
      bg.fillStyle(0xE53935, 1);
      bg.fillRoundedRect(-size - 2, -size - 2, size * 2 + 4, size * 2 + 4, 8);
      bg.fillStyle(0xEF5350, 1);
      bg.fillRoundedRect(-size + 1, -size + 1, size * 2 - 2, size * 2 - 2, 6);
    } else {
      bg.fillStyle(0xB71C1C, 1);
      bg.fillRoundedRect(-size, -size, size * 2, size * 2, 8);
      bg.fillStyle(0xC62828, 1);
      bg.fillRoundedRect(-size + 3, -size + 3, size * 2 - 6, size * 2 - 6, 6);
    }
    bg.lineStyle(2, 0x7f0000, 1);
    bg.strokeRoundedRect(-size, -size, size * 2, size * 2, 8);
  }

  private hideDetail(): void {
    if (this.detailOverlay) {
      this.detailOverlay.destroy();
      this.detailOverlay = null;
    }

    // Block card clicks briefly to prevent the same click from triggering on cards below
    this.blockCardClicks = true;
    this.scene.time.delayedCall(100, () => {
      this.blockCardClicks = false;
    });

    // Re-enable background interactions
    this.enableBackgroundInteractions();
  }

  /**
   * Disable interactions on background elements when showing detail modal
   */
  private disableBackgroundInteractions(): void {
    // Disable scroll zone
    this.scrollZone.disableInteractive();

    // Disable main overlay (prevents closing parent modal)
    this.overlay.disableInteractive();

    // Disable modal background
    this.modalBg.disableInteractive();

    // Disable tab buttons
    this.tabButtons.forEach(btn => btn.disableInteractive());

    // Disable close button
    this.closeBtn.disableInteractive();
  }

  /**
   * Re-enable interactions on background elements when hiding detail modal
   */
  private enableBackgroundInteractions(): void {
    // Re-enable scroll zone
    this.scrollZone.setInteractive();

    // Re-enable main overlay
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    // Re-enable modal background
    const modalX = this.getData('modalX') as number;
    const modalY = this.getData('modalY') as number;
    const modalWidth = this.getData('modalWidth') as number;
    const modalHeight = this.getData('modalHeight') as number;
    this.modalBg.setInteractive(
      new Phaser.Geom.Rectangle(modalX, modalY, modalWidth, modalHeight),
      Phaser.Geom.Rectangle.Contains
    );

    // Re-enable tab buttons
    this.tabButtons.forEach(btn => btn.setInteractive({ useHandCursor: true }));

    // Re-enable close button
    this.closeBtn.setInteractive({ useHandCursor: true });
  }

  private getDamageTypeName(type: DamageType): string {
    const names: Record<DamageType, string> = {
      [DamageType.PHYSICAL]: 'Physical',
      [DamageType.FIRE]: 'Fire',
      [DamageType.ICE]: 'Ice',
      [DamageType.PIERCE]: 'Pierce',
      [DamageType.LIGHT]: 'Light',
      [DamageType.VOID]: 'Void'
    };
    return names[type] || 'Unknown';
  }

  private getDamageTypeColor(type: DamageType): number {
    const colors: Record<DamageType, number> = {
      [DamageType.PHYSICAL]: 0x8B7355,
      [DamageType.FIRE]: 0xE65100,
      [DamageType.ICE]: 0x0288D1,
      [DamageType.PIERCE]: 0x8D6E63,
      [DamageType.LIGHT]: 0xFBC02D,
      [DamageType.VOID]: 0x7B1FA2
    };
    return colors[type] || 0x8D7050;
  }

  private getEnemyTypeName(type: EnemyType): string {
    const names: Record<EnemyType, string> = {
      [EnemyType.SWARM]: 'Swarm',
      [EnemyType.ARMORED]: 'Armored',
      [EnemyType.FLYING]: 'Flying',
      [EnemyType.BOSS]: 'Boss',
      [EnemyType.UNDEAD]: 'Undead',
      [EnemyType.BEAST]: 'Beast',
      [EnemyType.HUMANOID]: 'Humanoid',
      [EnemyType.ELEMENTAL]: 'Elemental',
      [EnemyType.DEMON]: 'Demon',
      [EnemyType.DRAGON]: 'Dragon',
      [EnemyType.AQUATIC]: 'Aquatic',
      [EnemyType.TANK]: 'Tank',
      [EnemyType.CONSTRUCT]: 'Construct'
    };
    return names[type] || 'Unknown';
  }

  private getEnemyTierAccent(enemy: EnemyConfig): number {
    const isBoss = enemy.enemyTypes.includes(EnemyType.BOSS);

    if (isBoss) {
      return 0xB71C1C; // Deep red for bosses
    }

    if (enemy.unlockWave >= 10) {
      return 0x7B1FA2; // Purple for late-game
    }

    if (enemy.unlockWave >= 5) {
      return 0x0D47A1; // Blue for mid-game
    }

    return COLORS.woodLight; // Default brown
  }

  /**
   * Calculate NET vulnerability for multi-type enemies.
   * Uses same averaging logic as the actual damage calculation.
   */
  private getVulnerabilities(enemyTypes: EnemyType[]): string[] {
    const vulnerabilities: string[] = [];
    const damageTypes = [DamageType.FIRE, DamageType.PHYSICAL, DamageType.ICE, DamageType.LIGHT, DamageType.PIERCE, DamageType.VOID];

    for (const damageType of damageTypes) {
      const netMultiplier = this.calculateNetMultiplier(enemyTypes, damageType);
      // Only show as vulnerability if NET effect is > 1.1 (meaningful weakness)
      if (netMultiplier > 1.1) {
        const bonus = Math.round((netMultiplier - 1) * 100);
        vulnerabilities.push(`${this.getDamageTypeName(damageType)} (+${bonus}%)`);
      }
    }

    return vulnerabilities;
  }

  /**
   * Calculate NET resistance for multi-type enemies.
   * Uses same averaging logic as the actual damage calculation.
   */
  private getResistances(enemyTypes: EnemyType[]): string[] {
    const resistances: string[] = [];
    const damageTypes = [DamageType.FIRE, DamageType.PHYSICAL, DamageType.ICE, DamageType.LIGHT, DamageType.PIERCE, DamageType.VOID];

    for (const damageType of damageTypes) {
      const netMultiplier = this.calculateNetMultiplier(enemyTypes, damageType);
      // Only show as resistance if NET effect is < 0.9 (meaningful resistance)
      if (netMultiplier < 0.9) {
        const reduction = Math.round((1 - netMultiplier) * 100);
        resistances.push(`${this.getDamageTypeName(damageType)} (-${reduction}%)`);
      }
    }

    return resistances;
  }

  /**
   * Calculate net damage multiplier for a damage type across all enemy types.
   * Mirrors the logic in damage.config.ts calculateEffectiveDamage.
   */
  private calculateNetMultiplier(enemyTypes: EnemyType[], damageType: DamageType): number {
    if (enemyTypes.length === 0) return 1.0;

    let best = 1.0;
    let worst = 1.0;

    for (const enemyType of enemyTypes) {
      const multipliers = ENEMY_DAMAGE_MULTIPLIERS[enemyType];
      if (!multipliers) continue;

      const mult = multipliers[damageType] ?? 1.0;
      if (mult > best) best = mult;
      if (mult < worst) worst = mult;
    }

    // For multi-type enemies, average best and worst (same as damage calc)
    return enemyTypes.length > 1 ? (best + worst) / 2 : best;
  }

  private getSpecialDescription(special: TowerConfig['special']): string {
    if (!special) return '';

    switch (special.type) {
      case 'splash':
        let splashDesc = `Deals area damage in ${special.value}px radius`;
        if (special.secondaryValue) {
          splashDesc += ` and slows enemies by ${special.secondaryValue}%`;
        }
        return splashDesc;
      case 'slow':
        return `Slows enemies by ${special.value}% for ${(special.duration || 0) / 1000}s`;
      case 'dot':
        let dotDesc = `Burns for ${special.value} damage per tick over ${(special.duration || 0) / 1000}s`;
        if (special.secondaryValue) {
          dotDesc += ` (${special.secondaryValue}px spread radius)`;
        }
        return dotDesc;
      case 'critical':
        return `${special.value}% chance to deal critical hit`;
      case 'multishot':
        return `Fires ${special.value} projectiles at once`;
      case 'armor_shred':
        return `Reduces armor by ${special.value}% for ${(special.duration || 0) / 1000}s`;
      case 'fear':
        return `Causes fear, slowing enemies by ${special.value}% for ${(special.duration || 0) / 1000}s`;
      case 'damage_amp':
        return `Marks enemies to take ${special.value}% more damage for ${(special.duration || 0) / 1000}s`;
      case 'freeze':
        let freezeDesc = `Slows by ${special.value}% for ${(special.duration || 0) / 1000}s`;
        if (special.secondaryValue) {
          freezeDesc += `, ${special.secondaryValue}% chance to freeze`;
        }
        return freezeDesc;
      default:
        return 'Special ability';
    }
  }

  private getAbilityDescription(ability: NonNullable<EnemyConfig['abilities']>): string {
    switch (ability.type) {
      case 'ranged':
        return `Ranged attack (${ability.range}px range)`;
      case 'aoe':
        return `Area attack (${ability.range}px radius)`;
      case 'heal':
        return 'Can heal nearby allies';
      case 'spawn':
        return 'Spawns additional enemies';
      case 'shield':
        return 'Can activate a protective shield';
      default:
        return 'Special ability';
    }
  }

  public show(): void {
    this.isVisible = true;
    this.setVisible(true);
    // Re-enable interactivity when showing
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT), Phaser.Geom.Rectangle.Contains);
    this.scrollZone.setInteractive();
    this.scrollY = 0;
    this.currentTab = 'towers';
    this.updateTabStyles();
    this.renderContent();
  }

  public hide(): void {
    this.isVisible = false;
    this.isDragging = false;
    this.hideDetail();
    // CRITICAL: Disable interactivity when hiding - setVisible(false) alone doesn't do this in Phaser!
    this.overlay.disableInteractive();
    this.scrollZone.disableInteractive();
    this.setVisible(false);
    // Notify scene that modal was closed
    this.scene.events.emit('infoModalClosed');
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }
}
