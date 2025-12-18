import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { BattleScene } from './scenes/BattleScene';
import { GAME_CONFIG } from './config/game.config';

// Streamlined game - Main Menu -> Battle (endless)
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, PreloadScene, MainMenuScene, BattleScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  input: {
    activePointers: 3,
    touch: {
      capture: true
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  }
};

new Phaser.Game(config);
