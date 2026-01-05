import Phaser from 'phaser';
import { useBuildingStore, GhostPreview } from '@/stores/buildingStore';
import { TILE_SIZE } from '@/game/config';

/**
 * BuildingGhostPreview - A Phaser component that renders a building placement preview.
 *
 * This component:
 * - Subscribes to buildingStore.ghostPreview changes
 * - Renders a visual preview that follows the mouse cursor
 * - Shows green tint when placement is valid, red when invalid
 * - Displays building footprint/size indicator
 * - Converts screen coordinates to world coordinates
 */
export class BuildingGhostPreview {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private previewGraphics: Phaser.GameObjects.Graphics;
  private footprintGraphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private unsubscribe: (() => void) | null = null;
  private pointerMoveHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;

  // Building dimensions (in tiles) - default to 3x3 building
  private readonly DEFAULT_WIDTH = 3;
  private readonly DEFAULT_HEIGHT = 3;
  private readonly BUILDING_RADIUS = 48; // Collision radius from buildingStore

  // Colors
  private readonly VALID_COLOR = 0x22c55e;     // Green
  private readonly INVALID_COLOR = 0xef4444;   // Red
  private readonly VALID_ALPHA = 0.6;
  private readonly INVALID_ALPHA = 0.5;
  private readonly FOOTPRINT_VALID = 0x22c55e;
  private readonly FOOTPRINT_INVALID = 0xef4444;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create container for all preview elements
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100); // Above everything else
    this.container.setVisible(false);

    // Create footprint graphics (ground indicator)
    this.footprintGraphics = scene.add.graphics();
    this.container.add(this.footprintGraphics);

    // Create preview graphics (building shape)
    this.previewGraphics = scene.add.graphics();
    this.container.add(this.previewGraphics);

    // Create label for invalid placement reason
    this.labelText = scene.add.text(0, -60, '', {
      fontFamily: 'Avenir, system-ui, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 6, y: 3 },
    });
    this.labelText.setOrigin(0.5, 1);
    this.container.add(this.labelText);

    // Subscribe to store changes
    this.subscribeToStore();

    // Set up pointer move handler
    this.setupPointerTracking();
  }

  private subscribeToStore(): void {
    // Track previous values for change detection
    let prevGhostPreview = useBuildingStore.getState().ghostPreview;
    let prevIsPlacementMode = useBuildingStore.getState().isPlacementMode;

    // Subscribe to all state changes
    this.unsubscribe = useBuildingStore.subscribe((state) => {
      // Only update if relevant values changed
      if (
        state.ghostPreview !== prevGhostPreview ||
        state.isPlacementMode !== prevIsPlacementMode
      ) {
        prevGhostPreview = state.ghostPreview;
        prevIsPlacementMode = state.isPlacementMode;
        this.onStoreUpdate(state.ghostPreview, state.isPlacementMode);
      }
    });

    // Initial sync
    const state = useBuildingStore.getState();
    this.onStoreUpdate(state.ghostPreview, state.isPlacementMode);
  }

  private setupPointerTracking(): void {
    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      const state = useBuildingStore.getState();
      if (!state.isPlacementMode) return;

      // Convert screen coordinates to world coordinates
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Snap to grid (center of tile)
      const snappedX = Math.round(worldPoint.x / TILE_SIZE) * TILE_SIZE;
      const snappedY = Math.round(worldPoint.y / TILE_SIZE) * TILE_SIZE;

      // L-3: Validate coordinates are finite numbers
      if (!isFinite(snappedX) || !isFinite(snappedY)) return;

      // Update store with new position
      state.updateGhostPosition(snappedX, snappedY);
    };

    this.scene.input.on('pointermove', this.pointerMoveHandler);
  }

  private onStoreUpdate(ghostPreview: GhostPreview | null, isPlacementMode: boolean): void {
    if (!isPlacementMode || !ghostPreview) {
      this.container.setVisible(false);
      return;
    }

    // Show and update position
    this.container.setVisible(true);
    this.container.setPosition(ghostPreview.position.x, ghostPreview.position.y);

    // Redraw with current validity
    this.redraw(ghostPreview);
  }

  private redraw(ghostPreview: GhostPreview): void {
    const isValid = ghostPreview.isValid;
    const color = isValid ? this.VALID_COLOR : this.INVALID_COLOR;
    const alpha = isValid ? this.VALID_ALPHA : this.INVALID_ALPHA;
    const footprintColor = isValid ? this.FOOTPRINT_VALID : this.FOOTPRINT_INVALID;

    // Calculate building dimensions
    const width = this.DEFAULT_WIDTH * TILE_SIZE;
    const height = this.DEFAULT_HEIGHT * TILE_SIZE;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Clear previous drawings
    this.footprintGraphics.clear();
    this.previewGraphics.clear();

    // Draw footprint (dashed rectangle around building area)
    this.footprintGraphics.lineStyle(2, footprintColor, 0.8);
    this.drawDashedRect(
      this.footprintGraphics,
      -halfWidth,
      -halfHeight,
      width,
      height,
      8, // Dash length
      4  // Gap length
    );

    // Draw collision radius indicator
    this.footprintGraphics.lineStyle(1, footprintColor, 0.4);
    this.footprintGraphics.strokeCircle(0, 0, this.BUILDING_RADIUS);

    // Draw building preview (solid rectangle with border)
    this.previewGraphics.fillStyle(color, alpha);
    this.previewGraphics.fillRect(-halfWidth, -halfHeight, width, height);

    // Draw building border
    this.previewGraphics.lineStyle(3, color, 1);
    this.previewGraphics.strokeRect(-halfWidth, -halfHeight, width, height);

    // Draw center cross indicator
    this.previewGraphics.lineStyle(2, 0xffffff, 0.8);
    this.previewGraphics.lineBetween(-8, 0, 8, 0);
    this.previewGraphics.lineBetween(0, -8, 0, 8);

    // Draw rotation indicator (arrow pointing in rotation direction)
    this.drawRotationIndicator(ghostPreview.rotation);

    // Draw corner tiles to indicate grid alignment
    this.drawCornerIndicators(halfWidth, halfHeight, isValid);

    // Update label
    if (!isValid && ghostPreview.invalidReason) {
      this.labelText.setText(ghostPreview.invalidReason);
      this.labelText.setVisible(true);
    } else {
      this.labelText.setVisible(false);
    }
  }

  private drawDashedRect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    dashLength: number,
    gapLength: number
  ): void {
    // Top edge
    this.drawDashedLine(graphics, x, y, x + width, y, dashLength, gapLength);
    // Right edge
    this.drawDashedLine(graphics, x + width, y, x + width, y + height, dashLength, gapLength);
    // Bottom edge
    this.drawDashedLine(graphics, x + width, y + height, x, y + height, dashLength, gapLength);
    // Left edge
    this.drawDashedLine(graphics, x, y + height, x, y, dashLength, gapLength);
  }

  private drawDashedLine(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number,
    gapLength: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length;
    const unitY = dy / length;

    let currentLength = 0;
    let drawing = true;

    while (currentLength < length) {
      const segmentLength = drawing
        ? Math.min(dashLength, length - currentLength)
        : Math.min(gapLength, length - currentLength);

      // L-2: Safety check to prevent infinite loop
      if (segmentLength <= 0) break;

      if (drawing) {
        const startX = x1 + unitX * currentLength;
        const startY = y1 + unitY * currentLength;
        const endX = startX + unitX * segmentLength;
        const endY = startY + unitY * segmentLength;
        graphics.lineBetween(startX, startY, endX, endY);
      }

      currentLength += segmentLength;
      drawing = !drawing;
    }
  }

  private drawRotationIndicator(rotation: number): void {
    const length = 20;
    const radians = Phaser.Math.DegToRad(rotation - 90); // -90 to point up at 0 degrees
    const endX = Math.cos(radians) * length;
    const endY = Math.sin(radians) * length;

    // Draw arrow shaft
    this.previewGraphics.lineStyle(2, 0xffffff, 0.9);
    this.previewGraphics.lineBetween(0, 0, endX, endY);

    // Draw arrow head
    const headLength = 8;
    const headAngle = 0.4;
    const headX1 = endX - headLength * Math.cos(radians - headAngle);
    const headY1 = endY - headLength * Math.sin(radians - headAngle);
    const headX2 = endX - headLength * Math.cos(radians + headAngle);
    const headY2 = endY - headLength * Math.sin(radians + headAngle);

    this.previewGraphics.lineBetween(endX, endY, headX1, headY1);
    this.previewGraphics.lineBetween(endX, endY, headX2, headY2);
  }

  private drawCornerIndicators(halfWidth: number, halfHeight: number, isValid: boolean): void {
    const cornerSize = 6;
    const color = isValid ? 0xffffff : 0xffffff;
    const alpha = isValid ? 0.6 : 0.4;

    this.previewGraphics.fillStyle(color, alpha);

    // Top-left corner
    this.previewGraphics.fillRect(-halfWidth, -halfHeight, cornerSize, cornerSize);
    // Top-right corner
    this.previewGraphics.fillRect(halfWidth - cornerSize, -halfHeight, cornerSize, cornerSize);
    // Bottom-left corner
    this.previewGraphics.fillRect(-halfWidth, halfHeight - cornerSize, cornerSize, cornerSize);
    // Bottom-right corner
    this.previewGraphics.fillRect(halfWidth - cornerSize, halfHeight - cornerSize, cornerSize, cornerSize);
  }

  /**
   * Call this method to manually trigger a rotation (R key binding)
   */
  public rotate(): void {
    useBuildingStore.getState().rotateGhost();
  }

  /**
   * Clean up all resources when this component is destroyed
   */
  public destroy(): void {
    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Remove pointer move handler
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }

    // Destroy game objects
    this.labelText.destroy();
    this.previewGraphics.destroy();
    this.footprintGraphics.destroy();
    this.container.destroy();

    console.log('[BuildingGhostPreview] Destroyed');
  }
}
