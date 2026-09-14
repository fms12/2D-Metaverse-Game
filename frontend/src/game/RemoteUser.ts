// =============================================================================
// REMOTE USER (src/game/RemoteUser.ts)
// =============================================================================
// Other players rendered in real-time with interpolation and procedural fallback.
// =============================================================================

import { Camera } from "./Camera";

export class RemoteUser {
  public tileX: number;
  public tileY: number;
  public userId: string;
  public username: string;

  private visualX: number;
  private visualY: number;

  public direction: "up" | "down" | "left" | "right" = "down";
  private sprites: Record<"up" | "down" | "left" | "right", HTMLImageElement>;
  private currentSprite: HTMLImageElement;
  public isLoaded: boolean = false;

  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private frameDuration: number = 150;
  private totalFrames: number = 4;

  constructor(
    userId: string,
    tileX: number,
    tileY: number,
    username: string = "",
    character: string = "male",
  ) {
    this.userId = String(userId || "User");
    const safeX = Number(tileX) || 0;
    const safeY = Number(tileY) || 0;
    this.tileX = safeX;
    this.tileY = safeY;
    this.visualX = safeX;
    this.visualY = safeY;
    this.username = username || `Player_${this.userId.slice(0, 5)}`;

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
      return [
        dir === "up"
          ? "/characters/male/playerUp.png"
          : dir === "down"
            ? "/characters/male/playerDown.png"
            : dir === "left"
              ? "/characters/male/playerLeft.png"
              : "/characters/male/playerRight.png",
        `/characters/male/${dir}.png`,
      ];
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
  }

  setDirection(direction: "up" | "down" | "left" | "right"): void {
    this.direction = direction;
    if (this.sprites[direction]) {
      this.currentSprite = this.sprites[direction];
    }
  }

  updatePosition(newTileX: number, newTileY: number): void {
    const safeX = Number(newTileX);
    const safeY = Number(newTileY);
    if (!isNaN(safeX) && !isNaN(safeY)) {
      if (safeX > this.tileX) this.setDirection("right");
      else if (safeX < this.tileX) this.setDirection("left");
      else if (safeY > this.tileY) this.setDirection("down");
      else if (safeY < this.tileY) this.setDirection("up");

      this.tileX = safeX;
      this.tileY = safeY;
    }
  }

  update(deltaTime: number): void {
    const lerpFactor = 0.25;
    this.visualX += (this.tileX - this.visualX) * lerpFactor;
    this.visualY += (this.tileY - this.visualY) * lerpFactor;

    const isMoving =
      Math.abs(this.tileX - this.visualX) > 0.01 ||
      Math.abs(this.tileY - this.visualY) > 0.01;

    if (isMoving) {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      }
    } else {
      this.currentFrame = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screenX = this.visualX * camera.tileSize - camera.x;
    const screenY = this.visualY * camera.tileSize - camera.y;

    const hasValidSprite =
      this.isLoaded &&
      this.currentSprite &&
      this.currentSprite.complete &&
      this.currentSprite.naturalWidth > 0;

    if (hasValidSprite) {
      try {
        const frameW = this.currentSprite.naturalWidth / this.totalFrames;
        const frameH = this.currentSprite.naturalHeight;
        const renderW = Math.round(camera.tileSize * 0.9);
        const renderH = Math.round((frameH / frameW) * renderW);
        const drawX = Math.round(screenX + (camera.tileSize - renderW) / 2);
        const drawY = Math.round(screenY + camera.tileSize - renderH);

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
          screenX + camera.tileSize / 2,
          screenY + camera.tileSize / 2,
        );
      }
    } else {
      this.drawProceduralAvatar(
        ctx,
        screenX + camera.tileSize / 2,
        screenY + camera.tileSize / 2,
      );
    }

    this.drawNameTag(ctx, screenX + camera.tileSize / 2, screenY - 10);
  }

  private drawProceduralAvatar(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
  ): void {
    const isMoving =
      Math.abs(this.tileX - this.visualX) > 0.01 ||
      Math.abs(this.tileY - this.visualY) > 0.01;
    const walkBob = isMoving ? (this.currentFrame % 2 === 0 ? -2 : 2) : 0;
    const y = centerY + walkBob;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 18, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso (Cyan / Bright Blue for distinct remote appearance)
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(centerX - 12, y - 2, 24, 18, 6);
    } else {
      ctx.rect(centerX - 12, y - 2, 24, 18);
    }
    ctx.fill();

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(centerX, y - 10, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(centerX, y - 13, 11, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(centerX - 5, y - 11, 3, 3);
    ctx.fillRect(centerX + 2, y - 11, 3, 3);
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

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.textAlign = "center";
    ctx.fillText(this.username, centerX, topY - 5);
    ctx.textAlign = "left";
  }
}
