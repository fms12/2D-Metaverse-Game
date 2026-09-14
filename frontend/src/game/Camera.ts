// =============================================================================
// CAMERA (src/game/Camera.ts)
// =============================================================================
// Controls viewport tracking, zoom scaling, and screen centering.
// =============================================================================

export class Camera {
  // Camera's top-left world pixel offset
  public x: number = 0;
  public y: number = 0;

  // Viewport dimensions (matches canvas width & height)
  public viewportWidth: number;
  public viewportHeight: number;

  // Space dimensions in logical tiles
  public worldWidth: number;
  public worldHeight: number;

  // Each logical tile rendered at 48px for comfortable zoom & visibility
  public tileSize: number = 48;

  constructor(
    viewportWidth: number,
    viewportHeight: number,
    worldWidth: number,
    worldHeight: number,
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  // ===========================================================================
  // FOLLOW PLAYER & CENTER VIEWPORT
  // ===========================================================================
  follow(playerTileX: number, playerTileY: number): void {
    const playerPixelX = playerTileX * this.tileSize;
    const playerPixelY = playerTileY * this.tileSize;

    const worldPixelWidth = this.worldWidth * this.tileSize;
    const worldPixelHeight = this.worldHeight * this.tileSize;

    // 🎓 HORIZONTAL CENTERING & CLAMPING:
    // If the space is narrower than the screen, center it right in the middle!
    if (worldPixelWidth <= this.viewportWidth) {
      this.x = -(this.viewportWidth - worldPixelWidth) / 2;
    } else {
      // Follow the player and clamp to map boundaries
      this.x = playerPixelX - this.viewportWidth / 2;
      this.x = Math.max(
        0,
        Math.min(worldPixelWidth - this.viewportWidth, this.x),
      );
    }

    // 🎓 VERTICAL CENTERING & CLAMPING:
    // If the space is shorter than the screen, center it vertically!
    if (worldPixelHeight <= this.viewportHeight) {
      this.y = -(this.viewportHeight - worldPixelHeight) / 2;
    } else {
      // Follow the player and clamp to map boundaries
      this.y = playerPixelY - this.viewportHeight / 2;
      this.y = Math.max(
        0,
        Math.min(worldPixelHeight - this.viewportHeight, this.y),
      );
    }
  }

  // ===========================================================================
  // WORLD TO SCREEN CONVERSION
  // ===========================================================================
  worldToScreen(
    worldTileX: number,
    worldTileY: number,
  ): { x: number; y: number } {
    return {
      x: worldTileX * this.tileSize - this.x,
      y: worldTileY * this.tileSize - this.y,
    };
  }

  // ===========================================================================
  // RESIZE VIEWPORT
  // ===========================================================================
  resize(newWidth: number, newHeight: number): void {
    this.viewportWidth = newWidth;
    this.viewportHeight = newHeight;
  }
}
