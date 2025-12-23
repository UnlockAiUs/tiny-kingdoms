// Difficulty levels with reward multipliers
export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard'
}

export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: {
    name: 'Easy',
    description: 'Full rewards, relaxed gameplay',
    rewardMultiplier: 1.0,
    healthMultiplier: 1.0,
    countMultiplier: 0.95,
    speedMultiplier: 0.95,
    color: 0x4CAF50 // Green
  },
  [Difficulty.NORMAL]: {
    name: 'Normal',
    description: '75% rewards, balanced challenge',
    rewardMultiplier: 0.75,
    healthMultiplier: 1.25,
    countMultiplier: 1.05,
    speedMultiplier: 1.05,
    color: 0xFF9800 // Orange
  },
  [Difficulty.HARD]: {
    name: 'Hard',
    description: '50% rewards, tough enemies',
    rewardMultiplier: 0.5,
    healthMultiplier: 1.5,
    countMultiplier: 1.15,
    speedMultiplier: 1.08,
    color: 0xF44336 // Red
  }
};

// Mobile-first portrait orientation with EXPANDED battlefield
export const GAME_CONFIG = {
  // Portrait dimensions (mobile-first)
  WIDTH: 720,
  HEIGHT: 1280,

  // MUCH denser grid for flexible tower placement
  GRID_COLS: 14,  // Many more columns
  GRID_ROWS: 16,  // Many more rows
  CELL_SIZE: 50,  // Smaller cells = more placement options

  // Layout - grid covers most of the playable area
  GRID_OFFSET_X: 10,  // Almost edge-to-edge
  GRID_OFFSET_Y: 150, // Start just below larger HUD

  // UI dimensions - LARGE for mobile readability
  TOP_HUD_HEIGHT: 140,
  BOTTOM_PANEL_HEIGHT: 260,

  // Gameplay
  STARTING_GOLD: 150,
  ANIMATION_FPS: 10,

  // Touch
  MIN_TOUCH_SIZE: 48,

  // Visual polish settings
  ENABLE_SHADOWS: true,
  ENABLE_PARTICLES: true,
  ENABLE_SCREEN_SHAKE: false, // Disabled - bad UX on mobile

  // Path configuration - path is 2 columns wide in center
  PATH_WIDTH: 100,
  PATH_CENTER_X: 360, // Center of screen
  PATH_COLS: [6, 7]   // Which columns are the path (center of 14 cols)
};
