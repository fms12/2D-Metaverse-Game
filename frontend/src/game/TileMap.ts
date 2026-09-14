// =============================================================================
// TILE MAP (src/game/TileMap.ts)
// =============================================================================
// Renders the 2D world map with tile scaling and futuristic floor grid styling.
// =============================================================================

import { Camera } from "./Camera";

export class TileMap {
  private mapImage: HTMLImageElement;
  public isLoaded: boolean = false;

  public widthTiles: number;
  public heightTiles: number;

  private widthPixels: number;
  private heightPixels: number;

  // Each tile is 48px to match Camera.tileSize
  private tileSize: number = 48;
  private foregroundImage: HTMLImageElement;
  public isForegroundLoaded: boolean = false;

  constructor(widthTiles: number, heightTiles: number) {
    this.widthTiles = widthTiles;
    this.heightTiles = heightTiles;
    this.widthPixels = widthTiles * this.tileSize;
    this.heightPixels = heightTiles * this.tileSize;
    this.mapImage = new Image();
    this.foregroundImage = new Image();
  }

  // ===========================================================================
  // LOAD MAP IMAGE (with automatic fallback to available public assets)
  // ===========================================================================
  async loadMap(spaceNameOrPath: string = ""): Promise<void> {
    const isRoomType =
      spaceNameOrPath.toLowerCase().includes("room") ||
      spaceNameOrPath.toLowerCase().includes("coffee") ||
      spaceNameOrPath.toLowerCase().includes("lounge") ||
      spaceNameOrPath.toLowerCase().includes("office") ||
      spaceNameOrPath.includes("Room.png");

    const initialCandidate =
      spaceNameOrPath.startsWith("/") || spaceNameOrPath.includes(".png")
        ? [spaceNameOrPath]
        : [];

    // Background candidates ordered by priority
    const bgCandidates = [
      ...initialCandidate,
      ...(isRoomType
        ? [
            "/map/Room.png",
            "/map/metaverse map.png",
            "/map/metaverse%20map.png",
            "/maps/Room.png",
            "/maps/office_map.png",
            "/background-image.png",
          ]
        : [
            "/map/metaverse map.png",
            "/map/metaverse%20map.png",
            "/map/metaverse map(not-zoom).png",
            "/map/metaverse%20map(not-zoom).png",
            "/map/Room.png",
            "/maps/office_map.png",
            "/background-image.png",
          ]),
    ];

    // Foreground candidates (optional overlay layer above characters)
    const fgCandidates = isRoomType
      ? [
          "/map/RoomForeground.png",
          "/map/foreground image.png",
          "/map/foreground%20image.png",
        ]
      : [
          "/map/foreground image.png",
          "/map/foreground%20image.png",
          "/map/RoomForeground.png",
        ];

    // Helper to try loading candidates sequentially
    const tryLoad = (
      img: HTMLImageElement,
      paths: string[],
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        let index = 0;
        const next = () => {
          if (index >= paths.length) {
            resolve(false);
            return;
          }
          const p = paths[index++];
          img.onload = () => {
            if (img.naturalWidth > 0) {
              resolve(true);
            } else {
              next();
            }
          };
          img.onerror = () => next();
          img.src = p;
        };
        next();
      });
    };

    const [bgOk, fgOk] = await Promise.all([
      tryLoad(this.mapImage, bgCandidates),
      tryLoad(this.foregroundImage, fgCandidates),
    ]);

    this.isLoaded = bgOk;
    this.isForegroundLoaded = fgOk;
    console.log(
      `[TileMap] Map loaded: ${bgOk} (${this.mapImage.src}), Foreground loaded: ${fgOk}`,
    );
  }

  // ===========================================================================
  // DRAW MAP BACKGROUND
  // ===========================================================================
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.isLoaded) {
      this.drawFallbackGrid(ctx, camera);
      return;
    }

    ctx.drawImage(
      this.mapImage,
      -camera.x,
      -camera.y,
      this.widthPixels,
      this.heightPixels,
    );
  }

  // ===========================================================================
  // DRAW FOREGROUND OVERLAY (rendered over players)
  // ===========================================================================
  drawForeground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.isForegroundLoaded) return;

    ctx.drawImage(
      this.foregroundImage,
      -camera.x,
      -camera.y,
      this.widthPixels,
      this.heightPixels,
    );
  }

  // ===========================================================================
  // FALLBACK STYLED GRID
  // Creates a clean, modern virtual office floor pattern
  // ===========================================================================
  private drawFallbackGrid(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
  ): void {
    const tileSize = this.tileSize;

    const startTileX = Math.floor(camera.x / tileSize);
    const startTileY = Math.floor(camera.y / tileSize);
    const endTileX = Math.ceil((camera.x + camera.viewportWidth) / tileSize);
    const endTileY = Math.ceil((camera.y + camera.viewportHeight) / tileSize);

    for (let row = startTileY; row <= endTileY; row++) {
      for (let col = startTileX; col <= endTileX; col++) {
        if (
          row < 0 ||
          row >= this.heightTiles ||
          col < 0 ||
          col >= this.widthTiles
        )
          continue;

        // Modern alternating tile grid
        const isAlternate = (row + col) % 2 === 0;
        ctx.fillStyle = isAlternate ? "#141422" : "#1a1a2e";

        const screenX = col * tileSize - camera.x;
        const screenY = row * tileSize - camera.y;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Subtle grid lines
        ctx.strokeStyle = "#25253e";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, tileSize, tileSize);

        // Center dot marker in each tile for depth
        ctx.fillStyle = "#2a2a44";
        ctx.fillRect(
          screenX + tileSize / 2 - 1,
          screenY + tileSize / 2 - 1,
          2,
          2,
        );
      }
    }
  }

  // ===========================================================================
  // GLOWING WORLD BORDER
  // ===========================================================================
  drawBorder(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const left = -camera.x;
    const top = -camera.y;

    // Glowing border line
    ctx.strokeStyle = "#6c63ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, this.widthPixels, this.heightPixels);

    // Corner accent brackets
    const cornerSize = 24;
    ctx.fillStyle = "#a78bfa";

    // Top-left
    ctx.fillRect(left - 4, top - 4, cornerSize, 4);
    ctx.fillRect(left - 4, top - 4, 4, cornerSize);

    // Top-right
    ctx.fillRect(
      left + this.widthPixels - cornerSize + 4,
      top - 4,
      cornerSize,
      4,
    );
    ctx.fillRect(left + this.widthPixels, top - 4, 4, cornerSize);

    // Bottom-left
    ctx.fillRect(left - 4, top + this.heightPixels, cornerSize, 4);
    ctx.fillRect(
      left - 4,
      top + this.heightPixels - cornerSize + 4,
      4,
      cornerSize,
    );

    // Bottom-right
    ctx.fillRect(
      left + this.widthPixels - cornerSize + 4,
      top + this.heightPixels,
      cornerSize,
      4,
    );
    ctx.fillRect(
      left + this.widthPixels,
      top + this.heightPixels - cornerSize + 4,
      4,
      cornerSize,
    );
  }
}
