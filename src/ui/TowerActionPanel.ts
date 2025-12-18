import Phaser from 'phaser';
import { Tower } from '../entities/Tower';
import { GAME_CONFIG } from '../config/game.config';
import { DEPTH_LAYERS } from '../systems/DepthSortSystem';

// Warm fantasy color palette
const COLORS = {
  parchment: 0xF5E6C8,
  woodDark: 0x5D3A1A,
  woodMed: 0x8B5A2B,
  gold: 0xFFD700,
  goldDark: 0xC9A227,
  textDark: 0x3D2817,
  upgradeGreen: 0x2E7D32,
  upgradeGreenLight: 0x4CAF50,
  sellRed: 0xB71C1C,
  sellRedLight: 0xE53935,
  disabled: 0x555555
};

export class TowerActionPanel extends Phaser.GameObjects.Container {
  private panelBg!: Phaser.GameObjects.Graphics;
  private tower: Tower | null = null;
  private upgradeBtn!: Phaser.GameObjects.Container;
  private sellBtn!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private upgradeBtnText!: Phaser.GameObjects.Text;
  private upgradeBtnLabel!: Phaser.GameObjects.Text;
  private sellBtnText!: Phaser.GameObjects.Text;
  private maxLevelText!: Phaser.GameObjects.Text;

  // Debounce to prevent double-tap triggering multiple upgrades
  private isProcessingAction: boolean = false;

  // 25% larger for mobile readability
  private readonly PANEL_WIDTH = 350;
  private readonly PANEL_HEIGHT = 275;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.setDepth(DEPTH_LAYERS.UI_ELEMENTS + 50);
    this.setVisible(false);

    this.createPanel();

    // Listen for gold changes to update button states live
    scene.events.on('goldChanged', this.onGoldChanged, this);

    scene.add.existing(this);
  }

  private onGoldChanged(): void {
    if (this.visible && this.tower) {
      this.updateButtonStates();
    }
  }

  private createPanel(): void {
    // Panel background
    this.panelBg = this.scene.add.graphics();
    this.drawPanelBackground();
    this.add(this.panelBg);

    // Tower name - high contrast with word wrap to prevent overflow
    this.nameText = this.scene.add.text(this.PANEL_WIDTH / 2, 22, '', {
      fontSize: '26px',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      color: '#3D2817',
      stroke: '#F5E6C8',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: this.PANEL_WIDTH - 40 }
    }).setOrigin(0.5, 0);
    this.add(this.nameText);

    // Stats - larger, high contrast
    this.statsText = this.scene.add.text(this.PANEL_WIDTH / 2, 60, '', {
      fontSize: '22px',
      fontFamily: '"Cinzel", serif',
      color: '#4A3728',
      stroke: '#F5E6C8',
      strokeThickness: 1
    }).setOrigin(0.5, 0);
    this.add(this.statsText);

    // Upgrade button with cost built in
    this.upgradeBtn = this.createUpgradeButton();
    this.add(this.upgradeBtn);

    // Max level text (shown instead of upgrade button at max)
    this.maxLevelText = this.scene.add.text(this.PANEL_WIDTH / 2, 125, 'MAX LEVEL', {
      fontSize: '28px',
      fontFamily: '"Cinzel", serif',
      color: '#C9A227',
      fontStyle: 'bold',
      stroke: '#5D3A1A',
      strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.maxLevelText.setVisible(false);
    this.add(this.maxLevelText);

    // Sell button with refund built in
    this.sellBtn = this.createSellButton();
    this.add(this.sellBtn);
  }

  private drawPanelBackground(): void {
    this.panelBg.clear();

    // Shadow
    this.panelBg.fillStyle(0x000000, 0.3);
    this.panelBg.fillRoundedRect(5, 5, this.PANEL_WIDTH, this.PANEL_HEIGHT, 14);

    // Outer frame (dark wood)
    this.panelBg.fillStyle(COLORS.woodDark, 1);
    this.panelBg.fillRoundedRect(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 14);

    // Inner frame (medium wood)
    this.panelBg.fillStyle(COLORS.woodMed, 1);
    this.panelBg.fillRoundedRect(5, 5, this.PANEL_WIDTH - 10, this.PANEL_HEIGHT - 10, 12);

    // Parchment background
    this.panelBg.fillStyle(COLORS.parchment, 1);
    this.panelBg.fillRoundedRect(10, 10, this.PANEL_WIDTH - 20, this.PANEL_HEIGHT - 20, 10);

    // Gold trim
    this.panelBg.lineStyle(2, COLORS.goldDark, 0.6);
    this.panelBg.strokeRoundedRect(9, 9, this.PANEL_WIDTH - 18, this.PANEL_HEIGHT - 18, 11);
  }

  private createUpgradeButton(): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(this.PANEL_WIDTH / 2, 130);
    const btnWidth = 300;
    const btnHeight = 70;

    const bg = this.scene.add.graphics();
    btn.setData('bg', bg);
    btn.setData('btnWidth', btnWidth);
    btn.setData('btnHeight', btnHeight);
    this.drawUpgradeButtonBg(bg, btnWidth, btnHeight, true, false);
    btn.add(bg);

    // "UPGRADE" label - always white for readability
    this.upgradeBtnLabel = this.scene.add.text(0, -10, 'UPGRADE', {
      fontSize: '28px',
      fontFamily: '"Cinzel", serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    btn.add(this.upgradeBtnLabel);

    // Cost text below - always white for readability
    this.upgradeBtnText = this.scene.add.text(0, 18, '', {
      fontSize: '20px',
      fontFamily: '"Cinzel", serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    btn.add(this.upgradeBtnText);

    btn.setSize(btnWidth, btnHeight);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.onUpgrade());
    btn.on('pointerover', () => {
      if (btn.getData('canAfford')) {
        this.drawUpgradeButtonBg(bg, btnWidth, btnHeight, true, true);
      }
    });
    btn.on('pointerout', () => {
      const canAfford = btn.getData('canAfford');
      this.drawUpgradeButtonBg(bg, btnWidth, btnHeight, canAfford, false);
    });

    return btn;
  }

  private createSellButton(): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(this.PANEL_WIDTH / 2, 215);
    const btnWidth = 300;
    const btnHeight = 55;

    const bg = this.scene.add.graphics();
    btn.setData('bg', bg);
    this.drawSellButtonBg(bg, btnWidth, btnHeight, false);
    btn.add(bg);

    // Combined "SELL +150" text - white for readability
    this.sellBtnText = this.scene.add.text(0, 0, '', {
      fontSize: '26px',
      fontFamily: '"Cinzel", serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    btn.add(this.sellBtnText);

    btn.setSize(btnWidth, btnHeight);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.onSell());
    btn.on('pointerover', () => this.drawSellButtonBg(bg, btnWidth, btnHeight, true));
    btn.on('pointerout', () => this.drawSellButtonBg(bg, btnWidth, btnHeight, false));

    return btn;
  }

  private drawUpgradeButtonBg(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    canAfford: boolean,
    isHover: boolean
  ): void {
    graphics.clear();

    const baseColor = canAfford
      ? (isHover ? COLORS.upgradeGreenLight : COLORS.upgradeGreen)
      : COLORS.disabled;

    // Button shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillRoundedRect(-width / 2 + 4, 4, width, height, 10);

    // Button background
    graphics.fillStyle(baseColor, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Highlight at top
    graphics.fillStyle(0xFFFFFF, canAfford ? 0.2 : 0.1);
    graphics.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height / 3, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Border - darker for better definition
    graphics.lineStyle(3, 0x000000, 0.5);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  }

  private drawSellButtonBg(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    isHover: boolean
  ): void {
    graphics.clear();

    const baseColor = isHover ? COLORS.sellRedLight : COLORS.sellRed;

    // Button shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillRoundedRect(-width / 2 + 4, 4, width, height, 10);

    // Button background
    graphics.fillStyle(baseColor, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Highlight at top
    graphics.fillStyle(0xFFFFFF, 0.15);
    graphics.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height / 3, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Border - darker for better definition
    graphics.lineStyle(3, 0x000000, 0.5);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  }

  public showForTower(tower: Tower): void {
    this.tower = tower;

    // Reset action lock when showing panel for a new tower
    this.isProcessingAction = false;

    // Position panel near tower (but ensure it stays on screen)
    const { WIDTH, HEIGHT, TOP_HUD_HEIGHT, BOTTOM_PANEL_HEIGHT } = GAME_CONFIG;

    // Define safe bounds for panel placement
    const minX = 10;
    const maxX = WIDTH - this.PANEL_WIDTH - 10;
    const minY = TOP_HUD_HEIGHT + 10; // Below HUD with padding
    const maxY = HEIGHT - BOTTOM_PANEL_HEIGHT - this.PANEL_HEIGHT - 10; // Above bottom panel

    // Try to position panel to the right of tower first
    let panelX = tower.x + 60;
    let panelY = tower.y - this.PANEL_HEIGHT / 2; // Center vertically on tower

    // If panel would go off right edge, flip to left side
    if (panelX + this.PANEL_WIDTH > WIDTH - 10) {
      panelX = tower.x - this.PANEL_WIDTH - 60;
    }

    // If still off screen (tower on left edge), just clamp to visible area
    panelX = Phaser.Math.Clamp(panelX, minX, maxX);

    // Clamp Y to stay within playable area
    panelY = Phaser.Math.Clamp(panelY, minY, maxY);

    this.setPosition(panelX, panelY);

    // Update content
    this.updateContent();

    this.setVisible(true);
  }

  public hide(): void {
    this.tower = null;
    this.setVisible(false);
  }

  private updateContent(): void {
    if (!this.tower) return;

    const stats = this.tower.getStats();
    const sellPrice = this.tower.getSellPrice();

    // Tower name with level
    const levelSuffix = this.tower.level === 3 ? ' (MAX)' : ` Lv.${this.tower.level}`;
    this.nameText.setText(this.tower.config.name + levelSuffix);

    // Dynamically position stats below name to prevent overlap
    // Name starts at Y=22, add the actual height of the name text plus padding
    const nameHeight = this.nameText.height;
    const statsY = 22 + nameHeight + 5; // 5px padding
    this.statsText.setY(statsY);

    // Compact stats
    const rate = (1000 / stats.fireRate).toFixed(1);
    this.statsText.setText(`DMG ${stats.damage}  \u2022  RNG ${stats.range}  \u2022  ${rate}/s`);

    // Sell button text
    this.sellBtnText.setText(`SELL  +${sellPrice}`);

    // Update button states based on gold
    this.updateButtonStates();
  }

  private updateButtonStates(): void {
    if (!this.tower) return;

    const upgradeCost = this.tower.getUpgradeCost();
    const gold = (this.scene as any).gold || 0;

    if (upgradeCost > 0) {
      // Show upgrade button
      this.upgradeBtn.setVisible(true);
      this.maxLevelText.setVisible(false);

      const canAfford = gold >= upgradeCost;
      this.upgradeBtn.setData('canAfford', canAfford);

      // Update cost text
      this.upgradeBtnText.setText(`${upgradeCost}`);

      // Update button appearance
      const bg = this.upgradeBtn.getData('bg') as Phaser.GameObjects.Graphics;
      const btnWidth = this.upgradeBtn.getData('btnWidth');
      const btnHeight = this.upgradeBtn.getData('btnHeight');
      this.drawUpgradeButtonBg(bg, btnWidth, btnHeight, canAfford, false);
    } else {
      // Max level - hide upgrade button, show max text
      this.upgradeBtn.setVisible(false);
      this.maxLevelText.setVisible(true);
    }
  }

  private onUpgrade(): void {
    if (!this.tower) return;

    // Prevent double-tap from triggering multiple upgrades
    if (this.isProcessingAction) return;

    const upgradeCost = this.tower.getUpgradeCost();
    if (upgradeCost < 0) return;

    const canAfford = this.upgradeBtn.getData('canAfford');
    if (!canAfford) {
      // Shake button to indicate can't afford
      this.scene.tweens.add({
        targets: this.upgradeBtn,
        x: this.upgradeBtn.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 3
      });
      return;
    }

    // Lock to prevent rapid double-upgrades
    this.isProcessingAction = true;

    // Emit upgrade request - BattleScene will handle gold deduction
    this.scene.events.emit('requestTowerUpgrade', this.tower);

    // Update content after a small delay to reflect new stats
    this.scene.time.delayedCall(50, () => this.updateContent());

    // Reset lock after animation completes (300ms is the upgrade tween duration)
    this.scene.time.delayedCall(350, () => {
      this.isProcessingAction = false;
    });
  }

  private onSell(): void {
    if (!this.tower) return;

    // Prevent double-tap from triggering multiple sells
    if (this.isProcessingAction) return;
    this.isProcessingAction = true;

    // Emit sell request - BattleScene will handle gold addition and tower removal
    this.scene.events.emit('requestTowerSell', this.tower);

    this.hide();
  }

  public getTower(): Tower | null {
    return this.tower;
  }

  public getIsVisible(): boolean {
    return this.visible;
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x,
      this.y,
      this.PANEL_WIDTH,
      this.PANEL_HEIGHT
    );
  }

  public destroy(): void {
    this.scene.events.off('goldChanged', this.onGoldChanged, this);
    super.destroy();
  }
}
