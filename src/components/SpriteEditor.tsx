import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { generatePlantPreview, generateAnimalPreview, generateResourcePreview } from '@/utils/generatePreviewImage';

interface SpriteEditorProps {
  onClose: () => void;
}

const TILE_SIZE = 16; // 16x16 pixels per tile
const TILES_PER_ROW = 3; // 3x3 grid of tiles
const GRID_SIZE = TILE_SIZE * TILES_PER_ROW; // 48x48 total pixels
const PIXEL_SIZE = 12; // Display size of each pixel
const TILE_BORDER = 2; // Black border between tiles
const NUM_BORDERS = TILES_PER_ROW - 1; // 2 borders for 3 tiles
const BASE_CANVAS_SIZE = GRID_SIZE * PIXEL_SIZE + NUM_BORDERS * TILE_BORDER; // 580px
const VIEWPORT_SIZE = 580; // Fixed viewport size

const DEFAULT_PALETTE = [
  // Blacks & Whites
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080',
  '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#f2f2f2', '#ffffff',
  // Rich Reds
  '#2d0a0a', '#5c1414', '#8b1e1e', '#b22222', '#dc143c', '#ff0000',
  '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#ffe6e6', '#fff0f0',
  // Rich Oranges
  '#3d1f00', '#7a3d00', '#b85c00', '#f57c00', '#ff9800', '#ffb74d',
  '#ffcc80', '#ffe0b2', '#fff3e0', '#ffecd9', '#fff5eb', '#fffaf5',
  // Rich Yellows
  '#3d3d00', '#7a7a00', '#b8b800', '#f5f500', '#ffff00', '#ffff4d',
  '#ffff80', '#ffffb3', '#ffffe6', '#ffffd9', '#ffffeb', '#fffff5',
  // Rich Greens
  '#0a2d0a', '#145c14', '#1e8b1e', '#22b222', '#2ecc40', '#4caf50',
  '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9', '#f1f8f1',
  // Teals & Cyans
  '#0a2d2d', '#145c5c', '#1e8b8b', '#22b2b2', '#00bcd4', '#26c6da',
  '#4dd0e1', '#80deea', '#b2ebf2', '#e0f7fa', '#e6ffff', '#f0ffff',
  // Rich Blues
  '#0a0a2d', '#14145c', '#1e1e8b', '#2222b2', '#1976d2', '#2196f3',
  '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd', '#f0f7ff',
  // Rich Purples
  '#1a0a2d', '#33145c', '#4d1e8b', '#6622b2', '#7b1fa2', '#9c27b0',
  '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7', '#f3e5f5', '#faf0ff',
  // Rich Pinks
  '#2d0a1a', '#5c1433', '#8b1e4d', '#b22266', '#c2185b', '#e91e63',
  '#ec407a', '#f06292', '#f48fb1', '#f8bbd9', '#fce4ec', '#fff0f5',
  // Browns & Tans
  '#1a0f00', '#3d2200', '#5c3300', '#7a4400', '#8d6e63', '#a1887f',
  '#bcaaa4', '#d7ccc8', '#efebe9', '#f5f0eb', '#faf5f0', '#fffaf5',
  // Skin Tones
  '#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#ffe4c4',
  // Nature Greens
  '#1b4d1b', '#228b22', '#2e8b57', '#3cb371', '#90ee90', '#98fb98',
  // Sky Blues
  '#4682b4', '#5f9ea0', '#87ceeb', '#add8e6', '#b0e0e6', '#e0ffff',
  // Earth Tones
  '#8b4513', '#a0522d', '#cd853f', '#deb887', '#f4a460', '#ffdab9',
];

export function SpriteEditor({ onClose }: SpriteEditorProps) {
  const { plants, animals, resources } = useDefinitionsStore();

  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1); // Zoom level: 0.5x to 2x
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<'plant' | 'animal' | 'resource'>('plant');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');

  // Ref for viewport to handle scroll-based zoom
  const viewportRef = useRef<HTMLDivElement>(null);

  // Calculate scaled canvas size for scrollable area
  const scaledCanvasSize = BASE_CANVAS_SIZE * zoom;

  // Prevent default behavior
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  // Handle scroll wheel zoom centered on cursor
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) return;

    // Get mouse position relative to viewport
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate position in canvas coordinates (accounting for current scroll)
    const canvasX = (viewport.scrollLeft + mouseX) / zoom;
    const canvasY = (viewport.scrollTop + mouseY) / zoom;

    // Calculate new zoom level
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom + zoomDelta));

    // Update zoom
    setZoom(newZoom);

    // After zoom, adjust scroll to keep the same canvas point under cursor
    requestAnimationFrame(() => {
      if (!viewport) return;
      const newScrollLeft = canvasX * newZoom - mouseX;
      const newScrollTop = canvasY * newZoom - mouseY;
      viewport.scrollLeft = Math.max(0, newScrollLeft);
      viewport.scrollTop = Math.max(0, newScrollTop);
    });
  }, [zoom]);

  // Attach wheel event listener to viewport
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Paint or erase with brush size
  const paintPixels = (centerRow: number, centerCol: number, erase: boolean) => {
    setPixels(prev => {
      const newPixels = prev.map(r => [...r]);
      const halfSize = Math.floor(brushSize / 2);
      for (let dy = -halfSize; dy < brushSize - halfSize; dy++) {
        for (let dx = -halfSize; dx < brushSize - halfSize; dx++) {
          const r = centerRow + dy;
          const c = centerCol + dx;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            newPixels[r][c] = erase ? 'transparent' : selectedColor;
          }
        }
      }
      return newPixels;
    });
  };

  // Handle mouse down
  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button === 2) {
      // Right click - erase
      setIsRightMouseDown(true);
      paintPixels(row, col, true);
    } else if (e.button === 0) {
      // Left click - paint
      setIsMouseDown(true);
      paintPixels(row, col, false);
    }
  };

  // Handle mouse enter for dragging
  const handleMouseEnter = (row: number, col: number) => {
    if (isMouseDown) {
      paintPixels(row, col, false);
    } else if (isRightMouseDown) {
      paintPixels(row, col, true);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsRightMouseDown(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ESC key to close editor
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Clear canvas
  const handleClear = () => {
    setPixels(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent')));
  };

  // Generate sprite as data URL
  const generateSpriteDataURL = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw pixels
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const color = pixels[row][col];
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(col, row, 1, 1);
        }
      }
    }

    return canvas.toDataURL();
  };

  // Preview the sprite at actual size
  const generatePreview = (): string => {
    return generateSpriteDataURL();
  };

  // Save and link to object
  const handleSaveAndLink = () => {
    if (!selectedObjectId) {
      alert('Please select an object to link the sprite to.');
      return;
    }

    const imageUrl = generateSpriteDataURL();
    const store = useDefinitionsStore.getState();

    // Get the current object to access existing versions
    const currentObject = selectedObject;
    const existingVersions = currentObject?.spriteVersions || [];

    // Calculate next version number
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map(v => v.version)) + 1
      : 1;

    // Create new version entry
    const newVersion = {
      imageUrl,
      createdAt: Date.now(),
      version: nextVersion,
    };

    // Add new version to spriteVersions array
    const updatedVersions = [...existingVersions, newVersion];

    if (selectedObjectType === 'plant') {
      store.updatePlant(selectedObjectId, {
        imageUrl,
        spriteVersions: updatedVersions,
      });
    } else if (selectedObjectType === 'animal') {
      store.updateAnimal(selectedObjectId, {
        imageUrl,
        spriteVersions: updatedVersions,
      });
    } else if (selectedObjectType === 'resource') {
      store.updateResource(selectedObjectId, {
        imageUrl,
        spriteVersions: updatedVersions,
      });
    }

    alert('Sprite saved and linked successfully!');
    onClose();
  };

  // Get available objects based on type
  const getAvailableObjects = () => {
    if (selectedObjectType === 'plant') return plants;
    if (selectedObjectType === 'animal') return animals;
    return resources;
  };

  // Get current selected object
  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    const objects = getAvailableObjects();
    return objects.find(obj => obj.id === selectedObjectId);
  }, [selectedObjectId, selectedObjectType, plants, animals, resources]);

  // Get current object image (custom or generated)
  const currentObjectImage = useMemo(() => {
    if (!selectedObject) return '';
    if (selectedObject.imageUrl) return selectedObject.imageUrl;

    if (selectedObjectType === 'plant') {
      return generatePlantPreview((selectedObject as any).subCategory, selectedObject.name);
    } else if (selectedObjectType === 'animal') {
      return generateAnimalPreview((selectedObject as any).subCategory, selectedObject.name);
    } else if (selectedObjectType === 'resource') {
      return generateResourcePreview((selectedObject as any).category, selectedObject.name);
    }
    return '';
  }, [selectedObject, selectedObjectType]);

  // Handle restoring a previous version
  const handleRestoreVersion = (versionImageUrl: string) => {
    if (!selectedObjectId) return;

    const store = useDefinitionsStore.getState();

    if (selectedObjectType === 'plant') {
      store.updatePlant(selectedObjectId, { imageUrl: versionImageUrl });
    } else if (selectedObjectType === 'animal') {
      store.updateAnimal(selectedObjectId, { imageUrl: versionImageUrl });
    } else if (selectedObjectType === 'resource') {
      store.updateResource(selectedObjectId, { imageUrl: versionImageUrl });
    }

    alert('Version restored successfully!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#FFF1E5',
        zIndex: 2000,
        color: '#333',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '14px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #E8DDD1', background: '#FFF1E5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0D0D0D' }}>Sprite Editor (3x3 tiles, 16x16 each)</h1>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#0D0D0D',
              border: 'none',
              borderRadius: '4px',
              color: '#FFF1E5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Close (ESC)
          </button>
        </div>
      </div>

      {/* Main layout: Left sidebar + Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
        {/* Left Sidebar - Object Linking (300px) */}
        <div style={{ width: '300px', padding: '20px', borderRight: '1px solid #E8DDD1', overflowY: 'auto', background: '#FFF1E5' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#0D0D0D' }}>Link to Object</h2>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Object Type:</label>
            <select
              value={selectedObjectType}
              onChange={(e) => {
                setSelectedObjectType(e.target.value as 'plant' | 'animal' | 'resource');
                setSelectedObjectId('');
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                color: '#333',
                cursor: 'pointer',
              }}
            >
              <option value="plant">Plants</option>
              <option value="animal">Animals</option>
              <option value="resource">Materials</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Select Object:</label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                color: '#333',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Select {selectedObjectType} --</option>
              {getAvailableObjects().map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Image Display */}
          {selectedObjectId && currentObjectImage && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Current Image:</label>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  border: '2px solid #ccc',
                  backgroundImage: `url(${currentObjectImage})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                }}
              />
            </div>
          )}

          {/* Sprite Version History */}
          {selectedObjectId && selectedObject?.spriteVersions && selectedObject.spriteVersions.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Version History:</label>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: '#fff',
                }}
              >
                {[...selectedObject.spriteVersions].reverse().map((version) => {
                  const date = new Date(version.createdAt);
                  const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                  const isCurrentVersion = version.imageUrl === selectedObject.imageUrl;

                  return (
                    <div
                      key={version.version}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px',
                        marginBottom: '8px',
                        border: isCurrentVersion ? '2px solid #0D0D0D' : '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: isCurrentVersion ? '#E8DDD1' : '#fff',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          border: '1px solid #ccc',
                          backgroundImage: `url(${version.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                          borderRadius: '2px',
                          backgroundColor: '#fff',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, fontSize: '12px', color: '#333' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          v{version.version} {isCurrentVersion && '(Current)'}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px' }}>{formattedDate}</div>
                      </div>
                      {!isCurrentVersion && (
                        <button
                          onClick={() => handleRestoreVersion(version.imageUrl)}
                          style={{
                            padding: '4px 8px',
                            background: '#0D0D0D',
                            border: 'none',
                            borderRadius: '3px',
                            color: '#FFF1E5',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Preview (Actual Size):</label>
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '2px solid #ccc',
                backgroundImage: `url(${generatePreview()})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                borderRadius: '4px',
                backgroundColor: '#fff',
              }}
            />
          </div>

          <button
            onClick={handleSaveAndLink}
            disabled={!selectedObjectId}
            style={{
              width: '100%',
              padding: '12px',
              background: selectedObjectId ? '#22c55e' : '#555',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: selectedObjectId ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Save & Link Sprite
          </button>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {/* Canvas + Tools */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            {/* Canvas Area (Left) */}
            <div>
              {/* Fixed viewport with scrollable zoomed canvas */}
              <div
                ref={viewportRef}
                style={{
                  width: VIEWPORT_SIZE,
                  height: VIEWPORT_SIZE,
                  overflow: 'auto',
                  border: '2px solid #ccc',
                  background: '#E8DDD1',
                  borderRadius: '8px',
                }}
              >
                {/* Scrollable area that grows with zoom */}
                <div
                  style={{
                    width: scaledCanvasSize,
                    height: scaledCanvasSize,
                    padding: '10px',
                  }}
                >
                  {/* Canvas with tile borders - scaled */}
                  <div
                    style={{
                      position: 'relative',
                      width: BASE_CANVAS_SIZE,
                      height: BASE_CANVAS_SIZE,
                      background: '#000',
                      border: '1px solid #000',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    {/* Render 3x3 tiles */}
                    {Array.from({ length: TILES_PER_ROW }).map((_, tileRow) =>
                      Array.from({ length: TILES_PER_ROW }).map((_, tileCol) => {
                        const tileX = tileCol * (TILE_SIZE * PIXEL_SIZE + TILE_BORDER);
                        const tileY = tileRow * (TILE_SIZE * PIXEL_SIZE + TILE_BORDER);
                        return (
                          <div
                            key={`tile-${tileRow}-${tileCol}`}
                            style={{
                              position: 'absolute',
                              left: tileX,
                              top: tileY,
                              width: TILE_SIZE * PIXEL_SIZE,
                              height: TILE_SIZE * PIXEL_SIZE,
                              display: 'grid',
                              gridTemplateColumns: `repeat(${TILE_SIZE}, ${PIXEL_SIZE}px)`,
                              gridTemplateRows: `repeat(${TILE_SIZE}, ${PIXEL_SIZE}px)`,
                            }}
                          >
                            {/* Pixels within this tile */}
                            {Array.from({ length: TILE_SIZE }).map((_, localRow) =>
                              Array.from({ length: TILE_SIZE }).map((_, localCol) => {
                                const globalRow = tileRow * TILE_SIZE + localRow;
                                const globalCol = tileCol * TILE_SIZE + localCol;
                                const color = pixels[globalRow][globalCol];
                                // Checkerboard pattern for transparent pixels
                                const isCheckerWhite = (globalRow + globalCol) % 2 === 0;
                                const transparentColor = isCheckerWhite ? '#ffffff' : '#cccccc';

                                return (
                                  <div
                                    key={`${localRow}-${localCol}`}
                                    style={{
                                      width: PIXEL_SIZE,
                                      height: PIXEL_SIZE,
                                      backgroundColor: color === 'transparent' ? transparentColor : color,
                                    }}
                                  />
                                );
                              })
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Interaction grid overlay */}
                    {Array.from({ length: TILES_PER_ROW }).map((_, tileRow) =>
                      Array.from({ length: TILES_PER_ROW }).map((_, tileCol) => {
                        const tileX = tileCol * (TILE_SIZE * PIXEL_SIZE + TILE_BORDER);
                        const tileY = tileRow * (TILE_SIZE * PIXEL_SIZE + TILE_BORDER);
                        return (
                          <div
                            key={`interact-tile-${tileRow}-${tileCol}`}
                            style={{
                              position: 'absolute',
                              left: tileX,
                              top: tileY,
                              width: TILE_SIZE * PIXEL_SIZE,
                              height: TILE_SIZE * PIXEL_SIZE,
                              display: 'grid',
                              gridTemplateColumns: `repeat(${TILE_SIZE}, ${PIXEL_SIZE}px)`,
                              gridTemplateRows: `repeat(${TILE_SIZE}, ${PIXEL_SIZE}px)`,
                            }}
                          >
                            {Array.from({ length: TILE_SIZE }).map((_, localRow) =>
                              Array.from({ length: TILE_SIZE }).map((_, localCol) => {
                                const globalRow = tileRow * TILE_SIZE + localRow;
                                const globalCol = tileCol * TILE_SIZE + localCol;
                                return (
                                  <div
                                    key={`i-${localRow}-${localCol}`}
                                    onMouseDown={(e) => handleMouseDown(globalRow, globalCol, e)}
                                    onMouseEnter={() => handleMouseEnter(globalRow, globalCol)}
                                    style={{
                                      width: PIXEL_SIZE,
                                      height: PIXEL_SIZE,
                                      pointerEvents: 'all',
                                    }}
                                  />
                                );
                              })
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Clear Button (Below Canvas) */}
              <div style={{ marginTop: '15px' }}>
                <button
                  onClick={handleClear}
                  style={{
                    padding: '8px 16px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#0D0D0D' }}>Color Palette</h3>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Left-click to paint, right-click to erase</p>

              {/* Brush Size & Zoom */}
              <div style={{ display: 'flex', gap: '30px', marginBottom: '15px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#0D0D0D' }}>Brush Size: {brushSize}px</label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{
                      width: '150px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#0D0D0D' }}>
                    Zoom: {Math.round(zoom * 100)}%
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>(scroll on canvas)</span>
                  </label>
                  <button
                    onClick={() => setZoom(1)}
                    style={{
                      padding: '6px 12px',
                      background: zoom === 1 ? '#ccc' : '#0D0D0D',
                      border: 'none',
                      borderRadius: '4px',
                      color: zoom === 1 ? '#666' : '#FFF1E5',
                      cursor: zoom === 1 ? 'default' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    disabled={zoom === 1}
                  >
                    Reset Zoom
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 40px)',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                {DEFAULT_PALETTE.map((color, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: color,
                      border: selectedColor === color ? '3px solid #0D0D0D' : '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: selectedColor === color ? '0 0 10px rgba(13, 13, 13, 0.5)' : 'none',
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color picker */}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#0D0D0D' }}>Custom Color:</label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    style={{
                      width: '80px',
                      height: '40px',
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Selected color display */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#0D0D0D' }}>Selected:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: selectedColor,
                        border: '2px solid #ccc',
                        borderRadius: '4px',
                      }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0D0D0D' }}>{selectedColor}</span>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
