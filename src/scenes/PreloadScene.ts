import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/game.config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.loadAssets();
  }

  private createLoadingBar(): void {
    const htmlLoadingBar = document.getElementById('loading-bar');
    const loadingText = document.querySelector('.loading-text');

    this.load.on('progress', (value: number) => {
      if (htmlLoadingBar) {
        htmlLoadingBar.style.width = `${value * 100}%`;
      }
      if (loadingText) {
        loadingText.textContent = `LOADING... ${Math.floor(value * 100)}%`;
      }
    });

    this.load.on('complete', () => {
      if (loadingText) {
        loadingText.textContent = 'READY!';
      }
    });

    this.load.on('loaderror', (_fileObj: Phaser.Loader.File) => {
      // Silently handle load errors - game uses fallbacks
    });
  }

  private loadAssets(): void {
    // Load tower defense enemy assets
    this.loadTowerDefenseEnemies();

    // Load death animation
    this.load.spritesheet('death', 'Assets/Tiny Swords/Factions/Knights/Troops/Dead/Dead.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    // ========== TERRAIN SYSTEM ==========
    this.load.image('tilemap_flat', 'Assets/Tiny Swords/Terrain/Ground/Tilemap_Flat.png');
    this.load.image('tilemap_elevation', 'Assets/Tiny Swords/Terrain/Ground/Tilemap_Elevation.png');
    this.load.image('shadows', 'Assets/Tiny Swords/Terrain/Ground/Shadows.png');

    // Water system
    this.load.image('water_bg', 'Assets/Tiny Swords/Terrain/Water/Water.png');
    this.load.spritesheet('water_foam', 'Assets/Tiny Swords/Terrain/Water/Foam/Foam.png', {
      frameWidth: 192,
      frameHeight: 192
    });

    // Decorations
    this.load.image('rock5', 'Assets/Tiny Swords/Terrain/Decorations/Dec/Rock5.png');
    this.load.image('rock6', 'Assets/Tiny Swords/Terrain/Decorations/Dec/Rock6.png');
    this.load.image('rock7', 'Assets/Tiny Swords/Terrain/Decorations/Dec/Rock7.png');

    // ========== EFFECTS ==========
    this.load.spritesheet('explosion', 'Assets/Tiny Swords/Effects/Explosion/Explosions.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('fire', 'Assets/Tiny Swords/Effects/Fire/Fire.png', {
      frameWidth: 64,
      frameHeight: 64
    });

    // ========== UI ELEMENTS ==========
    this.load.image('btn_blue', 'Assets/Tiny Swords/UI/Buttons/Button_Blue.png');
    this.load.image('btn_blue_pressed', 'Assets/Tiny Swords/UI/Buttons/Button_Blue_Pressed.png');
    this.load.image('btn_red', 'Assets/Tiny Swords/UI/Buttons/Button_Red.png');
    this.load.image('btn_red_pressed', 'Assets/Tiny Swords/UI/Buttons/Button_Red_Pressed.png');

    // Canvas backgrounds (pre-rendered battle maps)
    this.load.image('canvas_forest', 'Assets/Canvas/canvas1.png');
    this.load.image('canvas_rocky', 'Assets/Canvas/canvas2.png');

    // Cover photo for main menu
    this.load.image('cover_photo', 'Assets/Cover Photo/cover.png');

    // ========== PATH ASSETS ==========
    this.load.image('path_tile', 'Assets/Paths/Path1.png');

    // ========== TOWER ASSETS ==========
    this.load.image('tower_ember_watch', 'Assets/Towers/Ember Watch.png');
    this.load.image('tower_rockbound_bastion', 'Assets/Towers/Rockbound Bastion.png');
    this.load.image('tower_sunflare_cannon', 'Assets/Towers/Sunflare Cannon.png');
    this.load.image('tower_ironspike_launcher', 'Assets/Towers/Ironspike Launcher.png');
    this.load.image('tower_frostcoil', 'Assets/Towers/Frostcoil Tower.png');
    this.load.image('tower_pyrehold', 'Assets/Towers/Pyrehold.png');
    this.load.image('tower_void_obelisk', 'Assets/Towers/Void Obelisk.png');
    this.load.image('tower_stone_mortar', 'Assets/Towers/Stone Mortar.png');
    this.load.image('tower_dread_pyre', 'Assets/Towers/Dread Pyre.png');

    // ========== AMMO/PROJECTILE ASSETS ==========
    this.load.image('ammo_flaming_arrow', 'Assets/Ammo/A Ember Watch.png');
    this.load.image('ammo_boulder', 'Assets/Ammo/A Rockbound Bastion.png');
    this.load.image('ammo_fire_shell', 'Assets/Ammo/A Sunflare Cannon.png');
    this.load.image('ammo_spiked_ball', 'Assets/Ammo/A Ironspike Launcher.png');
    this.load.image('ammo_ice_bolt', 'Assets/Ammo/A Frostcoil Tower.png');
    this.load.image('ammo_fireball', 'Assets/Ammo/A Pyrehold.png');
    this.load.image('ammo_arcane_bolt', 'Assets/Ammo/A Void Obelisk.png');
    this.load.image('ammo_cannonball', 'Assets/Ammo/A Stone Mortar.png');
    this.load.image('ammo_flaming_skull', 'Assets/Ammo/A Dread Pyre.png');
  }

  create(): void {
    this.createAnimations();

    const loadingOverlay = document.getElementById('loading-overlay');
    this.time.delayedCall(500, () => {
      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
      }
      this.scene.start('MainMenuScene');
    });
  }

  private createAnimations(): void {
    const fps = GAME_CONFIG.ANIMATION_FPS;

    // Death animation
    this.anims.create({
      key: 'death',
      frames: this.anims.generateFrameNumbers('death', { start: 0, end: 13 }),
      frameRate: fps,
      repeat: 0
    });

    // Effects
    this.anims.create({
      key: 'explosion_anim',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'fire_anim',
      frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // Tower defense enemy animations
    this.createTowerDefenseEnemyAnimations();
  }

  private loadTowerDefenseEnemies(): void {
    // Base sprite paths - using different colors for visual variety
    const basePath = 'Assets/Tiny Swords/Factions';

    // Enemy sprite mappings with proper paths and frame configurations
    const enemyAssets: Record<string, { path: string; frameWidth: number; frameHeight: number; walkFrames: { start: number; end: number } }> = {
      // === GOBLINS FACTION (Swarm enemies) ===
      // Torch Goblin - base swarm enemy (all color variants)
      torch_goblin: {
        path: `${basePath}/Goblins/Troops/Torch/Red/Torch_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }  // Row 1: idle/walk
      },
      torch_goblin_blue: {
        path: `${basePath}/Goblins/Troops/Torch/Blue/Torch_Blue.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      torch_goblin_yellow: {
        path: `${basePath}/Goblins/Troops/Torch/Yellow/Torch_Yellow.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      torch_goblin_purple: {
        path: `${basePath}/Goblins/Troops/Torch/Purple/Torch_Purple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },

      // TNT Goblin - fast swarm (all color variants)
      tnt_goblin: {
        path: `${basePath}/Goblins/Troops/TNT/Red/TNT_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }  // Row 1: walk
      },
      tnt_goblin_blue: {
        path: `${basePath}/Goblins/Troops/TNT/Blue/TNT_Blue.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      tnt_goblin_yellow: {
        path: `${basePath}/Goblins/Troops/TNT/Yellow/TNT_Yellow.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      tnt_goblin_purple: {
        path: `${basePath}/Goblins/Troops/TNT/Purple/TNT_Purple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },

      // Barrel Bomb - explosive enemy (all color variants)
      // Note: 768x768 sprite = 4x4 grid, each row has 4 frames
      // Row 1 (0-3): idle/walk, Row 2+ (4+): other animations/explosions
      barrel_bomb: {
        path: `${basePath}/Goblins/Troops/Barrel/Red/Barrel_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 3 }  // Only first row to avoid mixing animations
      },
      barrel_bomb_blue: {
        path: `${basePath}/Goblins/Troops/Barrel/Blue/Barrel_Blue.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 3 }
      },
      barrel_bomb_yellow: {
        path: `${basePath}/Goblins/Troops/Barrel/Yellow/Barrel_Yellow.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 3 }
      },
      barrel_bomb_purple: {
        path: `${basePath}/Goblins/Troops/Barrel/Purple/Barrel_Purple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 3 }
      },

      // === KNIGHTS FACTION (Various enemy types) ===
      // Pawn - small humanoid enemies
      pawn_red: {
        path: `${basePath}/Knights/Troops/Pawn/Red/Pawn_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }  // Row 1: idle/walk
      },
      pawn_purple: {
        path: `${basePath}/Knights/Troops/Pawn/Purple/Pawn_Purple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      pawn_yellow: {
        path: `${basePath}/Knights/Troops/Pawn/Yellow/Pawn_Yellow.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },

      // Warrior - armored enemies
      warrior_red: {
        path: `${basePath}/Knights/Troops/Warrior/Red/Warrior_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }  // Row 1: idle/walk
      },
      warrior_blue: {
        path: `${basePath}/Knights/Troops/Warrior/Blue/Warrior_Blue.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      warrior_purple: {
        path: `${basePath}/Knights/Troops/Warrior/Purple/Warrior_Purple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      warrior_yellow: {
        path: `${basePath}/Knights/Troops/Warrior/Yellow/Warrior_Yellow.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },

      // Archer - ranged enemies
      archer_red: {
        path: `${basePath}/Knights/Troops/Archer/Red/Archer_Red.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }  // Row 1: idle
      },
      archer_purple: {
        path: `${basePath}/Knights/Troops/Archer/Purple/Archer_Purlple.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      },
      archer_blue: {
        path: `${basePath}/Knights/Troops/Archer/Blue/Archer_Blue.png`,
        frameWidth: 192, frameHeight: 192,
        walkFrames: { start: 0, end: 5 }
      }
    };

    for (const [key, asset] of Object.entries(enemyAssets)) {
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight
        });
      }
    }

    // Store walk frame configs for animation creation
    (this as any).enemyWalkFrames = enemyAssets;
  }

  private createTowerDefenseEnemyAnimations(): void {
    const fps = GAME_CONFIG.ANIMATION_FPS;
    const enemyWalkFrames = (this as any).enemyWalkFrames as Record<string, { walkFrames: { start: number; end: number } }>;

    for (const [key, config] of Object.entries(enemyWalkFrames)) {
      if (this.textures.exists(key) && !this.anims.exists(`${key}_walk`)) {
        this.anims.create({
          key: `${key}_walk`,
          frames: this.anims.generateFrameNumbers(key, config.walkFrames),
          frameRate: fps,
          repeat: -1
        });
      }
    }
  }
}
