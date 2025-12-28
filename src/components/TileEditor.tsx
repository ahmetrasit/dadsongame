import { useState, useRef, useEffect, useCallback } from 'react';

// Constants
const TILE_SIZE = 16; // 16x16 pixels per tile
const GRID_TILES = 5; // 5x5 tiles
const CANVAS_PIXELS = TILE_SIZE * GRID_TILES; // 80x80 total pixels
const DISPLAY_SCALE = 6; // Scale up for display
const DISPLAY_SIZE = CANVAS_PIXELS * DISPLAY_SCALE; // 480px display
const STORAGE_KEY = 'tileEditor_data';

// Color palette - flat list of all colors (no groups)
const ALL_COLORS: string[] = [
  // Grays & Whites
  '#FFFFFF', '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0',
  '#D0D0D0', '#C0C0C0', '#B0B0B0', '#A0A0A0', '#909090',
  '#808080', '#707070', '#606060', '#505050', '#404040',
  '#303030', '#202020', '#101010', '#080808', '#000000',
  // Reds
  '#FFE5E5', '#FFCCCC', '#FFB3B3', '#FF9999', '#FF8080',
  '#FF6666', '#FF4D4D', '#FF3333', '#FF1A1A', '#FF0000',
  '#E60000', '#CC0000', '#B30000', '#990000', '#800000',
  '#660000', '#4D0000', '#330000', '#FFC0CB', '#FFB6C1',
  '#FF69B4', '#FF1493', '#DB7093', '#C71585',
  // Oranges
  '#FFF5E6', '#FFECD9', '#FFE0C2', '#FFD4A8', '#FFC78A',
  '#FFBA6C', '#FFAD4E', '#FFA030', '#FF9312', '#FF8600',
  '#E67800', '#CC6A00', '#B35C00', '#994E00', '#804000',
  '#663300', '#F4A460', '#D2691E', '#CD853F', '#A0522D',
  // Yellows
  '#FFFFF0', '#FFFFE0', '#FFFFD0', '#FFFFC0', '#FFFFB0',
  '#FFFFA0', '#FFFF90', '#FFFF80', '#FFFF60', '#FFFF00',
  '#FFD700', '#FFC700', '#FFB700', '#FFA700', '#DAA520',
  '#B8860B', '#CD9B1D', '#EEC900', '#F0E68C',
  // Browns
  '#FDF5E6', '#FAF0E6', '#F5DEB3', '#DEB887', '#D2B48C',
  '#C4A882', '#B69B78', '#A88E6E', '#9A8164', '#8C745A',
  '#8B7355', '#7B6450', '#6B554B', '#5C4640', '#4D3735',
  '#3E2A2A', '#2F1D1D', '#8B4513', '#A0522D', '#6B4423',
  '#5D3A1A', '#4E3011', '#3F2608', '#654321', '#3D2314',
  // Greens
  '#F0FFF0', '#E8FFE8', '#D0FFD0', '#B8FFB8', '#A0FFA0',
  '#88FF88', '#70FF70', '#58FF58', '#40FF40', '#28FF28',
  '#00FF00', '#00E600', '#00CC00', '#00B300', '#009900',
  '#008000', '#006600', '#004D00', '#003300', '#001A00',
  '#98FB98', '#90EE90', '#8FBC8F', '#7CFC00', '#7FFF00',
  '#ADFF2F', '#32CD32', '#228B22', '#2E8B57', '#3CB371',
  '#20B2AA', '#66CDAA', '#00FA9A', '#00FF7F', '#006400',
  // Blues
  '#F0F8FF', '#E6F3FF', '#CCE7FF', '#B3DBFF', '#99CFFF',
  '#80C3FF', '#66B7FF', '#4DABFF', '#339FFF', '#1A93FF',
  '#0087FF', '#007BEB', '#006FD7', '#0063C3', '#0057AF',
  '#004B9B', '#003F87', '#003373', '#00275F', '#001B4B',
  '#87CEEB', '#87CEFA', '#00BFFF', '#1E90FF', '#6495ED',
  '#4169E1', '#0000FF', '#0000CD', '#00008B', '#000080',
  '#191970', '#4682B4', '#5F9EA0', '#ADD8E6', '#B0E0E6',
  // Rich Colors (Purples, Deep teals, Magentas, etc.)
  '#4B0082', '#3F0071', '#340060', '#29004F', '#1E003E',
  '#5B2C6F', '#6C3483', '#7D3C98', '#8E44AD', '#9B59B6',
  '#1A0033', '#0D001A', '#0A1628', '#0F1F3D', '#152952',
  '#1B3A6D', '#214B87', '#2E5CA2', '#1F4788', '#1A3A6E',
  '#003333', '#004444', '#005555', '#006666', '#007777',
  '#008080', '#009999', '#00AAAA', '#0D6B6B', '#0A5252',
  '#800040', '#990052', '#B30066', '#CC0077', '#990033',
  '#800020', '#660019', '#4D0013', '#8B0A50', '#C71585',
  '#8B2500', '#A52A00', '#BF3000', '#CC3300', '#993D00',
  '#804000', '#664400', '#B34700', '#E65C00', '#FF6600',
  // Pale Colors
  '#FFF0F5', '#FFE4E9', '#FFD9E3', '#FFCED8', '#FFC3CD',
  '#FFB8C2', '#FFADB7', '#FFA2AC', '#FF97A1', '#FFE4EC',
  '#DCF0FF', '#D2EDFF', '#C8EAFF', '#BEE7FF', '#B4E4FF',
  '#AAE1FF', '#A0DEFF', '#E6F7FF', '#DCFFDC', '#D2FFD2',
  '#C8FFC8', '#BEFFBE', '#B4FFB4', '#AAFFAA', '#A0FFA0',
  '#E6FFE0', '#FFFFDC', '#FFFFD2', '#FFFFC8', '#FFFFBE',
  '#FFFFB4', '#FFFFAA', '#FFFFA0', '#FFF9E6', '#F8F0FF',
  '#F0E6FF', '#E8DCFF', '#E0D2FF', '#D8C8FF', '#D0BEFF',
  '#C8B4FF', '#C0AAFF', '#B8A0FF', '#EEE0FF',
  // Skin Tones
  '#FFECD9', '#FFE4C4', '#FFDAB9', '#FFD0A8', '#FFC69A',
  '#E8BA8C', '#DAAE80', '#CCA274', '#BE9668', '#B08A5C',
  '#A27E50', '#8D6E46', '#7A5E3C', '#6A5035', '#5A422E',
  '#4A3527', '#3A2820', '#8B7355', '#A0826D', '#C4A484',
  // Earth & Nature
  '#556B2F', '#6B8E23', '#808000', '#BDB76B', '#EEE8AA',
  '#FAFAD2', '#9ACD32', '#BC8F8F', '#A52A2A', '#704214', '#5C4033',
];

// Layer interface
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  pixels: string[][]; // 80x80 grid, 'transparent' or hex color
}

// Sprite in gallery
interface GallerySprite {
  id: string;
  name: string;
  group: string;
  layers: Layer[];
  thumbnail: string; // data URL
}

// Reference sprite (ghost next to canvas)
interface ReferenceSprite {
  id: string;
  spriteId: string;
  position: 'left' | 'right' | 'top' | 'bottom';
  thumbnail: string;
}

// Saved data structure
interface SavedData {
  layers: Layer[];
  gallery: GallerySprite[];
  galleryGroups: string[];
  referenceSprites: ReferenceSprite[];
}

interface TileEditorProps {
  onClose: () => void;
}

export function TileEditor({ onClose }: TileEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Layers
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      pixels: Array(CANVAS_PIXELS).fill(null).map(() => Array(CANVAS_PIXELS).fill('transparent')),
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [ghostMode, setGhostMode] = useState(false);

  // Drawing
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');

  // Gallery
  const [gallery, setGallery] = useState<GallerySprite[]>([]);
  const [galleryGroups, setGalleryGroups] = useState<string[]>(['Tiles', 'Characters', 'Objects', 'Nature']);
  const [showGalleryScreen, setShowGalleryScreen] = useState(false);
  const [spriteName, setSpriteName] = useState('');
  const [selectedGalleryGroup, setSelectedGalleryGroup] = useState('Tiles');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingSpriteName, setEditingSpriteName] = useState<string | null>(null);

  // Tile selection for splitting
  const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set());
  const [tileSelectMode, setTileSelectMode] = useState(false);

  // K-key region selection for saving to gallery
  const [regionSelectMode, setRegionSelectMode] = useState(false);
  const [regionPoint1, setRegionPoint1] = useState<{ x: number; y: number } | null>(null);
  const [regionPoint2, setRegionPoint2] = useState<{ x: number; y: number } | null>(null);

  // Zoom and pan
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  // Reference sprites (ghosts beside canvas)
  const [referenceSprites, setReferenceSprites] = useState<ReferenceSprite[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedData = JSON.parse(saved);
        if (data.layers && data.layers.length > 0) {
          setLayers(data.layers);
          setActiveLayerId(data.layers[0].id);
        }
        if (data.gallery) setGallery(data.gallery);
        if (data.galleryGroups) setGalleryGroups(data.galleryGroups);
        if (data.referenceSprites) setReferenceSprites(data.referenceSprites);
      }
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
    setIsLoaded(true);
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    const data: SavedData = { layers, gallery, galleryGroups, referenceSprites };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  }, [layers, gallery, galleryGroups, referenceSprites, isLoaded]);

  // K key to toggle region select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' || e.key === 'K') {
        if (!regionSelectMode) {
          setRegionSelectMode(true);
          setRegionPoint1(null);
          setRegionPoint2(null);
          setTileSelectMode(false); // Turn off tile select mode
        } else {
          // Cancel region select mode
          setRegionSelectMode(false);
          setRegionPoint1(null);
          setRegionPoint2(null);
        }
      }
      // Escape to cancel
      if (e.key === 'Escape' && regionSelectMode) {
        setRegionSelectMode(false);
        setRegionPoint1(null);
        setRegionPoint2(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [regionSelectMode]);

  // Create new layer
  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      pixels: Array(CANVAS_PIXELS).fill(null).map(() => Array(CANVAS_PIXELS).fill('transparent')),
    };
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  // Delete layer
  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[0].id);
    }
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };


  // Draw pixel
  const drawPixel = useCallback((x: number, y: number) => {
    if (x < 0 || x >= CANVAS_PIXELS || y < 0 || y >= CANVAS_PIXELS) return;

    setLayers(prevLayers => prevLayers.map(layer => {
      if (layer.id !== activeLayerId) return layer;
      const newPixels = layer.pixels.map(row => [...row]);
      newPixels[y][x] = tool === 'erase' ? 'transparent' : selectedColor;
      return { ...layer, pixels: newPixels };
    }));
  }, [activeLayerId, selectedColor, tool]);

  // Handle canvas mouse events with zoom
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = DISPLAY_SCALE * zoomLevel;
    const x = Math.floor(((e.clientX - rect.left) - panOffset.x) / scale);
    const y = Math.floor(((e.clientY - rect.top) - panOffset.y) / scale);
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    // Middle mouse button for panning
    if (e.button === 1) {
      setIsPanning(true);
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { x, y } = coords;

    // Handle tile selection mode
    if (tileSelectMode) {
      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);
      if (tileX >= 0 && tileX < GRID_TILES && tileY >= 0 && tileY < GRID_TILES) {
        const tileIndex = tileY * GRID_TILES + tileX;
        toggleTileSelection(tileIndex);
      }
      return;
    }

    // Handle K-key region selection mode
    if (regionSelectMode && e.button === 0) {
      if (x >= 0 && x < CANVAS_PIXELS && y >= 0 && y < CANVAS_PIXELS) {
        if (!regionPoint1) {
          // First click - set first point
          setRegionPoint1({ x, y });
          setRegionPoint2(null);
        } else if (!regionPoint2) {
          // Second click - set second point (don't auto-save, show button)
          setRegionPoint2({ x, y });
        }
      }
      return;
    }

    // Right-click to erase
    if (e.button === 2) {
      setIsMouseDown(true);
      if (x >= 0 && x < CANVAS_PIXELS && y >= 0 && y < CANVAS_PIXELS) {
        // Directly erase pixel
        setLayers(layers.map(layer => {
          if (layer.id !== activeLayerId) return layer;
          const newPixels = layer.pixels.map(row => [...row]);
          newPixels[y][x] = 'transparent';
          return { ...layer, pixels: newPixels };
        }));
      }
      return;
    }

    // Left-click to paint
    setIsMouseDown(true);
    if (x >= 0 && x < CANVAS_PIXELS && y >= 0 && y < CANVAS_PIXELS) {
      drawPixel(x, y);
    }
  };

  // Track which mouse button is held for move events
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);

  const handleCanvasMouseDownWithButton = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) setIsRightMouseDown(true);
    handleCanvasMouseDown(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.x;
      const dy = e.clientY - lastPanPos.y;
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      setLastPanPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isMouseDown) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { x, y } = coords;
    if (x >= 0 && x < CANVAS_PIXELS && y >= 0 && y < CANVAS_PIXELS) {
      // If right mouse is held, erase; otherwise paint
      if (isRightMouseDown) {
        setLayers(layers.map(layer => {
          if (layer.id !== activeLayerId) return layer;
          const newPixels = layer.pixels.map(row => [...row]);
          newPixels[y][x] = 'transparent';
          return { ...layer, pixels: newPixels };
        }));
      } else {
        drawPixel(x, y);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    setIsPanning(false);
    setIsRightMouseDown(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent right-click menu
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    const newZoom = Math.max(0.5, Math.min(4, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);

    // Draw checkerboard background for transparency
    for (let y = 0; y < CANVAS_PIXELS; y++) {
      for (let x = 0; x < CANVAS_PIXELS; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? '#e0e0e0' : '#c0c0c0';
        ctx.fillRect(x * DISPLAY_SCALE, y * DISPLAY_SCALE, DISPLAY_SCALE, DISPLAY_SCALE);
      }
    }

    // Draw layers (bottom to top)
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      if (!layer.visible) continue;

      const isActiveLayer = layer.id === activeLayerId;
      const opacity = ghostMode && !isActiveLayer ? 0.3 : 1;

      for (let y = 0; y < CANVAS_PIXELS; y++) {
        for (let x = 0; x < CANVAS_PIXELS; x++) {
          const color = layer.pixels[y][x];
          if (color !== 'transparent') {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            ctx.fillRect(x * DISPLAY_SCALE, y * DISPLAY_SCALE, DISPLAY_SCALE, DISPLAY_SCALE);
          }
        }
      }
    }
    ctx.globalAlpha = 1;

    // Draw tile grid (16x16 tiles) - DARKER borders
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= GRID_TILES; i++) {
      const pos = i * TILE_SIZE * DISPLAY_SCALE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, DISPLAY_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(DISPLAY_SIZE, pos);
      ctx.stroke();
    }

    // Draw selected tiles overlay
    if (tileSelectMode) {
      for (let ty = 0; ty < GRID_TILES; ty++) {
        for (let tx = 0; tx < GRID_TILES; tx++) {
          const tileIndex = ty * GRID_TILES + tx;
          const x = tx * TILE_SIZE * DISPLAY_SCALE;
          const y = ty * TILE_SIZE * DISPLAY_SCALE;
          const size = TILE_SIZE * DISPLAY_SCALE;

          if (selectedTiles.has(tileIndex)) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
          }
        }
      }
    }

    // Draw region selection (K key mode)
    if (regionSelectMode && regionPoint1) {
      const p1x = regionPoint1.x * DISPLAY_SCALE;
      const p1y = regionPoint1.y * DISPLAY_SCALE;

      if (regionPoint2) {
        // Both points selected - draw orange overlay
        const p2x = regionPoint2.x * DISPLAY_SCALE;
        const p2y = regionPoint2.y * DISPLAY_SCALE;
        const minX = Math.min(p1x, p2x);
        const minY = Math.min(p1y, p2y);
        const width = Math.abs(p2x - p1x) + DISPLAY_SCALE;
        const height = Math.abs(p2y - p1y) + DISPLAY_SCALE;

        // Orange overlay
        ctx.fillStyle = 'rgba(255, 152, 0, 0.35)';
        ctx.fillRect(minX, minY, width, height);
        // Orange border
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 3;
        ctx.strokeRect(minX, minY, width, height);
      } else {
        // Only first point - draw orange dot marker
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(p1x + DISPLAY_SCALE / 2, p1y + DISPLAY_SCALE / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

  }, [layers, activeLayerId, ghostMode, tileSelectMode, selectedTiles, regionSelectMode, regionPoint1, regionPoint2]);

  // Generate thumbnail for full canvas
  const generateThumbnail = (targetLayers?: Layer[]): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_PIXELS;
    tempCanvas.height = CANVAS_PIXELS;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    const layersToUse = targetLayers || layers;
    for (const layer of layersToUse) {
      if (!layer.visible) continue;
      for (let y = 0; y < CANVAS_PIXELS; y++) {
        for (let x = 0; x < CANVAS_PIXELS; x++) {
          const color = layer.pixels[y][x];
          if (color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    return tempCanvas.toDataURL();
  };

  // Generate thumbnail for a single tile
  const generateTileThumbnail = (tileX: number, tileY: number): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = TILE_SIZE;
    tempCanvas.height = TILE_SIZE;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    const startX = tileX * TILE_SIZE;
    const startY = tileY * TILE_SIZE;

    for (const layer of layers) {
      if (!layer.visible) continue;
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const color = layer.pixels[startY + y]?.[startX + x];
          if (color && color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    return tempCanvas.toDataURL();
  };

  // Extract single tile as layers
  const extractTileLayers = (tileX: number, tileY: number): Layer[] => {
    const startX = tileX * TILE_SIZE;
    const startY = tileY * TILE_SIZE;

    return layers.map(layer => {
      const newPixels = Array(CANVAS_PIXELS).fill(null).map(() => Array(CANVAS_PIXELS).fill('transparent'));

      // Copy tile pixels to center of new canvas
      const offsetX = Math.floor((CANVAS_PIXELS - TILE_SIZE) / 2);
      const offsetY = Math.floor((CANVAS_PIXELS - TILE_SIZE) / 2);

      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const color = layer.pixels[startY + y]?.[startX + x];
          if (color) {
            newPixels[offsetY + y][offsetX + x] = color;
          }
        }
      }

      return { ...layer, id: `layer-${Date.now()}-${layer.id}`, pixels: newPixels };
    });
  };

  // Toggle tile selection
  const toggleTileSelection = (tileIndex: number) => {
    const newSelected = new Set(selectedTiles);
    if (newSelected.has(tileIndex)) {
      newSelected.delete(tileIndex);
    } else {
      newSelected.add(tileIndex);
    }
    setSelectedTiles(newSelected);
  };

  // Split selected tiles to gallery
  const splitSelectedTilesToGallery = () => {
    if (selectedTiles.size === 0) {
      alert('Select tiles first by clicking on them');
      return;
    }

    const newSprites: GallerySprite[] = [];

    selectedTiles.forEach(tileIndex => {
      const tx = tileIndex % GRID_TILES;
      const ty = Math.floor(tileIndex / GRID_TILES);
      const thumbnail = generateTileThumbnail(tx, ty);

      newSprites.push({
        id: `sprite-${Date.now()}-${tx}-${ty}`,
        name: `Sprite ${gallery.length + newSprites.length + 1}`,
        group: selectedGalleryGroup,
        layers: extractTileLayers(tx, ty),
        thumbnail,
      });
    });

    setGallery([...gallery, ...newSprites]);
    setSelectedTiles(new Set());
    setTileSelectMode(false);
  };

  // Rename sprite in gallery
  const renameSprite = (id: string, newName: string) => {
    setGallery(gallery.map(s => s.id === id ? { ...s, name: newName } : s));
    setEditingSpriteName(null);
  };

  // Save to gallery
  const saveToGallery = () => {
    if (!spriteName.trim()) {
      alert('Please enter a sprite name');
      return;
    }

    const sprite: GallerySprite = {
      id: `sprite-${Date.now()}`,
      name: spriteName,
      group: selectedGalleryGroup,
      layers: layers.map(l => ({ ...l, pixels: l.pixels.map(row => [...row]) })),
      thumbnail: generateThumbnail(),
    };

    setGallery([...gallery, sprite]);
    setSpriteName('');
  };

  // Save selected region to gallery (K key selection) - called by button
  const saveSelectedRegionToGallery = () => {
    if (!regionPoint1 || !regionPoint2) return;

    // Get bounding box
    const minX = Math.min(regionPoint1.x, regionPoint2.x);
    const maxX = Math.max(regionPoint1.x, regionPoint2.x);
    const minY = Math.min(regionPoint1.y, regionPoint2.y);
    const maxY = Math.max(regionPoint1.y, regionPoint2.y);
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Create thumbnail for the region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Extract pixels from all visible layers
    for (const layer of layers) {
      if (!layer.visible) continue;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const color = layer.pixels[y]?.[x];
          if (color && color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(x - minX, y - minY, 1, 1);
          }
        }
      }
    }

    // Create layer data for the region
    const regionLayers: Layer[] = layers.map(layer => {
      const newPixels: string[][] = Array(height).fill(null).map(() => Array(width).fill('transparent'));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          newPixels[y][x] = layer.pixels[minY + y]?.[minX + x] || 'transparent';
        }
      }
      return { ...layer, id: `layer-${Date.now()}-${layer.id}`, pixels: newPixels };
    });

    const sprite: GallerySprite = {
      id: `sprite-${Date.now()}`,
      name: `Sprite ${gallery.length + 1}`,
      group: selectedGalleryGroup,
      layers: regionLayers,
      thumbnail: tempCanvas.toDataURL(),
    };

    setGallery([...gallery, sprite]);

    // Reset region selection
    setRegionSelectMode(false);
    setRegionPoint1(null);
    setRegionPoint2(null);
  };

  // Cancel region selection
  const cancelRegionSelection = () => {
    setRegionSelectMode(false);
    setRegionPoint1(null);
    setRegionPoint2(null);
  };

  // Load from gallery
  const loadFromGallery = (sprite: GallerySprite) => {
    setLayers(sprite.layers.map(l => ({ ...l, pixels: l.pixels.map(row => [...row]) })));
    setActiveLayerId(sprite.layers[0]?.id || 'layer-1');
    setShowGalleryScreen(false);
  };

  // Delete from gallery
  const deleteFromGallery = (id: string) => {
    setGallery(gallery.filter(s => s.id !== id));
    setReferenceSprites(referenceSprites.filter(r => r.spriteId !== id));
  };

  // Add new gallery group
  const addGalleryGroup = () => {
    if (!newGroupName.trim() || galleryGroups.includes(newGroupName)) return;
    setGalleryGroups([...galleryGroups, newGroupName]);
    setNewGroupName('');
  };

  // Clear canvas
  const clearCanvas = () => {
    setLayers(layers.map(layer =>
      layer.id === activeLayerId
        ? { ...layer, pixels: Array(CANVAS_PIXELS).fill(null).map(() => Array(CANVAS_PIXELS).fill('transparent')) }
        : layer
    ));
  };

  // Clear all layers
  const clearAllLayers = () => {
    setLayers([{
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      pixels: Array(CANVAS_PIXELS).fill(null).map(() => Array(CANVAS_PIXELS).fill('transparent')),
    }]);
    setActiveLayerId('layer-1');
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
        zIndex: 1000,
        color: '#333',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '14px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #ddd', background: '#F5E6D3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Tile Editor (80×80px • 5×5 tiles)</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowGalleryScreen(true)}
              style={{
                padding: '8px 16px',
                background: '#9C27B0',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Gallery ({gallery.length})
            </button>
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
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
        {/* Left Sidebar - Layers & Save */}
        <div style={{ width: '280px', padding: '20px', borderRight: '1px solid #ddd', overflowY: 'auto', background: '#F5E6D3' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Layers</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: activeLayerId === layer.id ? '#0D0D0D' : '#E8DDD1',
                  color: activeLayerId === layer.id ? '#FFF1E5' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: layer.visible ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                >
                  {layer.visible ? '👁' : '○'}
                </span>
                <span style={{ flex: 1 }}>{layer.name}</span>
                {layers.length > 1 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                    style={{ color: '#c00', cursor: 'pointer' }}
                  >
                    ×
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={addLayer}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#0D0D0D',
                color: '#FFF1E5',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              + Add Layer
            </button>
            <button
              onClick={() => setGhostMode(!ghostMode)}
              style={{
                padding: '8px 12px',
                backgroundColor: ghostMode ? '#9C27B0' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Ghost {ghostMode ? 'ON' : 'OFF'}
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Save to Gallery</h2>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Sprite Name:</label>
            <input
              type="text"
              value={spriteName}
              onChange={e => setSpriteName(e.target.value)}
              placeholder="Enter name..."
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Group:</label>
            <select
              value={selectedGalleryGroup}
              onChange={e => setSelectedGalleryGroup(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              {galleryGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={saveToGallery}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0D0D0D',
              border: 'none',
              borderRadius: '4px',
              color: '#FFF1E5',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px',
            }}
          >
            Save Full Canvas
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '20px 0' }} />

          <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Selection Tools</h2>

          <button
            onClick={() => {
              setTileSelectMode(!tileSelectMode);
              if (tileSelectMode) setSelectedTiles(new Set());
            }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: tileSelectMode ? '#4CAF50' : '#0D0D0D',
              color: tileSelectMode ? '#fff' : '#FFF1E5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '10px',
            }}
          >
            {tileSelectMode ? `Tile Select: ${selectedTiles.size} selected` : 'Select Tiles'}
          </button>

          {tileSelectMode && selectedTiles.size > 0 && (
            <button
              onClick={splitSelectedTilesToGallery}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              Send Tiles to Gallery
            </button>
          )}

          <div style={{ color: '#666', fontSize: '12px', marginTop: '10px' }}>
            Press <strong>K</strong> to select region with clicks
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {/* Tools Row */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setTool('paint')}
                style={{
                  padding: '8px 16px',
                  background: tool === 'paint' ? '#0D0D0D' : '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: tool === 'paint' ? '#FFF1E5' : '#333',
                  cursor: 'pointer',
                }}
              >
                Paint
              </button>
              <button
                onClick={() => setTool('erase')}
                style={{
                  padding: '8px 16px',
                  background: tool === 'erase' ? '#0D0D0D' : '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: tool === 'erase' ? '#FFF1E5' : '#333',
                  cursor: 'pointer',
                }}
              >
                Erase
              </button>
              <button
                onClick={clearCanvas}
                style={{
                  padding: '8px 16px',
                  background: '#c00',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Clear Layer
              </button>
              <button
                onClick={clearAllLayers}
                style={{
                  padding: '8px 16px',
                  background: '#800',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ color: '#666', fontSize: '12px' }}>Zoom:</span>
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                style={{ padding: '6px 12px', backgroundColor: '#E8DDD1', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                −
              </button>
              <span style={{ color: '#333', minWidth: '50px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                style={{ padding: '6px 12px', backgroundColor: '#E8DDD1', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                +
              </button>
              <button
                onClick={resetZoom}
                style={{ padding: '6px 12px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div>
              <div
                style={{
                  display: 'inline-block',
                  border: '2px solid #ccc',
                  background: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  position: 'relative',
                }}
              >
                {/* Canvas container with overflow hidden to clip zoomed content */}
                <div
                  style={{
                    width: DISPLAY_SIZE,
                    height: DISPLAY_SIZE,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={DISPLAY_SIZE}
                    height={DISPLAY_SIZE}
                    onMouseDown={handleCanvasMouseDownWithButton}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                    style={{
                      cursor: regionSelectMode ? 'crosshair' : (tileSelectMode ? 'pointer' : (isPanning ? 'grabbing' : 'crosshair')),
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

                {/* Save Region Button - appears when region selected */}
                {regionSelectMode && regionPoint1 && regionPoint2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '10px',
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={saveSelectedRegionToGallery}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#FF9800',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    >
                      Save to Gallery
                    </button>
                    <button
                      onClick={cancelRegionSelection}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#666',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Hints below canvas */}
              <div style={{ marginTop: '10px', color: '#666', fontSize: '12px' }}>
                {regionSelectMode ? (
                  <span style={{ color: '#FF5722' }}>
                    {regionPoint1 && regionPoint2
                      ? 'Click Save to Gallery or Cancel'
                      : regionPoint1
                        ? 'Click second point to select region'
                        : 'Click first point • ESC to cancel'}
                  </span>
                ) : (
                  'Scroll to zoom • Middle-click drag to pan • Right-click to erase • K to select region'
                )}
              </div>
            </div>
          </div>

          {/* Color Palette - Grid layout like SpriteEditor */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Color Palette</h3>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
              {/* Selected color display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: selectedColor,
                    border: '2px solid #999',
                    borderRadius: '4px',
                  }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#333' }}>{selectedColor}</span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 40px)',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '5px',
                background: '#fff',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              {ALL_COLORS.map((color, index) => (
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
                    boxShadow: selectedColor === color ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Full Screen */}
        {showGalleryScreen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: '#FFF1E5',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              padding: '40px',
              overflowY: 'auto',
            }}
            onClick={() => setShowGalleryScreen(false)}
          >
            <div
              style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: '#333', margin: 0, fontSize: '28px' }}>Sprite Gallery</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="New group name"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#fff',
                      color: '#333',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={addGalleryGroup}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0D0D0D',
                      color: '#FFF1E5',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Add Group
                  </button>
                  <button
                    onClick={() => setShowGalleryScreen(false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#c00',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: '60px', fontSize: '18px' }}>
                  No sprites saved yet. Use "Select Tiles" or press K to select region.
                </div>
              ) : (
                galleryGroups.map(group => {
                  const groupSprites = gallery.filter(s => s.group === group);
                  if (groupSprites.length === 0) return null;

                  return (
                    <div key={group} style={{ marginBottom: '30px' }}>
                      <h3 style={{ color: '#666', fontSize: '18px', marginBottom: '15px', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                        {group} ({groupSprites.length})
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px' }}>
                        {groupSprites.map(sprite => {
                          // Calculate display size based on sprite dimensions (larger sprites = larger display)
                          const spriteWidth = sprite.layers[0]?.pixels[0]?.length || 16;
                          const spriteHeight = sprite.layers[0]?.pixels.length || 16;
                          const maxDim = Math.max(spriteWidth, spriteHeight);
                          // Base size 80px, scale up for larger sprites, max 160px
                          const displaySize = Math.min(160, Math.max(80, maxDim * 2));

                          return (
                            <div
                              key={sprite.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '20px',
                                backgroundColor: '#F5E6D3',
                                borderRadius: '8px',
                                minWidth: '140px',
                              }}
                            >
                              <img
                                src={sprite.thumbnail}
                                alt={sprite.name}
                                onClick={() => loadFromGallery(sprite)}
                                style={{
                                  width: `${displaySize}px`,
                                  height: `${displaySize}px`,
                                  objectFit: 'contain',
                                  imageRendering: 'pixelated',
                                  border: '2px solid #ccc',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  marginBottom: '12px',
                                  backgroundColor: '#fff',
                                }}
                                title="Click to load into editor"
                              />
                              {editingSpriteName === sprite.id ? (
                                <input
                                  type="text"
                                  defaultValue={sprite.name}
                                  autoFocus
                                  onBlur={e => renameSprite(sprite.id, e.target.value || sprite.name)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      renameSprite(sprite.id, (e.target as HTMLInputElement).value || sprite.name);
                                    } else if (e.key === 'Escape') {
                                      setEditingSpriteName(null);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: '#fff',
                                    color: '#333',
                                    border: '2px solid #0D0D0D',
                                    borderRadius: '4px',
                                    padding: '6px 10px',
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    width: '120px',
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    color: '#333',
                                    fontSize: '14px',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    maxWidth: '130px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 'bold',
                                  }}
                                  title={sprite.name}
                                >
                                  {sprite.name}
                                </span>
                              )}
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                  onClick={() => setEditingSpriteName(sprite.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#0D0D0D',
                                    color: '#FFF1E5',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => deleteFromGallery(sprite.id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#c00',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
    </div>
  );
}
