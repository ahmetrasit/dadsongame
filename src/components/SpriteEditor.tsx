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
  // Grayscale (12)
  '#000000', '#111111', '#222222', '#333333', '#444444', '#555555',
  '#666666', '#777777', '#888888', '#999999', '#aaaaaa', '#bbbbbb',
  '#cccccc', '#dddddd', '#eeeeee', '#ffffff', '#f5f5f5', '#fafafa',
  '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242',

  // Reds (24)
  '#1a0000', '#330000', '#4d0000', '#660000', '#800000', '#990000',
  '#b30000', '#cc0000', '#e60000', '#ff0000', '#ff1a1a', '#ff3333',
  '#ff4d4d', '#ff6666', '#ff8080', '#ff9999', '#ffb3b3', '#ffcccc',
  '#ffe6e6', '#fff0f0', '#d32f2f', '#c62828', '#b71c1c', '#ffebee',

  // Oranges (24)
  '#1a0a00', '#331400', '#4d1f00', '#662900', '#803300', '#993d00',
  '#b34700', '#cc5200', '#e65c00', '#ff6600', '#ff751a', '#ff8533',
  '#ff944d', '#ffa366', '#ffb380', '#ffc299', '#ffd1b3', '#ffe0cc',
  '#ffefe6', '#fff5f0', '#e65100', '#ef6c00', '#f57c00', '#fff3e0',

  // Yellows (24)
  '#1a1a00', '#333300', '#4d4d00', '#666600', '#808000', '#999900',
  '#b3b300', '#cccc00', '#e6e600', '#ffff00', '#ffff1a', '#ffff33',
  '#ffff4d', '#ffff66', '#ffff80', '#ffff99', '#ffffb3', '#ffffcc',
  '#ffffe6', '#fffff0', '#fdd835', '#fbc02d', '#f9a825', '#fffde7',

  // Lime & Yellow-Greens (24)
  '#0a1a00', '#143300', '#1f4d00', '#296600', '#338000', '#3d9900',
  '#47b300', '#52cc00', '#5ce600', '#66ff00', '#75ff1a', '#85ff33',
  '#94ff4d', '#a3ff66', '#b3ff80', '#c2ff99', '#d1ffb3', '#e0ffcc',
  '#efffeb', '#f5fff0', '#aeea00', '#c6ff00', '#cddc39', '#f0f4c3',

  // Greens (24)
  '#001a00', '#003300', '#004d00', '#006600', '#008000', '#009900',
  '#00b300', '#00cc00', '#00e600', '#00ff00', '#1aff1a', '#33ff33',
  '#4dff4d', '#66ff66', '#80ff80', '#99ff99', '#b3ffb3', '#ccffcc',
  '#e6ffe6', '#f0fff0', '#2e7d32', '#388e3c', '#43a047', '#e8f5e9',

  // Teals (24)
  '#001a1a', '#003333', '#004d4d', '#006666', '#008080', '#009999',
  '#00b3b3', '#00cccc', '#00e6e6', '#00ffff', '#1affff', '#33ffff',
  '#4dffff', '#66ffff', '#80ffff', '#99ffff', '#b3ffff', '#ccffff',
  '#e6ffff', '#f0ffff', '#00838f', '#00acc1', '#26c6da', '#e0f7fa',

  // Blues (24)
  '#00001a', '#000033', '#00004d', '#000066', '#000080', '#000099',
  '#0000b3', '#0000cc', '#0000e6', '#0000ff', '#1a1aff', '#3333ff',
  '#4d4dff', '#6666ff', '#8080ff', '#9999ff', '#b3b3ff', '#ccccff',
  '#e6e6ff', '#f0f0ff', '#1565c0', '#1976d2', '#2196f3', '#e3f2fd',

  // Indigos (24)
  '#0a001a', '#140033', '#1f004d', '#290066', '#330080', '#3d0099',
  '#4700b3', '#5200cc', '#5c00e6', '#6600ff', '#751aff', '#8533ff',
  '#944dff', '#a366ff', '#b380ff', '#c299ff', '#d1b3ff', '#e0ccff',
  '#efe6ff', '#f5f0ff', '#303f9f', '#3949ab', '#3f51b5', '#e8eaf6',

  // Purples (24)
  '#1a001a', '#330033', '#4d004d', '#660066', '#800080', '#990099',
  '#b300b3', '#cc00cc', '#e600e6', '#ff00ff', '#ff1aff', '#ff33ff',
  '#ff4dff', '#ff66ff', '#ff80ff', '#ff99ff', '#ffb3ff', '#ffccff',
  '#ffe6ff', '#fff0ff', '#7b1fa2', '#8e24aa', '#9c27b0', '#f3e5f5',

  // Pinks (24)
  '#1a000a', '#330014', '#4d001f', '#660029', '#800033', '#99003d',
  '#b30047', '#cc0052', '#e6005c', '#ff0066', '#ff1a75', '#ff3385',
  '#ff4d94', '#ff66a3', '#ff80b3', '#ff99c2', '#ffb3d1', '#ffcce0',
  '#ffe6ef', '#fff0f5', '#c2185b', '#d81b60', '#e91e63', '#fce4ec',

  // Browns (24)
  '#1a0f00', '#2d1a00', '#402600', '#533300', '#664000', '#7a4d00',
  '#8d5a00', '#a06600', '#b37300', '#c68000', '#d98c00', '#ec9900',
  '#8d6e63', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#3e2723',
  '#a1887f', '#bcaaa4', '#d7ccc8', '#efebe9', '#4a2c2a', '#3b1f1c',

  // Skin Tones (12)
  '#8d5524', '#a0522d', '#b5651d', '#c68642', '#d2a679', '#e0ac69',
  '#f1c27d', '#ffcd94', '#ffdbac', '#ffe4c4', '#ffecd9', '#fff5eb',

  // Nature & Earth (24)
  '#1b4d1b', '#228b22', '#2e8b57', '#3cb371', '#556b2f', '#6b8e23',
  '#808000', '#9acd32', '#8b4513', '#a0522d', '#cd853f', '#daa520',
  '#b8860b', '#d2691e', '#f4a460', '#deb887', '#d2b48c', '#c4a484',
  '#bc8f8f', '#f5deb3', '#ffdead', '#ffe4b5', '#ffdab9', '#ffe4c4',

  // Pastels (24)
  '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8d5e8',
  '#ffd1dc', '#ffefd5', '#fffacd', '#e0ffff', '#e6e6fa', '#fff0f5',
  '#f0fff0', '#f5fffa', '#f0f8ff', '#f8f8ff', '#fffaf0', '#fdf5e6',
  '#faf0e6', '#fff5ee', '#faebd7', '#ffebcd', '#f5f5dc', '#fffff0',

  // Metallics & Special (12)
  '#ffd700', '#ffdf00', '#c0c0c0', '#d4af37', '#b87333', '#cd7f32',
  '#e5c100', '#cfb53b', '#c9bbe0', '#b0c4de', '#708090', '#2f4f4f',
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

              {/* Scrollable color palette */}
              <div
                style={{
                  height: '200px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: '20px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 32px)',
                    gap: '4px',
                  }}
                >
                  {DEFAULT_PALETTE.map((color, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: selectedColor === color ? '3px solid #0D0D0D' : '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        boxShadow: selectedColor === color ? '0 0 8px rgba(13, 13, 13, 0.5)' : 'none',
                      }}
                      title={color}
                    />
                  ))}
                </div>
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
