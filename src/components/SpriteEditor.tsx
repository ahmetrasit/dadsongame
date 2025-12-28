import { useState, useEffect, useMemo, useRef } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { generatePlantPreview, generateAnimalPreview, generateResourcePreview } from '@/utils/generatePreviewImage';

interface SpriteEditorProps {
  onClose: () => void;
}

type Mode = 'pixel' | 'freeform';
type Tool = 'paint' | 'erase';
type Shape = 'circle' | 'square' | 'roundedSquare' | 'triangle' | 'line';

interface DrawnShape {
  type: Shape;
  centerX: number;
  centerY: number;
  size: number;
  borderThickness: number;
  borderColor: string;
  fillColor: string;
}

const GRID_SIZE = 16;
const CANVAS_SIZE = 300; // Keep canvas size consistent
const PIXEL_SIZE = CANVAS_SIZE / GRID_SIZE; // 18.75px per pixel

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
  const { spriteEditorContext } = useGameStateStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [mode, setMode] = useState<Mode>('pixel');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<Tool>('paint');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<'plant' | 'animal' | 'resource'>('plant');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Free-form mode states
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [selectedShape, setSelectedShape] = useState<Shape>('circle');
  const [shapeSize, setShapeSize] = useState(3);
  const [borderThickness, setBorderThickness] = useState(1);
  const [borderColor, setBorderColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');

  // Preview state for free-form mode
  const [previewShape, setPreviewShape] = useState<DrawnShape | null>(null);

  // Initialize from context on mount
  useEffect(() => {
    if (spriteEditorContext.objectType && spriteEditorContext.objectId) {
      setSelectedObjectType(spriteEditorContext.objectType);
      setSelectedObjectId(spriteEditorContext.objectId);
    }
  }, []);

  // Prevent default behavior
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  // Draw smooth shape on canvas (free-form mode)
  const drawSmoothShapeOnCanvas = (ctx: CanvasRenderingContext2D, shape: DrawnShape) => {
    const { type, centerX, centerY, size, borderThickness, borderColor, fillColor } = shape;
    const radius = size * PIXEL_SIZE / 2;

    ctx.save();

    if (type === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness * 2;
        ctx.stroke();
      }
    } else if (type === 'square') {
      const halfSize = radius;
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fillRect(centerX - halfSize, centerY - halfSize, halfSize * 2, halfSize * 2);
      }
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness * 2;
        ctx.strokeRect(centerX - halfSize, centerY - halfSize, halfSize * 2, halfSize * 2);
      }
    } else if (type === 'roundedSquare') {
      const halfSize = radius;
      const cornerRadius = halfSize / 4;
      const x = centerX - halfSize;
      const y = centerY - halfSize;
      const width = halfSize * 2;
      const height = halfSize * 2;

      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, y);
      ctx.lineTo(x + width - cornerRadius, y);
      ctx.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);
      ctx.lineTo(x + width, y + height - cornerRadius);
      ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
      ctx.lineTo(x + cornerRadius, y + height);
      ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
      ctx.lineTo(x, y + cornerRadius);
      ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
      ctx.closePath();

      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness * 2;
        ctx.stroke();
      }
    } else if (type === 'triangle') {
      const height = size * PIXEL_SIZE;
      const halfHeight = height / 2;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - halfHeight);
      ctx.lineTo(centerX - halfHeight, centerY + halfHeight);
      ctx.lineTo(centerX + halfHeight, centerY + halfHeight);
      ctx.closePath();

      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness * 2;
        ctx.stroke();
      }
    } else if (type === 'line') {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderThickness * 2;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Render all shapes on canvas including preview
  const renderShapesToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw all permanent shapes
    shapes.forEach(shape => drawSmoothShapeOnCanvas(ctx, shape));

    // Draw preview shape with lower opacity
    if (previewShape && mode === 'freeform') {
      ctx.globalAlpha = 0.5;
      drawSmoothShapeOnCanvas(ctx, previewShape);
      ctx.globalAlpha = 1.0;
    }
  };

  // Update canvas when shapes or preview change
  useEffect(() => {
    renderShapesToCanvas();
  }, [shapes, previewShape, mode]);

  // Handle mouse move for preview (free-form mode)
  const handleMouseMove = (row: number, col: number) => {
    if (mode === 'freeform') {
      const centerX = col * PIXEL_SIZE + PIXEL_SIZE / 2;
      const centerY = row * PIXEL_SIZE + PIXEL_SIZE / 2;

      const preview: DrawnShape = {
        type: selectedShape,
        centerX,
        centerY,
        size: shapeSize,
        borderThickness,
        borderColor,
        fillColor,
      };

      setPreviewShape(preview);
    }
  };

  // Handle click to place shape or paint pixel
  const handleClick = (row: number, col: number) => {
    if (mode === 'freeform') {
      // Free-form mode: place shape on click
      const centerX = col * PIXEL_SIZE + PIXEL_SIZE / 2;
      const centerY = row * PIXEL_SIZE + PIXEL_SIZE / 2;

      const newShape: DrawnShape = {
        type: selectedShape,
        centerX,
        centerY,
        size: shapeSize,
        borderThickness,
        borderColor,
        fillColor,
      };

      setShapes(prev => [...prev, newShape]);
    } else {
      // Pixel mode - paint single pixel on click
      setPixels(prev => {
        const newPixels = prev.map(r => [...r]);
        newPixels[row][col] = tool === 'paint' ? selectedColor : 'transparent';
        return newPixels;
      });
    }
  };

  // Handle mouse down for pixel mode dragging
  const handleMouseDown = (row: number, col: number) => {
    if (mode === 'pixel') {
      setIsMouseDown(true);
      handleClick(row, col);
    } else {
      handleClick(row, col);
    }
  };

  // Handle mouse enter for pixel mode dragging
  const handleMouseEnter = (row: number, col: number) => {
    handleMouseMove(row, col);

    if (mode === 'pixel' && isMouseDown) {
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

  const handleMouseLeave = () => {
    setPreviewShape(null);
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

  // Clear canvas (clears both pixels and shapes)
  const handleClear = () => {
    setPixels(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent')));
    setShapes([]);
  };

  // Generate sprite as data URL (combines both pixels AND shapes)
  const generateSpriteDataURL = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // First, draw pixels (scaled up to CANVAS_SIZE)
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const color = pixels[row][col];
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(col * PIXEL_SIZE, row * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    // Then, draw shapes on top (if any) - already at CANVAS_SIZE scale
    if (shapes.length > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw all shapes (no scaling needed - they're already in canvas coordinates)
      shapes.forEach(shape => drawSmoothShapeOnCanvas(ctx, shape));
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

  // Get all sprite versions from all objects
  const getAllSpriteVersions = useMemo(() => {
    const allVersions: Array<{
      objectType: 'plant' | 'animal' | 'resource';
      objectId: string;
      objectName: string;
      version: number;
      imageUrl: string;
      createdAt: number;
    }> = [];

    // Collect from plants
    plants.forEach(plant => {
      if (plant.spriteVersions) {
        plant.spriteVersions.forEach(v => {
          allVersions.push({
            objectType: 'plant',
            objectId: plant.id,
            objectName: plant.name,
            version: v.version,
            imageUrl: v.imageUrl,
            createdAt: v.createdAt,
          });
        });
      }
    });

    // Collect from animals
    animals.forEach(animal => {
      if (animal.spriteVersions) {
        animal.spriteVersions.forEach(v => {
          allVersions.push({
            objectType: 'animal',
            objectId: animal.id,
            objectName: animal.name,
            version: v.version,
            imageUrl: v.imageUrl,
            createdAt: v.createdAt,
          });
        });
      }
    });

    // Collect from resources
    resources.forEach(resource => {
      if (resource.spriteVersions) {
        resource.spriteVersions.forEach(v => {
          allVersions.push({
            objectType: 'resource',
            objectId: resource.id,
            objectName: resource.name,
            version: v.version,
            imageUrl: v.imageUrl,
            createdAt: v.createdAt,
          });
        });
      }
    });

    // Sort by created date descending (newest first)
    return allVersions.sort((a, b) => b.createdAt - a.createdAt);
  }, [plants, animals, resources]);

  // Load a sprite onto the canvas (creates a copy)
  const handleLoadSprite = (imageUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = CANVAS_SIZE;
      tempCanvas.height = CANVAS_SIZE;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw image onto temp canvas
      tempCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      tempCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (mode === 'pixel') {
        // Convert to pixel grid
        const newPixels = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'));

        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            const x = col * PIXEL_SIZE;
            const y = row * PIXEL_SIZE;
            const imageData = tempCtx.getImageData(x, y, 1, 1);
            const [r, g, b, a] = imageData.data;

            if (a > 0) {
              const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
              newPixels[row][col] = hex;
            }
          }
        }

        setPixels(newPixels);
      } else {
        // For freeform mode, draw the image directly on the canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Clear shapes as we're loading a new image
        setShapes([]);
      }

      setShowLoadModal(false);
      alert('Sprite loaded successfully! You can now edit it.');
    };
    img.src = imageUrl;
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
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Sprite Editor (10x10 pixels)</h1>
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
            onClick={() => setShowLoadModal(true)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px',
            }}
          >
            Load Sprite
          </button>

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
          {/* Mode Toggle (Top) */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Mode</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setMode('pixel')}
                style={{
                  padding: '8px 16px',
                  background: mode === 'pixel' ? '#3b82f6' : '#444',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: mode === 'pixel' ? 'bold' : 'normal',
                }}
              >
                Pixel Mode
              </button>
              <button
                onClick={() => setMode('freeform')}
                style={{
                  padding: '8px 16px',
                  background: mode === 'freeform' ? '#3b82f6' : '#444',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: mode === 'freeform' ? 'bold' : 'normal',
                }}
              >
                Free-form Mode
              </button>
            </div>
          </div>

          {/* Middle Row: Canvas + Tools */}
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
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Pixel grid background */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_SIZE}, ${PIXEL_SIZE}px)`,
                      gap: '0px',
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

                  {/* Canvas overlay for smooth shapes */}
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      cursor: 'crosshair',
                      pointerEvents: 'none',
                    }}
                  />

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

            {/* Shape Tools (Right side - only in free-form mode) */}
            {mode === 'freeform' && (
              <div style={{ minWidth: '250px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Shape Tools</h3>

                {/* Shape Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Shape:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedShape('circle')}
                      style={{
                        padding: '8px 12px',
                        background: selectedShape === 'circle' ? '#3b82f6' : '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Circle
                    </button>
                    <button
                      onClick={() => setSelectedShape('square')}
                      style={{
                        padding: '8px 12px',
                        background: selectedShape === 'square' ? '#3b82f6' : '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Square
                    </button>
                    <button
                      onClick={() => setSelectedShape('roundedSquare')}
                      style={{
                        padding: '8px 12px',
                        background: selectedShape === 'roundedSquare' ? '#3b82f6' : '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Rounded
                    </button>
                    <button
                      onClick={() => setSelectedShape('triangle')}
                      style={{
                        padding: '8px 12px',
                        background: selectedShape === 'triangle' ? '#3b82f6' : '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Triangle
                    </button>
                    <button
                      onClick={() => setSelectedShape('line')}
                      style={{
                        padding: '8px 12px',
                        background: selectedShape === 'line' ? '#3b82f6' : '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Line
                    </button>
                  </div>
                </div>

                {/* Size Control */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                    Size: {shapeSize}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={shapeSize}
                    onChange={(e) => setShapeSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Border Thickness Control */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                    Border Thickness: {borderThickness}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={borderThickness}
                    onChange={(e) => setBorderThickness(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Border Color */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Border Color:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      style={{
                        width: '60px',
                        height: '40px',
                        border: '2px solid #555',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{borderColor}</span>
                  </div>
                </div>

                {/* Fill Color */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Fill Color:</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="color"
                      value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      disabled={fillColor === 'transparent'}
                      style={{
                        width: '60px',
                        height: '40px',
                        border: '2px solid #555',
                        borderRadius: '4px',
                        cursor: fillColor === 'transparent' ? 'not-allowed' : 'pointer',
                        opacity: fillColor === 'transparent' ? 0.5 : 1,
                      }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{fillColor}</span>
                  </div>
                  <button
                    onClick={() => setFillColor(fillColor === 'transparent' ? '#ffffff' : 'transparent')}
                    style={{
                      padding: '6px 12px',
                      background: fillColor === 'transparent' ? '#3b82f6' : '#444',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {fillColor === 'transparent' ? 'Transparent' : 'Make Transparent'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Palette - Only in pixel mode */}
          {mode === 'pixel' && (
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
          )}
        </div>
      </div>

      {/* Load Sprite Modal */}
      {showLoadModal && (
        <div
          onClick={() => setShowLoadModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={stopProp}
            style={{
              background: '#1a1a2e',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '2px solid #3b82f6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Load Existing Sprite</h2>
              <button
                onClick={() => setShowLoadModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#990F3D',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Close
              </button>
            </div>

            {getAllSpriteVersions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                No sprite versions found. Create and save some sprites first!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                {getAllSpriteVersions.map((sprite, idx) => {
                  const date = new Date(sprite.createdAt);
                  const formattedDate = date.toLocaleDateString();

                  return (
                    <div
                      key={idx}
                      onClick={() => handleLoadSprite(sprite.imageUrl)}
                      style={{
                        background: '#2a2a3e',
                        borderRadius: '6px',
                        padding: '8px',
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '60px',
                          backgroundImage: `url(${sprite.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated',
                          borderRadius: '4px',
                          backgroundColor: '#1a1a2e',
                          marginBottom: '6px',
                        }}
                      />
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sprite.objectName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                        {sprite.objectType.charAt(0).toUpperCase() + sprite.objectType.slice(1)} v{sprite.version}
                      </div>
                      <div style={{ fontSize: '9px', color: '#666' }}>
                        {formattedDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
