import { useState, useEffect, useMemo } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { generatePlantPreview, generateAnimalPreview, generateResourcePreview } from '@/utils/generatePreviewImage';

interface SpriteEditorProps {
  onClose: () => void;
}

type Tool = 'paint' | 'erase';

const GRID_SIZE = 14;
const PIXEL_SIZE = 24; // Display size of each pixel
const CANVAS_SIZE = GRID_SIZE * PIXEL_SIZE; // 336px

const DEFAULT_PALETTE = [
  '#000000', '#ffffff', '#f5f5f5', '#d1d5db', '#6b7280', '#1f2937',
  '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
  '#ea580c', '#f59e0b', '#fbbf24', '#fde68a', '#fef3c7',
  '#eab308', '#ca8a04', '#a16207', '#78350f', '#451a03',
  '#65a30d', '#84cc16', '#a3e635', '#22c55e', '#15803d',
  '#166534', '#0f4c2a', '#047857', '#059669', '#10b981',
  '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a',
  '#0ea5e9', '#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe',
  '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3',
  '#92400e', '#b45309', '#d97706', '#e19d2b', '#fcd34d',
];

export function SpriteEditor({ onClose }: SpriteEditorProps) {
  const { plants, animals, resources } = useDefinitionsStore();

  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<Tool>('paint');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<'plant' | 'animal' | 'resource'>('plant');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');

  // Prevent default behavior
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  // Handle click to paint pixel
  const handleClick = (row: number, col: number) => {
    setPixels(prev => {
      const newPixels = prev.map(r => [...r]);
      newPixels[row][col] = tool === 'paint' ? selectedColor : 'transparent';
      return newPixels;
    });
  };

  // Handle mouse down for dragging
  const handleMouseDown = (row: number, col: number) => {
    setIsMouseDown(true);
    handleClick(row, col);
  };

  // Handle mouse enter for dragging
  const handleMouseEnter = (row: number, col: number) => {
    if (isMouseDown) {
      setPixels(prev => {
        const newPixels = prev.map(r => [...r]);
        newPixels[row][col] = tool === 'paint' ? selectedColor : 'transparent';
        return newPixels;
      });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
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
        background: '#1a1a2e',
        zIndex: 2000,
        color: '#e0e0e0',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '14px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #333', background: '#0f0f1e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Sprite Editor (14x14 pixels)</h1>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
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
        <div style={{ width: '300px', padding: '20px', borderRight: '1px solid #333', overflowY: 'auto', background: '#0f0f1e' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Link to Object</h2>

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
                background: '#1a1a2e',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#e0e0e0',
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
                background: '#1a1a2e',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#e0e0e0',
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
                  border: '2px solid #444',
                  backgroundImage: `url(${currentObjectImage})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated',
                  borderRadius: '4px',
                  backgroundColor: '#1a1a2e',
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
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: '#1a1a2e',
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
                        border: isCurrentVersion ? '2px solid #3b82f6' : '1px solid #444',
                        borderRadius: '4px',
                        backgroundColor: isCurrentVersion ? '#1e3a5f' : '#2a2a3e',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          border: '1px solid #666',
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
                      <div style={{ flex: 1, fontSize: '12px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          v{version.version} {isCurrentVersion && '(Current)'}
                        </div>
                        <div style={{ color: '#999', fontSize: '11px' }}>{formattedDate}</div>
                      </div>
                      {!isCurrentVersion && (
                        <button
                          onClick={() => handleRestoreVersion(version.imageUrl)}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '3px',
                            color: 'white',
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
                border: '2px solid #444',
                backgroundImage: `url(${generatePreview()})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                borderRadius: '4px',
                backgroundColor: '#1a1a2e',
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
              <div
                style={{
                  display: 'inline-block',
                  border: '2px solid #444',
                  background: '#2a2a3e',
                  padding: '10px',
                  borderRadius: '8px',
                }}
              >
                {/* Canvas with both pixel grid AND canvas overlay */}
                <div
                  style={{
                    position: 'relative',
                    width: CANVAS_SIZE,
                    height: CANVAS_SIZE,
                    background: '#fff',
                    border: '1px solid #666',
                  }}
                >
                  {/* Pixel grid background */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_SIZE}, ${PIXEL_SIZE}px)`,
                      gap: '1px',
                      background: '#444',
                      width: CANVAS_SIZE,
                      height: CANVAS_SIZE,
                    }}
                  >
                    {pixels.map((row, rowIndex) =>
                      row.map((color, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          style={{
                            width: PIXEL_SIZE,
                            height: PIXEL_SIZE,
                            backgroundColor: color === 'transparent' ? '#fff' : color,
                            border: '1px solid rgba(0,0,0,0.1)',
                            backgroundImage: color === 'transparent'
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                              : 'none',
                            backgroundSize: color === 'transparent' ? '10px 10px' : 'auto',
                            backgroundPosition: color === 'transparent' ? '0 0, 0 5px, 5px -5px, -5px 0px' : 'auto',
                          }}
                        />
                      ))
                    )}
                  </div>

                  {/* Interaction grid overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_SIZE}, ${PIXEL_SIZE}px)`,
                      width: CANVAS_SIZE,
                      height: CANVAS_SIZE,
                    }}
                  >
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                      const rowIndex = Math.floor(index / GRID_SIZE);
                      const colIndex = index % GRID_SIZE;
                      return (
                        <div
                          key={index}
                          onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                          onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                          style={{
                            width: PIXEL_SIZE,
                            height: PIXEL_SIZE,
                            pointerEvents: 'all',
                          }}
                        />
                      );
                    })}
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
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Color Palette</h3>

              {/* Tools */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setTool('paint')}
                    style={{
                      padding: '8px 16px',
                      background: tool === 'paint' ? '#3b82f6' : '#444',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Paint
                  </button>
                  <button
                    onClick={() => setTool('erase')}
                    style={{
                      padding: '8px 16px',
                      background: tool === 'erase' ? '#3b82f6' : '#444',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Erase
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
                      border: selectedColor === color ? '3px solid #3b82f6' : '2px solid #555',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: selectedColor === color ? '0 0 10px #3b82f6' : 'none',
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color picker */}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Custom Color:</label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    style={{
                      width: '80px',
                      height: '40px',
                      border: '2px solid #555',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Selected color display */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Selected:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: selectedColor,
                        border: '2px solid #555',
                        borderRadius: '4px',
                      }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{selectedColor}</span>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
