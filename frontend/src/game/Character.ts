// =============================================================================
// CHARACTER (src/game/Character.ts)
// =============================================================================
// Local player avatar rendering with automatic sprite sheet frame calculation,
// walk cycle animation, and sleek procedural fallback.
// =============================================================================

import { Camera } from "./Camera";

export class Character {
  public tileX: number;
  public tileY: number;

  public direction: "up" | "down" | "left" | "right" = "down";
  public isMoving: boolean = false;
  public username: string;

  private sprites: Record<"up" | "down" | "left" | "right", HTMLImageElement>;
  private currentSprite: HTMLImageElement;
  public isLoaded: boolean = false;

  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private frameDuration: number = 150;
  private totalFrames: number = 4;

  constructor(
    tileX: number,
    tileY: number,
    username: string,
    character: string = "male",
  ) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.username = username || "Player";

    this.sprites = {
      up: new Image(),
      down: new Image(),
      left: new Image(),
      right: new Image(),
    };
    this.currentSprite = this.sprites.down;
    this.loadSprites(character);
  }

  private async loadSprites(character: string): Promise<void> {
    const isFemale = character.toLowerCase() === "female";

    const getCandidates = (dir: "up" | "down" | "left" | "right"): string[] => {
      if (isFemale) {
        switch (dir) {
          case "up":
            return [
              "/characters/female/femaleTopnew.png",
              "/characters/female/up.png",
              "/characters/female/top.png",
            ];
          case "down":
            return [
              "/characters/female/femaleBottomnew.png",
              "/characters/female/down.png",
              "/characters/female/bottom.png",
            ];
          case "left":
            return [
              "/characters/female/femaleLeftnew.png",
              "/characters/female/left.png",
            ];
          case "right":
            return [
              "/characters/female/femaleRightnew.png",
              "/characters/female/right.png",
            ];
        }
      }
      // Male default candidates
      switch (dir) {
        case "up":
          return [
            "/characters/male/playerUp.png",
            "/characters/male/up.png",
            "/characters/male/playerTop.png",
          ];
        case "down":
          return [
            "/characters/male/playerDown.png",
            "/characters/male/down.png",
            "/characters/male/playerBottom.png",
          ];
        case "left":
          return [
            "/characters/male/playerLeft.png",
            "/characters/male/left.png",
          ];
        case "right":
          return [
            "/characters/male/playerRight.png",
            "/characters/male/right.png",
          ];
      }
    };

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

    const dirs: Array<"up" | "down" | "left" | "right"> = [
      "up",
      "down",
      "left",
      "right",
    ];
    const results = await Promise.all(
      dirs.map((dir) => tryLoad(this.sprites[dir], getCandidates(dir))),
    );

    this.isLoaded = results.every(Boolean);
    this.currentSprite = this.sprites[this.direction];
    console.log(
      `[Character] Loaded sprites for ${character}: ${this.isLoaded} (${dirs
        .map((d) => `${d}: ${this.sprites[d].src.split("/").pop()}`)
        .join(", ")})`,
    );
  }

  update(deltaTime: number): void {
    if (!this.isMoving) {
      this.currentFrame = 0;
      this.frameTimer = 0;
      return;
    }

    this.frameTimer += deltaTime;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    }
  }

  setDirection(direction: "up" | "down" | "left" | "right"): void {
    this.direction = direction;
    this.currentSprite = this.sprites[direction];
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screen = camera.worldToScreen(this.tileX, this.tileY);

    // Check if sprite image is genuinely loaded and valid
    const hasValidSprite =
      this.isLoaded &&
      this.currentSprite &&
      this.currentSprite.complete &&
      this.currentSprite.naturalWidth > 0;

    if (hasValidSprite) {
      try {
        // Automatically determine frame width (total image width divided by 4 frames)
        const frameW = this.currentSprite.naturalWidth / this.totalFrames;
        const frameH = this.currentSprite.naturalHeight;

        // Scale proportionally to fit 48px tile
        const renderW = Math.round(camera.tileSize * 0.9);
        const renderH = Math.round((frameH / frameW) * renderW);
        const drawX = Math.round(screen.x + (camera.tileSize - renderW) / 2);
        const drawY = Math.round(screen.y + camera.tileSize - renderH);

        // Crisp pixel-art rendering
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
          this.currentSprite,
          this.currentFrame * frameW,
          0,
          frameW,
          frameH,
          drawX,
          drawY,
          renderW,
          renderH,
        );
      } catch {
        this.drawProceduralAvatar(
          ctx,
          screen.x + camera.tileSize / 2,
          screen.y + camera.tileSize / 2,
        );
      }
    } else {
      // Fallback procedural avatar
      this.drawProceduralAvatar(
        ctx,
        screen.x + camera.tileSize / 2,
        screen.y + camera.tileSize / 2,
      );
    }

    // Name tag
    this.drawNameTag(ctx, screen.x + camera.tileSize / 2, screen.y - 10);
  }

  private drawProceduralAvatar(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
  ): void {
    const walkBob = this.isMoving ? (this.currentFrame % 2 === 0 ? -2 : 2) : 0;
    const y = centerY + walkBob;

    // 1. Soft ground shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 18, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Torso (Purple hoodie)
    ctx.fillStyle = "#6c63ff";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(centerX - 12, y - 2, 24, 18, 6);
    } else {
      ctx.rect(centerX - 12, y - 2, 24, 18);
    }
    ctx.fill();

    // 3. Head
    ctx.fillStyle = "#ffd1a4";
    ctx.beginPath();
    ctx.arc(centerX, y - 10, 11, 0, Math.PI * 2);
    ctx.fill();

    // 4. Hair
    ctx.fillStyle = "#3b2314";
    ctx.beginPath();
    ctx.arc(centerX, y - 13, 11, Math.PI, Math.PI * 2);
    ctx.fill();

    // 5. Directional Face
    ctx.fillStyle = "#1e1e2f";
    if (this.direction === "down") {
      ctx.fillRect(centerX - 5, y - 11, 3, 3);
      ctx.fillRect(centerX + 2, y - 11, 3, 3);
    } else if (this.direction === "left") {
      ctx.fillRect(centerX - 8, y - 11, 3, 3);
      ctx.fillRect(centerX - 2, y - 11, 3, 3);
    } else if (this.direction === "right") {
      ctx.fillRect(centerX + 1, y - 11, 3, 3);
      ctx.fillRect(centerX + 7, y - 11, 3, 3);
    } else if (this.direction === "up") {
      ctx.fillStyle = "#3b2314";
      ctx.beginPath();
      ctx.arc(centerX, y - 11, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawNameTag(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
  ): void {
    ctx.font = "bold 11px Inter, sans-serif";
    const textWidth = ctx.measureText(this.username).width;
    const tagWidth = textWidth + 16;
    const tagHeight = 18;

    ctx.fillStyle = "rgba(10, 10, 15, 0.85)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(
        centerX - tagWidth / 2,
        topY - tagHeight,
        tagWidth,
        tagHeight,
        6,
      );
    } else {
      ctx.rect(centerX - tagWidth / 2, topY - tagHeight, tagWidth, tagHeight);
    }
    ctx.fill();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    ctx.fillText(this.username, centerX, topY - 5);
    ctx.textAlign = "left";
  }
}
