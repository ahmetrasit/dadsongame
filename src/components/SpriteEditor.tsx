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
  // Grayscale
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff',

  // Reds - dark to light with rich tones
  '#1a0000', '#330000', '#4d0000', '#660000', '#800000', '#990000', '#b30000', '#cc0000',
  '#e60000', '#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc',
  '#8b0000', '#a52a2a', '#b22222', '#cd5c5c', '#dc143c', '#c41e3a',

  // Oranges - including burnt orange, terracotta, rust
  '#331400', '#4d2600', '#663300', '#804000', '#994d00', '#b35900', '#cc6600', '#e67300',
  '#ff8000', '#ff9933', '#ffad5c', '#ffc285', '#cc5500', '#e65c00',
  '#d2691e', '#cd853f', '#ff7f50', '#ff6347', '#e2725b', '#c04000',

  // Yellows - including ochre, gold, mustard, amber
  '#1a1a00', '#333300', '#4d4d00', '#666600', '#808000', '#999900', '#b3b300', '#cccc00',
  '#e6e600', '#ffff00', '#ffff33', '#ffff66', '#ffff99', '#ffffcc',
  '#ffd700', '#daa520', '#b8860b', '#cd9b1d', '#eec900', '#f0c420', '#d4a017', '#c5a000',

  // Earth Tones - clay, terracotta, rust, sand
  '#8b4513', '#a0522d', '#6b4423', '#8b5a2b', '#cd853f', '#d2691e', '#b8860b',
  '#deb887', '#d2b48c', '#c4a76c', '#bdb76b', '#f5deb3', '#faebd7', '#ffe4c4',
  '#cc7722', '#c19a6b', '#e3a857', '#cfb53b', '#daa06d', '#c68e17',

  // Browns - chocolate, coffee, walnut, chestnut, sienna
  '#1a0f00', '#2d1a00', '#3d2b1f', '#4a2c2a', '#5c4033', '#6b4423', '#7b3f00',
  '#8b4513', '#964b00', '#a0522d', '#a52a2a', '#6f4e37', '#4b3621', '#3b2f2f',
  '#8b7355', '#9b7653', '#a67b5b', '#bc8f8f', '#c4a484', '#d2b48c', '#deb887',

  // Greens - forest, olive, moss, sage, hunter
  '#0a1a00', '#143300', '#1e4d00', '#286600', '#328000', '#3c9900', '#46b300', '#50cc00',
  '#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc',
  '#228b22', '#2e8b57', '#3cb371', '#006400', '#008000', '#355e3b',
  '#556b2f', '#6b8e23', '#808000', '#9acd32', '#6b8e23', '#4f7942',
  '#8fbc8f', '#90ee90', '#98fb98', '#adff2f',

  // Teals & Cyans
  '#003333', '#004d4d', '#006666', '#008080', '#009999', '#00b3b3', '#00cccc',
  '#00ffff', '#33ffff', '#66ffff', '#99ffff', '#ccffff',
  '#008b8b', '#20b2aa', '#40e0d0', '#48d1cc', '#00ced1', '#5f9ea0',

  // Blues - navy, midnight, steel, slate
  '#000033', '#00004d', '#000066', '#000080', '#000099', '#0000b3', '#0000cc', '#0000e6',
  '#0000ff', '#3333ff', '#6666ff', '#9999ff', '#ccccff',
  '#191970', '#00008b', '#0000cd', '#4169e1', '#1e90ff', '#4682b4',
  '#5f9ea0', '#6495ed', '#87ceeb', '#add8e6', '#b0c4de',

  // Purples & Violets - plum, eggplant, wine
  '#1a001a', '#330033', '#4d004d', '#660066', '#800080', '#990099', '#b300b3', '#cc00cc',
  '#ff00ff', '#ff33ff', '#ff66ff', '#ff99ff', '#ffccff',
  '#4b0082', '#6a0dad', '#8b008b', '#9400d3', '#9932cc', '#ba55d3',
  '#800020', '#722f37', '#5d3954', '#673147', '#702963',

  // Pinks & Rose
  '#330019', '#4d0026', '#660033', '#800040', '#99004d', '#b3005a', '#cc0066',
  '#ff0080', '#ff3399', '#ff66b3', '#ff99cc', '#ffcce6',
  '#c71585', '#db7093', '#ff69b4', '#ffb6c1', '#ffc0cb',
  '#e75480', '#de5d83', '#f08080', '#fa8072', '#e9967a',

  // Skin Tones
  '#8d5524', '#a0522d', '#b5651d', '#c68642', '#d2a679', '#e0ac69',
  '#f1c27d', '#ffcd94', '#ffdbac', '#ffe4c4', '#ffecd9', '#fff5eb',
  '#4a2c2a', '#6b4423', '#8b5a2b',

  // Metallics & Stone
  '#2f4f4f', '#36454f', '#4a4a4a', '#696969', '#708090', '#778899', '#808080',
  '#a9a9a9', '#c0c0c0', '#d3d3d3',
  '#ffd700', '#daa520', '#b8860b', '#d4af37', '#cfb53b',
  '#b87333', '#cd7f32', '#b08d57', '#c9ae5d',
];

export function SpriteEditor({ onClose }: SpriteEditorProps) {
  const { plants, animals, resources } = useDefinitionsStore();

  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1); // Zoom level: 0.5x to 2x
  const [currentTool, setCurrentTool] = useState<'paint' | 'square' | 'circle'>('paint');
  const [shapeStart, setShapeStart] = useState<{ row: number; col: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ row: number; col: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<'plant' | 'animal' | 'resource'>('plant');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');

  // Color management state
  const [colorNames, setColorNames] = useState<Record<string, string>>({});
  const [colorGroups, setColorGroups] = useState<{ id: string; name: string; colors: string[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Ref for viewport to handle scroll-based zoom
  const viewportRef = useRef<HTMLDivElement>(null);

  // Calculate scaled canvas size for scrollable area
  const scaledCanvasSize = BASE_CANVAS_SIZE * zoom;

  // Filter colors based on search and group
  const filteredColors = useMemo(() => {
    let colors = DEFAULT_PALETTE;

    // Filter by group
    if (selectedGroupFilter) {
      const group = colorGroups.find(g => g.id === selectedGroupFilter);
      if (group) {
        colors = group.colors.filter(c => DEFAULT_PALETTE.includes(c) || true);
      }
    }

    // Filter by search query (search in color names)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      colors = colors.filter(color => {
        const name = colorNames[color]?.toLowerCase() || '';
        const hex = color.toLowerCase();
        return name.includes(query) || hex.includes(query);
      });
    }

    return colors;
  }, [searchQuery, selectedGroupFilter, colorGroups, colorNames]);

  // Color management functions
  const nameColor = (color: string, name: string) => {
    setColorNames(prev => ({ ...prev, [color]: name }));
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      colors: [],
    };
    setColorGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
  };

  const deleteGroup = (groupId: string) => {
    setColorGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroupFilter === groupId) {
      setSelectedGroupFilter(null);
    }
  };

  const addColorToGroup = (groupId: string, color: string) => {
    setColorGroups(prev => prev.map(g => {
      if (g.id === groupId && !g.colors.includes(color)) {
        return { ...g, colors: [...g.colors, color] };
      }
      return g;
    }));
  };


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

  // Center canvas in viewport
  const centerCanvas = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Get actual scrollable dimensions
    const scrollWidth = viewport.scrollWidth;
    const scrollHeight = viewport.scrollHeight;
    const clientWidth = viewport.clientWidth;
    const clientHeight = viewport.clientHeight;

    // Calculate scroll position to center
    const scrollLeft = Math.max(0, (scrollWidth - clientWidth) / 2);
    const scrollTop = Math.max(0, (scrollHeight - clientHeight) / 2);

    viewport.scrollLeft = scrollLeft;
    viewport.scrollTop = scrollTop;
  }, [zoom]);

  // Lock scroll position while painting to prevent annoying scroll during paint
  const scrollLockRef = useRef<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      // If we're painting/drawing, lock the scroll position
      if ((isMouseDown || isRightMouseDown) && scrollLockRef.current) {
        viewport.scrollLeft = scrollLockRef.current.left;
        viewport.scrollTop = scrollLockRef.current.top;
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [isMouseDown, isRightMouseDown]);

  // Store scroll position when starting to paint
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (isMouseDown || isRightMouseDown) {
      scrollLockRef.current = {
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
      };
    } else {
      scrollLockRef.current = null;
    }
  }, [isMouseDown, isRightMouseDown]);

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

  // Get pixels for a rectangle shape
  const getSquarePixels = (start: { row: number; col: number }, end: { row: number; col: number }) => {
    const pixels: { row: number; col: number }[] = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          pixels.push({ row: r, col: c });
        }
      }
    }
    return pixels;
  };

  // Get pixels for an ellipse/circle shape
  const getCirclePixels = (start: { row: number; col: number }, end: { row: number; col: number }) => {
    const pixels: { row: number; col: number }[] = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    const centerRow = (minRow + maxRow) / 2;
    const centerCol = (minCol + maxCol) / 2;
    const radiusRow = (maxRow - minRow) / 2;
    const radiusCol = (maxCol - minCol) / 2;

    if (radiusRow === 0 || radiusCol === 0) return pixels;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // Check if point is inside ellipse
        const normalizedRow = (r - centerRow) / radiusRow;
        const normalizedCol = (c - centerCol) / radiusCol;
        if (normalizedRow * normalizedRow + normalizedCol * normalizedCol <= 1) {
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            pixels.push({ row: r, col: c });
          }
        }
      }
    }
    return pixels;
  };

  // Draw shape to canvas
  const drawShape = (erase: boolean) => {
    if (!shapeStart || !shapeEnd) return;

    const shapePixels = currentTool === 'square'
      ? getSquarePixels(shapeStart, shapeEnd)
      : getCirclePixels(shapeStart, shapeEnd);

    setPixels(prev => {
      const newPixels = prev.map(r => [...r]);
      shapePixels.forEach(({ row, col }) => {
        newPixels[row][col] = erase ? 'transparent' : selectedColor;
      });
      return newPixels;
    });
  };

  // Get preview pixels for current shape
  const shapePreviewPixels = useMemo(() => {
    if (!shapeStart || !shapeEnd) return new Set<string>();
    const pixels = currentTool === 'square'
      ? getSquarePixels(shapeStart, shapeEnd)
      : getCirclePixels(shapeStart, shapeEnd);
    return new Set(pixels.map(p => `${p.row}-${p.col}`));
  }, [shapeStart, shapeEnd, currentTool]);

  // Handle mouse down
  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (currentTool === 'paint') {
      if (e.button === 2) {
        setIsRightMouseDown(true);
        paintPixels(row, col, true);
      } else if (e.button === 0) {
        setIsMouseDown(true);
        paintPixels(row, col, false);
      }
    } else {
      // Shape tools
      if (e.button === 0 || e.button === 2) {
        setShapeStart({ row, col });
        setShapeEnd({ row, col });
        if (e.button === 2) {
          setIsRightMouseDown(true);
        } else {
          setIsMouseDown(true);
        }
      }
    }
  };

  // Handle mouse enter for dragging
  const handleMouseEnter = (row: number, col: number) => {
    if (currentTool === 'paint') {
      if (isMouseDown) {
        paintPixels(row, col, false);
      } else if (isRightMouseDown) {
        paintPixels(row, col, true);
      }
    } else {
      // Shape tools - update end point while dragging
      if (isMouseDown || isRightMouseDown) {
        setShapeEnd({ row, col });
      }
    }
  };

  const handleMouseUp = useCallback(() => {
    // If using shape tool and we have both points, draw the shape
    if (currentTool !== 'paint' && shapeStart && shapeEnd) {
      drawShape(isRightMouseDown);
    }
    setIsMouseDown(false);
    setIsRightMouseDown(false);
    setShapeStart(null);
    setShapeEnd(null);
  }, [currentTool, shapeStart, shapeEnd, isRightMouseDown, selectedColor]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

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

          {/* Tools Section */}
          <div style={{ marginTop: '25px', borderTop: '1px solid #E8DDD1', paddingTop: '20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#0D0D0D' }}>Tools</h2>

            {/* Tool Selection */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentTool('paint')}
                style={{
                  padding: '8px 14px',
                  background: currentTool === 'paint' ? '#0D0D0D' : '#E8DDD1',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  color: currentTool === 'paint' ? '#FFF1E5' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Paint
              </button>
              <button
                onClick={() => setCurrentTool('square')}
                style={{
                  padding: '8px 14px',
                  background: currentTool === 'square' ? '#0D0D0D' : '#E8DDD1',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  color: currentTool === 'square' ? '#FFF1E5' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Rect
              </button>
              <button
                onClick={() => setCurrentTool('circle')}
                style={{
                  padding: '8px 14px',
                  background: currentTool === 'circle' ? '#0D0D0D' : '#E8DDD1',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  color: currentTool === 'circle' ? '#FFF1E5' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Ellipse
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
              {currentTool === 'paint'
                ? 'Left-click paint, right-click erase'
                : 'Drag to draw, right-click erases'}
            </p>

            {/* Brush Size */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#0D0D0D', fontSize: '13px' }}>
                Brush: {brushSize}px
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Zoom */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#0D0D0D', fontSize: '13px' }}>
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setZoom(1)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: zoom === 1 ? '#ccc' : '#0D0D0D',
                    border: 'none',
                    borderRadius: '4px',
                    color: zoom === 1 ? '#666' : '#FFF1E5',
                    cursor: zoom === 1 ? 'default' : 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                  disabled={zoom === 1}
                >
                  Reset
                </button>
                <button
                  onClick={centerCanvas}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: '#0D0D0D',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#FFF1E5',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  Center
                </button>
              </div>
              <p style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Scroll on canvas to zoom</p>
            </div>

            {/* Clear All */}
            <button
              onClick={handleClear}
              style={{
                width: '100%',
                padding: '10px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Clear All
            </button>
          </div>
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
                                // Check if pixel is in shape preview
                                const isInShapePreview = shapePreviewPixels.has(`${globalRow}-${globalCol}`);

                                return (
                                  <div
                                    key={`${localRow}-${localCol}`}
                                    style={{
                                      width: PIXEL_SIZE,
                                      height: PIXEL_SIZE,
                                      backgroundColor: isInShapePreview
                                        ? (isRightMouseDown ? 'rgba(255,0,0,0.4)' : selectedColor)
                                        : (color === 'transparent' ? transparentColor : color),
                                      opacity: isInShapePreview ? 0.7 : 1,
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

            </div>

            {/* Color Groups & Naming Panel (Right of Canvas) */}
            <div style={{
              width: '280px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '12px',
              background: '#f9f9f9',
              maxHeight: VIEWPORT_SIZE,
              overflowY: 'auto',
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0D0D0D' }}>Color Groups</h4>

              {/* Create new group */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="New group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={createGroup}
                  style={{
                    padding: '6px 12px',
                    background: '#0D0D0D',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#FFF1E5',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Add
                </button>
              </div>

              {/* List of groups */}
              <div style={{ marginBottom: '15px' }}>
                {colorGroups.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>No groups yet. Create one above.</p>
                ) : (
                  colorGroups.map(group => (
                    <div key={group.id} style={{
                      padding: '8px',
                      marginBottom: '6px',
                      background: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ flex: 1, fontSize: '12px', fontWeight: 600 }}>{group.name}</span>
                        <button
                          onClick={() => {
                            if (selectedColor) addColorToGroup(group.id, selectedColor);
                          }}
                          style={{
                            padding: '3px 8px',
                            background: '#4CAF50',
                            border: 'none',
                            borderRadius: '3px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Add selected color"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deleteGroup(group.id)}
                          style={{
                            padding: '3px 8px',
                            background: '#f44336',
                            border: 'none',
                            borderRadius: '3px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {/* Show colors in the group */}
                      {group.colors.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {group.colors.map((color, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedColor(color)}
                              style={{
                                width: '18px',
                                height: '18px',
                                backgroundColor: color,
                                border: selectedColor === color ? '2px solid #0D0D0D' : '1px solid #999',
                                borderRadius: '2px',
                                cursor: 'pointer',
                              }}
                              title={colorNames[color] || color}
                            />
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>No colors yet</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Color naming section */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0D0D0D' }}>Name Color</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: selectedColor,
                    border: '2px solid #ccc',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Enter name..."
                      value={colorNames[selectedColor] || ''}
                      onChange={(e) => nameColor(selectedColor, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{selectedColor}</div>
                  </div>
                </div>
              </div>

              {/* Named colors list */}
              {Object.keys(colorNames).filter(c => colorNames[c]).length > 0 && (
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px', marginTop: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0D0D0D' }}>Named Colors</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(colorNames).filter(([_, name]) => name).map(([color, name]) => (
                      <div
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '4px',
                          background: selectedColor === color ? '#0D0D0D' : '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          minWidth: '40px',
                        }}
                        title={color}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          backgroundColor: color,
                          borderRadius: '3px',
                          border: '1px solid #999',
                          marginBottom: '3px',
                        }} />
                        <span style={{
                          fontSize: '9px',
                          color: selectedColor === color ? '#FFF1E5' : '#333',
                          textAlign: 'center',
                          maxWidth: '50px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color Palette */}
          <div>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#0D0D0D' }}>Colors</h3>

              {/* Color Search & Filter */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search colors by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                />
                <select
                  value={selectedGroupFilter || ''}
                  onChange={(e) => setSelectedGroupFilter(e.target.value || null)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: '#fff',
                  }}
                >
                  <option value="">All Colors</option>
                  {colorGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name} ({group.colors.length})</option>
                  ))}
                </select>
              </div>

              {/* Scrollable color palette */}
              <div
                style={{
                  height: '160px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: '15px',
                  background: '#fff',
                }}
              >
                {filteredColors.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', margin: '20px 0' }}>
                    No colors found. Try a different search or group.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, 28px)',
                      gap: '3px',
                    }}
                  >
                    {filteredColors.map((color, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: color,
                          border: selectedColor === color ? '2px solid #0D0D0D' : '1px solid #ccc',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          boxShadow: selectedColor === color ? '0 0 6px rgba(13, 13, 13, 0.5)' : 'none',
                          position: 'relative',
                        }}
                        title={colorNames[color] ? `${colorNames[color]} (${color})` : color}
                      >
                        {colorNames[color] && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '8px',
                            height: '8px',
                            background: '#0D0D0D',
                            borderRadius: '50%',
                            border: '1px solid #fff',
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
