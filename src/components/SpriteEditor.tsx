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

interface ColorEntry {
  color: string;
  name: string;
  tags: string[];
}

// Tool types for sprite creation pipeline
type TexturePattern = 'noise' | 'dither' | 'grain' | 'crosshatch';

// Simplified polygon steps: draw boundary -> add highlights -> assign colors
type PolygonStep = 'drawing' | 'highlights' | 'coloring';
// Simplified depth steps: draw area -> set light
type DepthStep = 'drawing' | 'light';
// Simplified texture steps: draw area -> apply
type TextureStep = 'drawing' | 'apply';

interface PolygonPoint {
  x: number;
  y: number;
}

interface PolygonHighlight {
  points: PolygonPoint[];
  color: string;
}

interface PolygonState {
  step: PolygonStep;
  isClosed: boolean;
  boundaryPoints: PolygonPoint[];
  highlights: PolygonHighlight[];
  currentHighlightPoints: PolygonPoint[];
  baseColor: string;
}

interface DepthState {
  step: DepthStep;
  isClosed: boolean;
  areaPoints: PolygonPoint[];
  lightDirection: PolygonPoint | null;
}

interface TextureState {
  step: TextureStep;
  isClosed: boolean;
  areaPoints: PolygonPoint[];
}

interface AlignmentSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DEFAULT_PALETTE: ColorEntry[] = [
  // Blacks & Grays (1-25)
  { color: '#000000', name: 'Void Black', tags: ['black', 'dark', 'night', 'shadow', 'void', 'coal', 'ink', 'obsidian', 'midnight', 'abyss'] },
  { color: '#0d0d0d', name: 'Pitch Black', tags: ['black', 'dark', 'night', 'shadow', 'tar', 'soot', 'cave', 'deep', 'raven', 'onyx'] },
  { color: '#1a1a1a', name: 'Charcoal', tags: ['black', 'charcoal', 'dark', 'graphite', 'coal', 'soot', 'iron', 'metal', 'storm', 'noir'] },
  { color: '#262626', name: 'Dark Graphite', tags: ['gray', 'dark', 'graphite', 'charcoal', 'slate', 'iron', 'steel', 'shadow', 'stone', 'rock'] },
  { color: '#333333', name: 'Deep Gray', tags: ['gray', 'dark', 'charcoal', 'stone', 'rock', 'metal', 'iron', 'slate', 'shadow', 'wolf'] },
  { color: '#404040', name: 'Gunmetal', tags: ['gray', 'metal', 'gun', 'steel', 'iron', 'industrial', 'machine', 'dark', 'stone', 'urban'] },
  { color: '#4d4d4d', name: 'Iron', tags: ['gray', 'iron', 'metal', 'steel', 'stone', 'rock', 'concrete', 'industrial', 'urban', 'neutral'] },
  { color: '#595959', name: 'Slate', tags: ['gray', 'slate', 'stone', 'rock', 'metal', 'concrete', 'neutral', 'urban', 'elephant', 'dolphin'] },
  { color: '#666666', name: 'Fossil', tags: ['gray', 'stone', 'fossil', 'rock', 'neutral', 'concrete', 'ash', 'dust', 'urban', 'medium'] },
  { color: '#737373', name: 'Pewter', tags: ['gray', 'pewter', 'metal', 'silver', 'stone', 'neutral', 'medium', 'steel', 'tin', 'industrial'] },
  { color: '#808080', name: 'Stone', tags: ['gray', 'stone', 'rock', 'neutral', 'medium', 'concrete', 'gravel', 'pebble', 'mineral', 'earth'] },
  { color: '#8c8c8c', name: 'Silver Fox', tags: ['gray', 'silver', 'fox', 'metal', 'neutral', 'soft', 'fog', 'mist', 'cloud', 'gentle'] },
  { color: '#999999', name: 'Cloud Gray', tags: ['gray', 'cloud', 'silver', 'fog', 'mist', 'soft', 'neutral', 'light', 'overcast', 'sky'] },
  { color: '#a6a6a6', name: 'Moonstone', tags: ['gray', 'silver', 'moon', 'stone', 'light', 'soft', 'neutral', 'pale', 'pearl', 'gentle'] },
  { color: '#b3b3b3', name: 'Silver Mist', tags: ['gray', 'silver', 'mist', 'fog', 'light', 'soft', 'cloud', 'neutral', 'pale', 'gentle'] },
  { color: '#bfbfbf', name: 'Ash', tags: ['gray', 'ash', 'silver', 'light', 'pale', 'soft', 'smoke', 'dust', 'cloud', 'gentle'] },
  { color: '#cccccc', name: 'Pearl Gray', tags: ['gray', 'pearl', 'silver', 'light', 'pale', 'soft', 'cloud', 'snow', 'fog', 'gentle'] },
  { color: '#d9d9d9', name: 'Dove', tags: ['gray', 'dove', 'silver', 'light', 'pale', 'soft', 'feather', 'cloud', 'snow', 'gentle'] },
  { color: '#e6e6e6', name: 'Bone White', tags: ['gray', 'white', 'bone', 'light', 'pale', 'soft', 'snow', 'cloud', 'fog', 'pearl'] },
  { color: '#f2f2f2', name: 'Snow', tags: ['white', 'snow', 'light', 'pale', 'soft', 'ice', 'cloud', 'frost', 'winter', 'clean'] },
  { color: '#ffffff', name: 'Pure White', tags: ['white', 'light', 'bright', 'pure', 'clean', 'snow', 'cloud', 'ice', 'pearl', 'ivory'] },

  // Reds (22-50)
  { color: '#1a0000', name: 'Blood Night', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'deep', 'vampire', 'gothic', 'noir', 'shadow'] },
  { color: '#330000', name: 'Dark Burgundy', tags: ['red', 'dark', 'burgundy', 'wine', 'maroon', 'cherry', 'berry', 'velvet', 'gothic', 'rich'] },
  { color: '#4d0000', name: 'Oxblood', tags: ['red', 'dark', 'blood', 'ox', 'maroon', 'burgundy', 'wine', 'leather', 'deep', 'rich'] },
  { color: '#660000', name: 'Dark Cherry', tags: ['red', 'cherry', 'dark', 'wine', 'maroon', 'burgundy', 'berry', 'crimson', 'velvet', 'rich'] },
  { color: '#800000', name: 'Maroon', tags: ['red', 'maroon', 'blood', 'wine', 'burgundy', 'cherry', 'berry', 'crimson', 'brick', 'rust'] },
  { color: '#990000', name: 'Crimson', tags: ['red', 'crimson', 'blood', 'wine', 'cherry', 'berry', 'ruby', 'garnet', 'passion', 'fire'] },
  { color: '#b30000', name: 'Ruby', tags: ['red', 'ruby', 'crimson', 'blood', 'jewel', 'gem', 'fire', 'passion', 'love', 'heart'] },
  { color: '#cc0000', name: 'Fire Red', tags: ['red', 'fire', 'flame', 'cherry', 'berry', 'ruby', 'hot', 'passion', 'danger', 'alert'] },
  { color: '#e60000', name: 'Scarlet', tags: ['red', 'scarlet', 'bright', 'fire', 'flame', 'cherry', 'hot', 'passion', 'bold', 'vibrant'] },
  { color: '#ff0000', name: 'Pure Red', tags: ['red', 'bright', 'fire', 'flame', 'hot', 'passion', 'love', 'danger', 'stop', 'alert'] },
  { color: '#ff1a1a', name: 'Candy Apple', tags: ['red', 'candy', 'apple', 'bright', 'cherry', 'fire', 'hot', 'sweet', 'shiny', 'vibrant'] },
  { color: '#ff3333', name: 'Strawberry', tags: ['red', 'strawberry', 'berry', 'bright', 'cherry', 'candy', 'sweet', 'fruit', 'summer', 'fresh'] },
  { color: '#ff4d4d', name: 'Watermelon', tags: ['red', 'watermelon', 'fruit', 'pink', 'coral', 'summer', 'fresh', 'sweet', 'tropical', 'juicy'] },
  { color: '#ff6666', name: 'Coral Red', tags: ['red', 'coral', 'pink', 'salmon', 'peach', 'warm', 'soft', 'gentle', 'romantic', 'blush'] },
  { color: '#ff8080', name: 'Light Coral', tags: ['red', 'coral', 'pink', 'light', 'soft', 'warm', 'gentle', 'romantic', 'blush', 'rose'] },
  { color: '#ff9999', name: 'Salmon Pink', tags: ['red', 'pink', 'salmon', 'coral', 'peach', 'blush', 'soft', 'gentle', 'romantic', 'pastel'] },
  { color: '#ffb3b3', name: 'Rose Blush', tags: ['pink', 'rose', 'blush', 'light', 'soft', 'gentle', 'romantic', 'feminine', 'pastel', 'delicate'] },
  { color: '#ffcccc', name: 'Ballet Pink', tags: ['pink', 'pale', 'light', 'blush', 'rose', 'soft', 'gentle', 'romantic', 'baby', 'pastel'] },
  { color: '#8b0000', name: 'Dark Red', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'burgundy', 'cherry', 'crimson', 'brick', 'rust'] },
  { color: '#a52a2a', name: 'Brick', tags: ['red', 'brown', 'brick', 'rust', 'auburn', 'chestnut', 'clay', 'earth', 'autumn', 'warm'] },
  { color: '#b22222', name: 'Firebrick', tags: ['red', 'brick', 'fire', 'rust', 'crimson', 'barn', 'clay', 'earth', 'autumn', 'warm'] },
  { color: '#c0392b', name: 'Pomegranate', tags: ['red', 'pomegranate', 'fruit', 'ruby', 'crimson', 'rich', 'deep', 'jewel', 'autumn', 'harvest'] },
  { color: '#cd5c5c', name: 'Indian Red', tags: ['red', 'pink', 'coral', 'salmon', 'rose', 'dusty', 'muted', 'soft', 'warm', 'earth'] },
  { color: '#dc143c', name: 'Cherry', tags: ['red', 'cherry', 'crimson', 'berry', 'ruby', 'garnet', 'passion', 'love', 'heart', 'fire'] },
  { color: '#e74c3c', name: 'Alizarin', tags: ['red', 'bright', 'fire', 'tomato', 'coral', 'warm', 'bold', 'vibrant', 'energy', 'passion'] },

  // Oranges (51-75)
  { color: '#1a0a00', name: 'Dark Umber', tags: ['brown', 'dark', 'umber', 'chocolate', 'coffee', 'earth', 'soil', 'mud', 'deep', 'rich'] },
  { color: '#331400', name: 'Espresso', tags: ['brown', 'dark', 'espresso', 'coffee', 'chocolate', 'wood', 'bark', 'earth', 'rich', 'deep'] },
  { color: '#4d2600', name: 'Dark Chocolate', tags: ['brown', 'chocolate', 'dark', 'coffee', 'cocoa', 'wood', 'bark', 'earth', 'rich', 'deep'] },
  { color: '#663300', name: 'Saddle Brown', tags: ['brown', 'saddle', 'leather', 'wood', 'bark', 'earth', 'caramel', 'toffee', 'amber', 'warm'] },
  { color: '#804000', name: 'Rust', tags: ['orange', 'rust', 'brown', 'copper', 'bronze', 'autumn', 'fall', 'earth', 'metal', 'warm'] },
  { color: '#994d00', name: 'Burnt Sienna', tags: ['orange', 'brown', 'sienna', 'rust', 'copper', 'bronze', 'earth', 'autumn', 'warm', 'rich'] },
  { color: '#b35900', name: 'Copper', tags: ['orange', 'copper', 'bronze', 'metal', 'rust', 'autumn', 'penny', 'warm', 'rich', 'earth'] },
  { color: '#cc6600', name: 'Burnt Orange', tags: ['orange', 'burnt', 'rust', 'copper', 'autumn', 'fall', 'pumpkin', 'warm', 'rich', 'spice'] },
  { color: '#e67300', name: 'Tangerine', tags: ['orange', 'tangerine', 'citrus', 'bright', 'tropical', 'fruit', 'summer', 'warm', 'vibrant', 'energy'] },
  { color: '#ff8000', name: 'Pure Orange', tags: ['orange', 'bright', 'fire', 'flame', 'sunset', 'pumpkin', 'carrot', 'mango', 'citrus', 'tropical'] },
  { color: '#ff8c1a', name: 'Mango', tags: ['orange', 'mango', 'tropical', 'fruit', 'summer', 'sweet', 'bright', 'warm', 'vibrant', 'exotic'] },
  { color: '#ff9933', name: 'Apricot', tags: ['orange', 'apricot', 'peach', 'fruit', 'soft', 'warm', 'gentle', 'summer', 'sweet', 'pastel'] },
  { color: '#ffa64d', name: 'Cantaloupe', tags: ['orange', 'cantaloupe', 'melon', 'fruit', 'peach', 'soft', 'warm', 'summer', 'sweet', 'fresh'] },
  { color: '#ffb366', name: 'Peach', tags: ['orange', 'peach', 'apricot', 'soft', 'warm', 'gentle', 'skin', 'nude', 'blush', 'pastel'] },
  { color: '#ffc080', name: 'Light Peach', tags: ['orange', 'peach', 'light', 'soft', 'warm', 'gentle', 'skin', 'nude', 'cream', 'pastel'] },
  { color: '#ffcc99', name: 'Champagne', tags: ['orange', 'champagne', 'cream', 'light', 'soft', 'warm', 'gentle', 'elegant', 'pastel', 'nude'] },
  { color: '#ffd9b3', name: 'Bisque', tags: ['orange', 'bisque', 'cream', 'light', 'pale', 'soft', 'warm', 'gentle', 'skin', 'nude'] },
  { color: '#d2691e', name: 'Chocolate', tags: ['orange', 'brown', 'chocolate', 'caramel', 'toffee', 'cinnamon', 'spice', 'wood', 'leather', 'warm'] },
  { color: '#e67e22', name: 'Carrot', tags: ['orange', 'carrot', 'vegetable', 'bright', 'autumn', 'harvest', 'warm', 'healthy', 'fresh', 'vibrant'] },
  { color: '#f39c12', name: 'Honey', tags: ['orange', 'honey', 'gold', 'amber', 'sweet', 'warm', 'golden', 'autumn', 'bee', 'natural'] },
  { color: '#ff7f50', name: 'Coral', tags: ['orange', 'coral', 'salmon', 'peach', 'tropical', 'beach', 'sunset', 'warm', 'soft', 'vibrant'] },
  { color: '#ff6347', name: 'Tomato', tags: ['orange', 'red', 'tomato', 'coral', 'salmon', 'warm', 'hot', 'fire', 'vegetable', 'garden'] },
  { color: '#e2725b', name: 'Terracotta', tags: ['orange', 'terracotta', 'clay', 'earth', 'pottery', 'warm', 'muted', 'rustic', 'mediterranean', 'desert'] },
  { color: '#c04000', name: 'Mahogany', tags: ['orange', 'mahogany', 'wood', 'brown', 'rust', 'rich', 'deep', 'warm', 'furniture', 'antique'] },
  { color: '#a0522d', name: 'Sienna', tags: ['orange', 'sienna', 'brown', 'earth', 'clay', 'rust', 'autumn', 'warm', 'natural', 'organic'] },

  // Browns (101-115)
  { color: '#1a0f00', name: 'Dark Umber', tags: ['brown', 'dark', 'umber', 'chocolate', 'coffee', 'espresso', 'wood', 'bark', 'earth', 'soil'] },
  { color: '#2d1a00', name: 'Rich Espresso', tags: ['brown', 'dark', 'espresso', 'coffee', 'chocolate', 'wood', 'bark', 'earth', 'soil', 'mud'] },
  { color: '#3d2b1f', name: 'Dark Walnut', tags: ['brown', 'dark', 'walnut', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'leather', 'rich'] },
  { color: '#4a2c2a', name: 'Chestnut', tags: ['brown', 'chestnut', 'dark', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'leather', 'auburn'] },
  { color: '#5c4033', name: 'Oak Brown', tags: ['brown', 'oak', 'wood', 'bark', 'earth', 'leather', 'saddle', 'rich', 'warm', 'natural'] },
  { color: '#6b4423', name: 'Walnut', tags: ['brown', 'walnut', 'wood', 'bark', 'earth', 'leather', 'saddle', 'rich', 'warm', 'natural'] },
  { color: '#7b3f00', name: 'Toffee', tags: ['brown', 'toffee', 'caramel', 'chocolate', 'coffee', 'wood', 'leather', 'rich', 'warm', 'autumn'] },
  { color: '#8b4513', name: 'Saddle Brown', tags: ['brown', 'saddle', 'leather', 'wood', 'bark', 'chocolate', 'coffee', 'cinnamon', 'spice', 'earth'] },
  { color: '#6f4e37', name: 'Coffee Bean', tags: ['brown', 'coffee', 'mocha', 'chocolate', 'wood', 'bark', 'earth', 'leather', 'warm', 'rich'] },
  { color: '#4b3621', name: 'Dark Mocha', tags: ['brown', 'mocha', 'dark', 'coffee', 'chocolate', 'wood', 'bark', 'earth', 'leather', 'rich'] },
  { color: '#8b7355', name: 'Taupe', tags: ['brown', 'taupe', 'tan', 'mushroom', 'stone', 'earth', 'warm', 'muted', 'neutral', 'natural'] },
  { color: '#a67b5b', name: 'Caramel Latte', tags: ['brown', 'caramel', 'latte', 'tan', 'toffee', 'coffee', 'mocha', 'warm', 'soft', 'natural'] },
  { color: '#bc8f8f', name: 'Dusty Rose Brown', tags: ['brown', 'pink', 'rose', 'dusty', 'muted', 'soft', 'warm', 'gentle', 'romantic', 'vintage'] },

  // Greens (116-145)
  { color: '#0a1a00', name: 'Jungle Night', tags: ['green', 'dark', 'forest', 'jungle', 'night', 'shadow', 'deep', 'rich', 'nature', 'tree'] },
  { color: '#143300', name: 'Deep Forest', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'plant'] },
  { color: '#1e4d00', name: 'Hunter Green', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'hunter'] },
  { color: '#286600', name: 'Bottle Green', tags: ['green', 'forest', 'jungle', 'nature', 'tree', 'leaf', 'plant', 'grass', 'bottle', 'rich'] },
  { color: '#328000', name: 'Grass Green', tags: ['green', 'forest', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh'] },
  { color: '#3c9900', name: 'Lawn', tags: ['green', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring'] },
  { color: '#46b300', name: 'Spring Green', tags: ['green', 'bright', 'grass', 'nature', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring'] },
  { color: '#50cc00', name: 'Lime Green', tags: ['green', 'bright', 'lime', 'grass', 'nature', 'leaf', 'plant', 'organic', 'natural', 'fresh'] },
  { color: '#00ff00', name: 'Neon Green', tags: ['green', 'bright', 'lime', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring', 'fresh'] },
  { color: '#33ff33', name: 'Electric Lime', tags: ['green', 'bright', 'lime', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring', 'fresh'] },
  { color: '#66ff66', name: 'Mint Lime', tags: ['green', 'light', 'lime', 'mint', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'plant'] },
  { color: '#99ff99', name: 'Pale Mint', tags: ['green', 'light', 'pale', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature'] },
  { color: '#ccffcc', name: 'Ice Mint', tags: ['green', 'pale', 'light', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature'] },
  { color: '#228b22', name: 'Forest Green', tags: ['green', 'forest', 'nature', 'tree', 'leaf', 'plant', 'grass', 'organic', 'natural', 'fresh'] },
  { color: '#2e8b57', name: 'Sea Green', tags: ['green', 'sea', 'ocean', 'water', 'nature', 'forest', 'jungle', 'tropical', 'organic', 'natural'] },
  { color: '#3cb371', name: 'Medium Sea', tags: ['green', 'sea', 'ocean', 'water', 'nature', 'tropical', 'spring', 'fresh', 'cool', 'calm'] },
  { color: '#006400', name: 'Pine', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'pine'] },
  { color: '#008000', name: 'Pure Green', tags: ['green', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring'] },
  { color: '#355e3b', name: 'British Racing', tags: ['green', 'dark', 'forest', 'hunter', 'jungle', 'nature', 'tree', 'leaf', 'pine', 'evergreen'] },
  { color: '#556b2f', name: 'Olive Drab', tags: ['green', 'olive', 'army', 'military', 'khaki', 'camouflage', 'nature', 'earth', 'forest', 'jungle'] },
  { color: '#6b8e23', name: 'Olive Green', tags: ['green', 'olive', 'yellow', 'grass', 'nature', 'meadow', 'field', 'prairie', 'autumn', 'fall'] },
  { color: '#808000', name: 'Dark Olive', tags: ['green', 'olive', 'yellow', 'army', 'military', 'khaki', 'camouflage', 'earth', 'nature', 'autumn'] },
  { color: '#9acd32', name: 'Yellow Green', tags: ['green', 'yellow', 'lime', 'chartreuse', 'bright', 'spring', 'fresh', 'nature', 'grass', 'leaf'] },
  { color: '#4f7942', name: 'Fern', tags: ['green', 'fern', 'forest', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh'] },
  { color: '#8fbc8f', name: 'Sage', tags: ['green', 'sea', 'sage', 'muted', 'soft', 'gentle', 'pale', 'light', 'nature', 'organic'] },
  { color: '#90ee90', name: 'Light Green', tags: ['green', 'light', 'pale', 'mint', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'soft'] },
  { color: '#98fb98', name: 'Pale Green', tags: ['green', 'pale', 'light', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature'] },
  { color: '#adff2f', name: 'Chartreuse', tags: ['green', 'yellow', 'lime', 'chartreuse', 'neon', 'bright', 'electric', 'vibrant', 'bold', 'energy'] },

  // Teals & Cyans (146-163)
  { color: '#003333', name: 'Deep Teal', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'night', 'shadow', 'forest', 'jungle'] },
  { color: '#004d4d', name: 'Dark Teal', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'forest', 'jungle', 'mysterious', 'cool'] },
  { color: '#006666', name: 'Peacock', tags: ['teal', 'dark', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'cool', 'cold', 'winter'] },
  { color: '#008080', name: 'Pure Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'aqua', 'cool', 'calm'] },
  { color: '#009999', name: 'Tropical Teal', tags: ['teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'aqua', 'cool'] },
  { color: '#00b3b3', name: 'Bright Teal', tags: ['teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'fresh'] },
  { color: '#00cccc', name: 'Electric Teal', tags: ['cyan', 'teal', 'ocean', 'sea', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'fresh'] },
  { color: '#00ffff', name: 'Cyan', tags: ['cyan', 'aqua', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'water', 'ocean', 'sea'] },
  { color: '#33ffff', name: 'Light Cyan', tags: ['cyan', 'aqua', 'bright', 'neon', 'electric', 'water', 'ocean', 'pool', 'ice', 'cool'] },
  { color: '#66ffff', name: 'Pale Cyan', tags: ['cyan', 'aqua', 'light', 'pale', 'water', 'ocean', 'pool', 'ice', 'cool', 'fresh'] },
  { color: '#99ffff', name: 'Ice Cyan', tags: ['cyan', 'aqua', 'pale', 'light', 'pastel', 'water', 'ice', 'cool', 'fresh', 'clean'] },
  { color: '#ccffff', name: 'Arctic Cyan', tags: ['cyan', 'aqua', 'pale', 'light', 'pastel', 'ice', 'snow', 'cool', 'fresh', 'clean'] },
  { color: '#008b8b', name: 'Dark Cyan', tags: ['teal', 'dark', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'cool'] },
  { color: '#20b2aa', name: 'Light Sea Green', tags: ['teal', 'cyan', 'sea', 'ocean', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'calm'] },
  { color: '#40e0d0', name: 'Turquoise', tags: ['turquoise', 'teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'aqua', 'bright'] },
  { color: '#48d1cc', name: 'Medium Turquoise', tags: ['turquoise', 'teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'aqua', 'medium', 'cool'] },
  { color: '#00ced1', name: 'Dark Turquoise', tags: ['turquoise', 'cyan', 'teal', 'ocean', 'sea', 'water', 'tropical', 'aqua', 'bright', 'vibrant'] },
  { color: '#5f9ea0', name: 'Cadet Blue', tags: ['teal', 'gray', 'blue', 'sea', 'ocean', 'water', 'muted', 'dusty', 'soft', 'calm'] },

  // Blues (164-182)
  { color: '#000033', name: 'Midnight Blue', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space'] },
  { color: '#000066', name: 'Dark Navy', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space'] },
  { color: '#000080', name: 'Navy Blue', tags: ['blue', 'navy', 'dark', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'elegant'] },
  { color: '#000099', name: 'Sapphire Dark', tags: ['blue', 'navy', 'dark', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'sapphire'] },
  { color: '#0000cc', name: 'Cobalt', tags: ['blue', 'bright', 'royal', 'cobalt', 'electric', 'vibrant', 'bold', 'rich', 'deep', 'ocean'] },
  { color: '#0000ff', name: 'Pure Blue', tags: ['blue', 'bright', 'primary', 'electric', 'vibrant', 'bold', 'royal', 'cobalt', 'intense', 'dramatic'] },
  { color: '#3333ff', name: 'Electric Blue', tags: ['blue', 'bright', 'electric', 'vibrant', 'bold', 'royal', 'cobalt', 'intense', 'dramatic', 'neon'] },
  { color: '#6666ff', name: 'Periwinkle Blue', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'bright', 'electric', 'vibrant', 'soft', 'gentle'] },
  { color: '#9999ff', name: 'Light Periwinkle', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'light', 'pale', 'soft', 'gentle', 'pastel'] },
  { color: '#ccccff', name: 'Pale Lavender', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'pale', 'light', 'pastel', 'soft', 'gentle'] },
  { color: '#191970', name: 'Midnight', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space'] },
  { color: '#00008b', name: 'Dark Blue', tags: ['blue', 'dark', 'navy', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'elegant'] },
  { color: '#4169e1', name: 'Royal Blue', tags: ['blue', 'royal', 'bright', 'vibrant', 'rich', 'elegant', 'sophisticated', 'regal', 'noble', 'majestic'] },
  { color: '#1e90ff', name: 'Dodger Blue', tags: ['blue', 'bright', 'sky', 'dodger', 'electric', 'vibrant', 'bold', 'ocean', 'sea', 'water'] },
  { color: '#4682b4', name: 'Steel Blue', tags: ['blue', 'steel', 'gray', 'muted', 'dusty', 'soft', 'calm', 'serene', 'peaceful', 'cool'] },
  { color: '#6495ed', name: 'Cornflower', tags: ['blue', 'cornflower', 'medium', 'soft', 'gentle', 'calm', 'serene', 'peaceful', 'sky', 'spring'] },
  { color: '#87ceeb', name: 'Sky Blue', tags: ['blue', 'sky', 'light', 'pale', 'soft', 'gentle', 'calm', 'serene', 'peaceful', 'fresh'] },
  { color: '#add8e6', name: 'Light Blue', tags: ['blue', 'light', 'pale', 'soft', 'gentle', 'calm', 'baby', 'pastel', 'powder', 'sky'] },
  { color: '#b0c4de', name: 'Light Steel', tags: ['blue', 'steel', 'light', 'pale', 'gray', 'muted', 'soft', 'gentle', 'calm', 'cool'] },

  // Purples & Violets (183-206)
  { color: '#1a001a', name: 'Void Purple', tags: ['purple', 'dark', 'black', 'night', 'shadow', 'deep', 'rich', 'mysterious', 'gothic', 'vampire'] },
  { color: '#330033', name: 'Dark Grape', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'gothic', 'vampire', 'witch', 'magic', 'mystic'] },
  { color: '#4d004d', name: 'Eggplant', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'gothic', 'magic', 'mystic', 'cosmic', 'eggplant'] },
  { color: '#660066', name: 'Deep Purple', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'eggplant', 'plum'] },
  { color: '#800080', name: 'Purple', tags: ['purple', 'magenta', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'rich', 'deep', 'grape'] },
  { color: '#990099', name: 'Vivid Purple', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'royal', 'regal', 'elegant', 'luxury'] },
  { color: '#b300b3', name: 'Electric Purple', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'neon', 'grape', 'berry', 'orchid'] },
  { color: '#cc00cc', name: 'Neon Purple', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'neon', 'hot', 'grape', 'berry'] },
  { color: '#ff00ff', name: 'Magenta', tags: ['magenta', 'pink', 'purple', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'hot', 'fuchsia'] },
  { color: '#ff33ff', name: 'Light Magenta', tags: ['magenta', 'pink', 'purple', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'hot', 'fuchsia'] },
  { color: '#ff66ff', name: 'Soft Magenta', tags: ['magenta', 'pink', 'purple', 'light', 'bright', 'vibrant', 'soft', 'gentle', 'fuchsia', 'orchid'] },
  { color: '#ff99ff', name: 'Pale Magenta', tags: ['pink', 'purple', 'magenta', 'light', 'pale', 'soft', 'gentle', 'pastel', 'orchid', 'flower'] },
  { color: '#ffccff', name: 'Pink Lavender', tags: ['pink', 'purple', 'pale', 'light', 'pastel', 'soft', 'gentle', 'romantic', 'feminine', 'pretty'] },
  { color: '#4b0082', name: 'Indigo', tags: ['purple', 'indigo', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'space'] },
  { color: '#6a0dad', name: 'Violet', tags: ['purple', 'violet', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'grape'] },
  { color: '#8b008b', name: 'Dark Magenta', tags: ['purple', 'magenta', 'dark', 'deep', 'rich', 'grape', 'plum', 'berry', 'orchid', 'flower'] },
  { color: '#9400d3', name: 'Dark Violet', tags: ['purple', 'violet', 'bright', 'vibrant', 'bold', 'electric', 'grape', 'plum', 'berry', 'orchid'] },
  { color: '#9932cc', name: 'Dark Orchid', tags: ['purple', 'orchid', 'violet', 'bright', 'vibrant', 'bold', 'grape', 'plum', 'berry', 'flower'] },
  { color: '#ba55d3', name: 'Medium Orchid', tags: ['purple', 'orchid', 'violet', 'medium', 'soft', 'gentle', 'grape', 'plum', 'berry', 'flower'] },
  { color: '#800020', name: 'Burgundy', tags: ['purple', 'red', 'burgundy', 'wine', 'maroon', 'dark', 'deep', 'rich', 'grape', 'berry'] },
  { color: '#722f37', name: 'Wine', tags: ['purple', 'red', 'wine', 'burgundy', 'maroon', 'dark', 'deep', 'rich', 'grape', 'berry'] },
  { color: '#5d3954', name: 'Dusty Mauve', tags: ['purple', 'brown', 'mauve', 'dusty', 'muted', 'soft', 'vintage', 'antique', 'romantic', 'feminine'] },
  { color: '#673147', name: 'Plum Wine', tags: ['purple', 'red', 'wine', 'burgundy', 'mauve', 'dusty', 'muted', 'vintage', 'antique', 'romantic'] },

  // Pinks & Rose (207-224)
  { color: '#330019', name: 'Dark Rose', tags: ['pink', 'dark', 'deep', 'rich', 'wine', 'burgundy', 'maroon', 'berry', 'cherry', 'plum'] },
  { color: '#660033', name: 'Deep Rose', tags: ['pink', 'dark', 'deep', 'rich', 'wine', 'burgundy', 'berry', 'cherry', 'plum', 'magenta'] },
  { color: '#99004d', name: 'Raspberry', tags: ['pink', 'magenta', 'deep', 'rich', 'berry', 'cherry', 'raspberry', 'plum', 'fuchsia', 'hot'] },
  { color: '#cc0066', name: 'Hot Magenta', tags: ['pink', 'magenta', 'hot', 'bright', 'vibrant', 'bold', 'fuchsia', 'berry', 'raspberry', 'cherry'] },
  { color: '#ff0080', name: 'Neon Pink', tags: ['pink', 'magenta', 'hot', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'fuchsia', 'berry'] },
  { color: '#ff3399', name: 'Hot Pink', tags: ['pink', 'hot', 'bright', 'vibrant', 'bold', 'magenta', 'fuchsia', 'berry', 'raspberry', 'bubblegum'] },
  { color: '#ff66b3', name: 'Bubblegum', tags: ['pink', 'bright', 'vibrant', 'soft', 'gentle', 'magenta', 'fuchsia', 'berry', 'raspberry', 'bubblegum'] },
  { color: '#ff99cc', name: 'Cotton Candy', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic'] },
  { color: '#ffcce6', name: 'Pale Pink', tags: ['pink', 'pale', 'light', 'pastel', 'soft', 'gentle', 'rose', 'blush', 'petal', 'flower'] },
  { color: '#c71585', name: 'Medium Violet Red', tags: ['pink', 'magenta', 'violet', 'deep', 'rich', 'berry', 'raspberry', 'plum', 'orchid', 'flower'] },
  { color: '#db7093', name: 'Pale Violet Red', tags: ['pink', 'rose', 'dusty', 'muted', 'soft', 'gentle', 'romantic', 'feminine', 'pretty', 'vintage'] },
  { color: '#ff69b4', name: 'Hot Pink Light', tags: ['pink', 'hot', 'bright', 'vibrant', 'bold', 'bubblegum', 'candy', 'sweet', 'fun', 'playful'] },
  { color: '#ffb6c1', name: 'Light Pink', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic'] },
  { color: '#ffc0cb', name: 'Pink', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic'] },
  { color: '#e75480', name: 'Dark Pink', tags: ['pink', 'rose', 'medium', 'soft', 'gentle', 'romantic', 'feminine', 'pretty', 'flower', 'petal'] },
  { color: '#f08080', name: 'Light Coral', tags: ['pink', 'coral', 'salmon', 'peach', 'soft', 'warm', 'gentle', 'muted', 'dusty', 'romantic'] },
  { color: '#fa8072', name: 'Salmon', tags: ['pink', 'coral', 'salmon', 'peach', 'orange', 'soft', 'warm', 'gentle', 'tropical', 'beach'] },
  { color: '#e9967a', name: 'Dark Salmon', tags: ['pink', 'coral', 'salmon', 'peach', 'orange', 'soft', 'warm', 'gentle', 'muted', 'dusty'] },

  // Skin Tones (225-238)
  { color: '#8d5524', name: 'Cinnamon', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body'] },
  { color: '#a0522d', name: 'Sienna Skin', tags: ['brown', 'skin', 'tan', 'sienna', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh'] },
  { color: '#b5651d', name: 'Caramel Skin', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body'] },
  { color: '#c68642', name: 'Golden Brown', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body'] },
  { color: '#d2a679', name: 'Warm Sand', tags: ['brown', 'skin', 'tan', 'beige', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh'] },
  { color: '#e0ac69', name: 'Golden Sand', tags: ['brown', 'skin', 'tan', 'beige', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh'] },
  { color: '#f1c27d', name: 'Light Tan', tags: ['skin', 'tan', 'beige', 'cream', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh'] },
  { color: '#ffcd94', name: 'Peach Skin', tags: ['skin', 'tan', 'beige', 'cream', 'peach', 'warm', 'earth', 'natural', 'organic', 'human'] },
  { color: '#ffdbac', name: 'Light Peach Skin', tags: ['skin', 'beige', 'cream', 'peach', 'light', 'pale', 'warm', 'natural', 'organic', 'human'] },
  { color: '#ffe4c4', name: 'Bisque', tags: ['skin', 'beige', 'cream', 'peach', 'light', 'pale', 'warm', 'natural', 'organic', 'human'] },
  { color: '#ffecd9', name: 'Ivory Skin', tags: ['skin', 'cream', 'peach', 'ivory', 'light', 'pale', 'warm', 'natural', 'organic', 'human'] },
  { color: '#fff5eb', name: 'Porcelain', tags: ['skin', 'cream', 'ivory', 'white', 'light', 'pale', 'warm', 'natural', 'organic', 'human'] },
  { color: '#4a2c2a', name: 'Deep Chocolate Skin', tags: ['brown', 'dark', 'skin', 'chocolate', 'coffee', 'espresso', 'warm', 'earth', 'natural', 'organic'] },
  { color: '#6b4423', name: 'Rich Brown Skin', tags: ['brown', 'skin', 'chocolate', 'coffee', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh'] },

  // Metallics & Stone (239-257)
  { color: '#2f4f4f', name: 'Dark Slate Gray', tags: ['gray', 'dark', 'slate', 'stone', 'rock', 'metal', 'steel', 'iron', 'charcoal', 'graphite'] },
  { color: '#36454f', name: 'Charcoal Gray', tags: ['gray', 'dark', 'charcoal', 'slate', 'stone', 'rock', 'metal', 'steel', 'iron', 'graphite'] },
  { color: '#4a4a4a', name: 'Dark Gray', tags: ['gray', 'dark', 'charcoal', 'stone', 'rock', 'metal', 'steel', 'iron', 'graphite', 'industrial'] },
  { color: '#696969', name: 'Dim Gray', tags: ['gray', 'medium', 'stone', 'rock', 'metal', 'steel', 'iron', 'concrete', 'industrial', 'urban'] },
  { color: '#708090', name: 'Slate Gray', tags: ['gray', 'blue', 'slate', 'stone', 'rock', 'metal', 'steel', 'cool', 'cold', 'professional'] },
  { color: '#778899', name: 'Light Slate', tags: ['gray', 'blue', 'slate', 'stone', 'light', 'pale', 'soft', 'cool', 'cold', 'professional'] },
  { color: '#808080', name: 'Gray', tags: ['gray', 'medium', 'neutral', 'stone', 'rock', 'metal', 'steel', 'concrete', 'industrial', 'urban'] },
  { color: '#a9a9a9', name: 'Dark Silver', tags: ['gray', 'light', 'silver', 'metal', 'steel', 'stone', 'neutral', 'soft', 'gentle', 'muted'] },
  { color: '#c0c0c0', name: 'Silver', tags: ['silver', 'gray', 'light', 'metal', 'metallic', 'shiny', 'chrome', 'platinum', 'steel', 'modern'] },
  { color: '#d3d3d3', name: 'Light Gray', tags: ['gray', 'light', 'silver', 'pale', 'soft', 'gentle', 'neutral', 'cloud', 'fog', 'mist'] },
  { color: '#ffd700', name: 'Gold', tags: ['gold', 'yellow', 'metal', 'metallic', 'shiny', 'bright', 'rich', 'luxury', 'royal', 'regal'] },
  { color: '#daa520', name: 'Goldenrod', tags: ['gold', 'yellow', 'metal', 'metallic', 'amber', 'honey', 'caramel', 'autumn', 'fall', 'harvest'] },
  { color: '#b8860b', name: 'Dark Goldenrod', tags: ['gold', 'yellow', 'dark', 'metal', 'metallic', 'amber', 'honey', 'caramel', 'autumn', 'fall'] },
  { color: '#d4af37', name: 'Metallic Gold', tags: ['gold', 'yellow', 'metal', 'metallic', 'shiny', 'bright', 'rich', 'luxury', 'royal', 'regal'] },
  { color: '#cfb53b', name: 'Old Gold', tags: ['gold', 'yellow', 'metal', 'metallic', 'old', 'antique', 'vintage', 'classic', 'traditional', 'warm'] },
  { color: '#b87333', name: 'Copper', tags: ['copper', 'orange', 'brown', 'metal', 'metallic', 'shiny', 'warm', 'rich', 'earth', 'natural'] },
  { color: '#cd7f32', name: 'Bronze', tags: ['bronze', 'copper', 'orange', 'brown', 'metal', 'metallic', 'shiny', 'warm', 'rich', 'earth'] },
  { color: '#b08d57', name: 'Antique Bronze', tags: ['bronze', 'gold', 'tan', 'brown', 'metal', 'metallic', 'warm', 'muted', 'dusty', 'antique'] },
  { color: '#c9ae5d', name: 'Brass', tags: ['gold', 'bronze', 'tan', 'metal', 'metallic', 'warm', 'muted', 'dusty', 'antique', 'vintage'] },

  // Yellows (258-290)
  { color: '#1a1a00', name: 'Dark Olive Black', tags: ['yellow', 'dark', 'olive', 'black', 'night', 'shadow', 'deep', 'rich', 'earth', 'soil'] },
  { color: '#333300', name: 'Dark Olive', tags: ['yellow', 'dark', 'olive', 'green', 'army', 'military', 'khaki', 'camouflage', 'earth', 'mud'] },
  { color: '#4d4d00', name: 'Olive Brown', tags: ['yellow', 'dark', 'olive', 'green', 'army', 'military', 'khaki', 'camouflage', 'earth', 'autumn'] },
  { color: '#666600', name: 'Dark Mustard', tags: ['yellow', 'dark', 'olive', 'mustard', 'gold', 'amber', 'autumn', 'fall', 'harvest', 'warm'] },
  { color: '#808000', name: 'Olive Yellow', tags: ['yellow', 'olive', 'green', 'army', 'military', 'khaki', 'camouflage', 'earth', 'nature', 'autumn'] },
  { color: '#999900', name: 'Dark Yellow', tags: ['yellow', 'dark', 'mustard', 'gold', 'amber', 'autumn', 'fall', 'harvest', 'warm', 'rich'] },
  { color: '#b3b300', name: 'Yellow Olive', tags: ['yellow', 'olive', 'chartreuse', 'lime', 'gold', 'amber', 'autumn', 'fall', 'harvest', 'warm'] },
  { color: '#cccc00', name: 'Bright Yellow Green', tags: ['yellow', 'bright', 'chartreuse', 'lime', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring'] },
  { color: '#e6e600', name: 'Lemon Yellow', tags: ['yellow', 'bright', 'lemon', 'citrus', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring'] },
  { color: '#ffff00', name: 'Pure Yellow', tags: ['yellow', 'bright', 'primary', 'neon', 'electric', 'vibrant', 'bold', 'sun', 'lemon', 'citrus'] },
  { color: '#ffff33', name: 'Light Yellow', tags: ['yellow', 'bright', 'light', 'lemon', 'citrus', 'neon', 'electric', 'vibrant', 'sun', 'summer'] },
  { color: '#ffff66', name: 'Pale Yellow', tags: ['yellow', 'light', 'pale', 'lemon', 'citrus', 'soft', 'gentle', 'pastel', 'sun', 'summer'] },
  { color: '#ffff99', name: 'Cream Yellow', tags: ['yellow', 'pale', 'light', 'cream', 'pastel', 'soft', 'gentle', 'butter', 'vanilla', 'warm'] },
  { color: '#ffffcc', name: 'Light Cream', tags: ['yellow', 'cream', 'pale', 'light', 'pastel', 'soft', 'gentle', 'butter', 'vanilla', 'ivory'] },
  { color: '#f0e68c', name: 'Khaki', tags: ['yellow', 'tan', 'beige', 'khaki', 'sand', 'desert', 'earth', 'natural', 'neutral', 'warm'] },
  { color: '#ffd700', name: 'Golden Yellow', tags: ['yellow', 'gold', 'bright', 'metallic', 'shiny', 'rich', 'luxury', 'royal', 'sun', 'warm'] },
  { color: '#ffc000', name: 'Amber Yellow', tags: ['yellow', 'orange', 'amber', 'gold', 'bright', 'warm', 'rich', 'honey', 'autumn', 'sunset'] },
  { color: '#ffb000', name: 'Deep Amber', tags: ['yellow', 'orange', 'amber', 'gold', 'bright', 'warm', 'rich', 'honey', 'autumn', 'sunset'] },
  { color: '#ffa000', name: 'Orange Yellow', tags: ['yellow', 'orange', 'amber', 'gold', 'bright', 'warm', 'rich', 'honey', 'autumn', 'sunset'] },
  { color: '#eedd82', name: 'Light Goldenrod', tags: ['yellow', 'tan', 'beige', 'gold', 'soft', 'warm', 'muted', 'gentle', 'natural', 'wheat'] },
  { color: '#f5deb3', name: 'Wheat', tags: ['yellow', 'tan', 'beige', 'cream', 'soft', 'warm', 'natural', 'organic', 'earth', 'grain'] },
  { color: '#ffe4b5', name: 'Moccasin', tags: ['yellow', 'tan', 'beige', 'cream', 'peach', 'soft', 'warm', 'natural', 'organic', 'leather'] },
  { color: '#ffefd5', name: 'Papaya Whip', tags: ['yellow', 'cream', 'peach', 'pale', 'soft', 'warm', 'natural', 'organic', 'delicate', 'gentle'] },
  { color: '#fff8dc', name: 'Cornsilk', tags: ['yellow', 'cream', 'ivory', 'pale', 'soft', 'warm', 'natural', 'organic', 'delicate', 'gentle'] },
  { color: '#fffacd', name: 'Lemon Chiffon', tags: ['yellow', 'cream', 'lemon', 'pale', 'soft', 'warm', 'natural', 'delicate', 'gentle', 'pastel'] },
  { color: '#fafad2', name: 'Light Goldenrod Yellow', tags: ['yellow', 'cream', 'pale', 'soft', 'warm', 'natural', 'delicate', 'gentle', 'pastel', 'butter'] },
  { color: '#ffec8b', name: 'Light Yellow Gold', tags: ['yellow', 'gold', 'light', 'soft', 'warm', 'natural', 'butter', 'cream', 'pastel', 'gentle'] },
  { color: '#ffd700', name: 'Bright Gold', tags: ['yellow', 'gold', 'bright', 'metallic', 'shiny', 'rich', 'luxury', 'royal', 'sun', 'warm'] },
  { color: '#daa520', name: 'Goldenrod Yellow', tags: ['yellow', 'gold', 'amber', 'honey', 'autumn', 'fall', 'harvest', 'warm', 'rich', 'earth'] },
  { color: '#cd853f', name: 'Peru', tags: ['yellow', 'brown', 'tan', 'earth', 'natural', 'warm', 'organic', 'rustic', 'autumn', 'fall'] },
  { color: '#d2b48c', name: 'Tan', tags: ['yellow', 'brown', 'tan', 'beige', 'earth', 'natural', 'warm', 'organic', 'sand', 'desert'] },
  { color: '#c4a060', name: 'Dark Tan', tags: ['yellow', 'brown', 'tan', 'beige', 'earth', 'natural', 'warm', 'organic', 'sand', 'desert'] },
  { color: '#bdb76b', name: 'Dark Khaki', tags: ['yellow', 'tan', 'khaki', 'olive', 'earth', 'natural', 'warm', 'organic', 'sand', 'desert'] },

  // Extra Earth Tones (291-320)
  { color: '#704214', name: 'Sepia', tags: ['brown', 'dark', 'sepia', 'vintage', 'antique', 'photo', 'old', 'warm', 'earth', 'rich'] },
  { color: '#5d4037', name: 'Brown Sugar', tags: ['brown', 'dark', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'warm', 'rich', 'natural'] },
  { color: '#795548', name: 'Warm Brown', tags: ['brown', 'medium', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'warm', 'rich', 'natural'] },
  { color: '#8d6e63', name: 'Light Brown', tags: ['brown', 'light', 'tan', 'taupe', 'mushroom', 'earth', 'warm', 'soft', 'natural', 'neutral'] },
  { color: '#a1887f', name: 'Warm Taupe', tags: ['brown', 'tan', 'taupe', 'mushroom', 'stone', 'earth', 'warm', 'soft', 'natural', 'neutral'] },
  { color: '#bcaaa4', name: 'Light Taupe', tags: ['brown', 'tan', 'taupe', 'beige', 'cream', 'soft', 'warm', 'neutral', 'natural', 'gentle'] },
  { color: '#d7ccc8', name: 'Pale Taupe', tags: ['brown', 'cream', 'taupe', 'beige', 'pale', 'soft', 'warm', 'neutral', 'natural', 'gentle'] },
  { color: '#efebe9', name: 'Off White', tags: ['cream', 'white', 'beige', 'pale', 'soft', 'warm', 'neutral', 'natural', 'gentle', 'clean'] },
  { color: '#87553e', name: 'Burnt Clay', tags: ['brown', 'orange', 'terracotta', 'clay', 'earth', 'pottery', 'warm', 'rustic', 'natural', 'organic'] },
  { color: '#9e6b5a', name: 'Dusty Terra', tags: ['brown', 'orange', 'terracotta', 'clay', 'earth', 'pottery', 'warm', 'dusty', 'muted', 'rustic'] },
  { color: '#a87d65', name: 'Warm Clay', tags: ['brown', 'orange', 'terracotta', 'clay', 'earth', 'pottery', 'warm', 'natural', 'organic', 'rustic'] },
  { color: '#b49082', name: 'Soft Clay', tags: ['brown', 'tan', 'terracotta', 'clay', 'earth', 'pottery', 'warm', 'soft', 'natural', 'organic'] },
  { color: '#c4a89a', name: 'Pale Clay', tags: ['brown', 'tan', 'cream', 'clay', 'earth', 'pottery', 'warm', 'soft', 'natural', 'organic'] },
  { color: '#5e503f', name: 'Umber', tags: ['brown', 'dark', 'umber', 'earth', 'soil', 'mud', 'natural', 'organic', 'rustic', 'deep'] },
  { color: '#7a6855', name: 'Raw Umber', tags: ['brown', 'medium', 'umber', 'earth', 'soil', 'mud', 'natural', 'organic', 'rustic', 'warm'] },
  { color: '#96836e', name: 'Warm Umber', tags: ['brown', 'tan', 'umber', 'earth', 'soil', 'natural', 'organic', 'rustic', 'warm', 'soft'] },
  { color: '#3d2817', name: 'Raw Sienna Dark', tags: ['brown', 'dark', 'sienna', 'earth', 'soil', 'mud', 'natural', 'organic', 'rustic', 'deep'] },
  { color: '#5c4028', name: 'Raw Sienna', tags: ['brown', 'medium', 'sienna', 'earth', 'soil', 'natural', 'organic', 'rustic', 'warm', 'rich'] },
  { color: '#7a5538', name: 'Burnt Sienna', tags: ['brown', 'orange', 'sienna', 'earth', 'clay', 'natural', 'organic', 'rustic', 'warm', 'rich'] },
  { color: '#966a48', name: 'Light Sienna', tags: ['brown', 'orange', 'sienna', 'tan', 'earth', 'clay', 'natural', 'organic', 'rustic', 'warm'] },
  { color: '#4a3c31', name: 'Deep Earth', tags: ['brown', 'dark', 'earth', 'soil', 'mud', 'natural', 'organic', 'rustic', 'deep', 'rich'] },
  { color: '#635547', name: 'Forest Earth', tags: ['brown', 'dark', 'earth', 'soil', 'forest', 'natural', 'organic', 'rustic', 'deep', 'warm'] },
  { color: '#7c6d5e', name: 'Woodland', tags: ['brown', 'tan', 'earth', 'soil', 'forest', 'wood', 'natural', 'organic', 'rustic', 'warm'] },
  { color: '#958575', name: 'Driftwood', tags: ['brown', 'tan', 'gray', 'wood', 'beach', 'natural', 'organic', 'weathered', 'aged', 'rustic'] },
  { color: '#aea08c', name: 'Pale Driftwood', tags: ['brown', 'tan', 'beige', 'gray', 'wood', 'beach', 'natural', 'weathered', 'aged', 'soft'] },
  { color: '#3c3024', name: 'Dark Bark', tags: ['brown', 'dark', 'bark', 'wood', 'tree', 'forest', 'natural', 'organic', 'rustic', 'deep'] },
  { color: '#584838', name: 'Tree Bark', tags: ['brown', 'dark', 'bark', 'wood', 'tree', 'forest', 'natural', 'organic', 'rustic', 'warm'] },
  { color: '#74604c', name: 'Light Bark', tags: ['brown', 'medium', 'bark', 'wood', 'tree', 'forest', 'natural', 'organic', 'rustic', 'warm'] },
  { color: '#8f7860', name: 'Pale Bark', tags: ['brown', 'tan', 'bark', 'wood', 'tree', 'forest', 'natural', 'organic', 'rustic', 'soft'] },
  { color: '#ab9074', name: 'Soft Bark', tags: ['brown', 'tan', 'beige', 'bark', 'wood', 'tree', 'natural', 'organic', 'rustic', 'soft'] },

  // Extra Nature Colors (321-360)
  { color: '#1b3a1b', name: 'Deep Jungle', tags: ['green', 'dark', 'jungle', 'forest', 'nature', 'tree', 'leaf', 'plant', 'tropical', 'deep'] },
  { color: '#2d5a2d', name: 'Jungle Green', tags: ['green', 'dark', 'jungle', 'forest', 'nature', 'tree', 'leaf', 'plant', 'tropical', 'rich'] },
  { color: '#3d7a3d', name: 'Emerald Forest', tags: ['green', 'forest', 'jungle', 'nature', 'tree', 'leaf', 'emerald', 'jewel', 'rich', 'vibrant'] },
  { color: '#4d9a4d', name: 'Vibrant Green', tags: ['green', 'bright', 'forest', 'jungle', 'nature', 'leaf', 'grass', 'spring', 'fresh', 'vibrant'] },
  { color: '#5dba5d', name: 'Spring Leaf', tags: ['green', 'bright', 'spring', 'leaf', 'grass', 'nature', 'fresh', 'vibrant', 'alive', 'growth'] },
  { color: '#6dda6d', name: 'Bright Leaf', tags: ['green', 'bright', 'light', 'spring', 'leaf', 'grass', 'nature', 'fresh', 'vibrant', 'alive'] },
  { color: '#8dfa8d', name: 'Pale Leaf', tags: ['green', 'light', 'pale', 'spring', 'leaf', 'grass', 'nature', 'soft', 'gentle', 'fresh'] },
  { color: '#1e4230', name: 'Pine Forest', tags: ['green', 'dark', 'pine', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'cold', 'deep'] },
  { color: '#2e5240', name: 'Deep Pine', tags: ['green', 'dark', 'pine', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'cold', 'rich'] },
  { color: '#3e6250', name: 'Pine Green', tags: ['green', 'pine', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'fresh', 'natural', 'organic'] },
  { color: '#4e7260', name: 'Light Pine', tags: ['green', 'pine', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'soft', 'natural', 'organic'] },
  { color: '#5e8270', name: 'Soft Pine', tags: ['green', 'pine', 'forest', 'evergreen', 'nature', 'tree', 'soft', 'muted', 'natural', 'organic'] },
  { color: '#2e4a3e', name: 'Dark Moss', tags: ['green', 'dark', 'moss', 'forest', 'nature', 'plant', 'organic', 'damp', 'earth', 'deep'] },
  { color: '#3e5a4e', name: 'Forest Moss', tags: ['green', 'moss', 'forest', 'nature', 'plant', 'organic', 'damp', 'earth', 'natural', 'rich'] },
  { color: '#4e6a5e', name: 'Moss Green', tags: ['green', 'moss', 'forest', 'nature', 'plant', 'organic', 'damp', 'earth', 'natural', 'soft'] },
  { color: '#5e7a6e', name: 'Light Moss', tags: ['green', 'moss', 'forest', 'nature', 'plant', 'organic', 'damp', 'earth', 'soft', 'gentle'] },
  { color: '#6e8a7e', name: 'Pale Moss', tags: ['green', 'moss', 'sage', 'nature', 'plant', 'organic', 'earth', 'soft', 'gentle', 'muted'] },
  { color: '#4a5d23', name: 'Army Green', tags: ['green', 'olive', 'army', 'military', 'khaki', 'camouflage', 'nature', 'earth', 'forest', 'jungle'] },
  { color: '#5a6d33', name: 'Military Green', tags: ['green', 'olive', 'army', 'military', 'khaki', 'camouflage', 'nature', 'earth', 'forest', 'field'] },
  { color: '#6a7d43', name: 'Field Green', tags: ['green', 'olive', 'grass', 'meadow', 'field', 'nature', 'earth', 'natural', 'organic', 'rural'] },
  { color: '#7a8d53', name: 'Meadow Green', tags: ['green', 'olive', 'grass', 'meadow', 'field', 'nature', 'earth', 'natural', 'organic', 'fresh'] },
  { color: '#8a9d63', name: 'Light Meadow', tags: ['green', 'olive', 'grass', 'meadow', 'field', 'nature', 'earth', 'soft', 'gentle', 'fresh'] },
  { color: '#1a3c2a', name: 'Deep Spruce', tags: ['green', 'dark', 'spruce', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'cold', 'deep'] },
  { color: '#2a4c3a', name: 'Spruce', tags: ['green', 'dark', 'spruce', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'cold', 'rich'] },
  { color: '#3a5c4a', name: 'Light Spruce', tags: ['green', 'spruce', 'forest', 'evergreen', 'nature', 'tree', 'winter', 'cool', 'natural', 'organic'] },
  { color: '#4a6c5a', name: 'Soft Spruce', tags: ['green', 'spruce', 'forest', 'evergreen', 'nature', 'tree', 'soft', 'cool', 'natural', 'organic'] },
  { color: '#5a7c6a', name: 'Pale Spruce', tags: ['green', 'spruce', 'forest', 'evergreen', 'nature', 'tree', 'soft', 'pale', 'natural', 'organic'] },
  { color: '#6a8c7a', name: 'Gentle Spruce', tags: ['green', 'spruce', 'sage', 'forest', 'nature', 'tree', 'soft', 'pale', 'gentle', 'organic'] },
  { color: '#2d3e28', name: 'Dark Fern', tags: ['green', 'dark', 'fern', 'forest', 'nature', 'plant', 'leaf', 'organic', 'damp', 'deep'] },
  { color: '#3d4e38', name: 'Fern Green', tags: ['green', 'dark', 'fern', 'forest', 'nature', 'plant', 'leaf', 'organic', 'damp', 'rich'] },
  { color: '#4d5e48', name: 'Light Fern', tags: ['green', 'fern', 'forest', 'nature', 'plant', 'leaf', 'organic', 'damp', 'natural', 'soft'] },
  { color: '#5d6e58', name: 'Soft Fern', tags: ['green', 'fern', 'forest', 'nature', 'plant', 'leaf', 'organic', 'soft', 'natural', 'gentle'] },
  { color: '#6d7e68', name: 'Pale Fern', tags: ['green', 'fern', 'sage', 'nature', 'plant', 'leaf', 'organic', 'soft', 'gentle', 'muted'] },
  { color: '#7d8e78', name: 'Dusty Fern', tags: ['green', 'fern', 'sage', 'nature', 'plant', 'leaf', 'organic', 'dusty', 'muted', 'gentle'] },
  { color: '#8d9e88', name: 'Gentle Fern', tags: ['green', 'sage', 'fern', 'nature', 'plant', 'leaf', 'organic', 'soft', 'gentle', 'pale'] },
  { color: '#9dae98', name: 'Pale Sage', tags: ['green', 'sage', 'fern', 'nature', 'plant', 'organic', 'soft', 'gentle', 'pale', 'muted'] },
  { color: '#adbea8', name: 'Light Sage', tags: ['green', 'sage', 'pale', 'nature', 'plant', 'organic', 'soft', 'gentle', 'light', 'muted'] },
  { color: '#bdceb8', name: 'Soft Sage', tags: ['green', 'sage', 'cream', 'nature', 'plant', 'organic', 'soft', 'gentle', 'light', 'pastel'] },
  { color: '#cddec8', name: 'Cream Sage', tags: ['green', 'sage', 'cream', 'pale', 'nature', 'plant', 'organic', 'soft', 'gentle', 'pastel'] },
  { color: '#ddeed8', name: 'Pale Mint Sage', tags: ['green', 'mint', 'sage', 'cream', 'pale', 'nature', 'soft', 'gentle', 'light', 'pastel'] },

  // Extra Blues & Aquas (361-400)
  { color: '#0a1e3c', name: 'Abyss Blue', tags: ['blue', 'dark', 'deep', 'ocean', 'sea', 'night', 'navy', 'midnight', 'abyss', 'mystery'] },
  { color: '#142e4c', name: 'Deep Ocean', tags: ['blue', 'dark', 'deep', 'ocean', 'sea', 'navy', 'midnight', 'water', 'rich', 'mystery'] },
  { color: '#1e3e5c', name: 'Ocean Blue', tags: ['blue', 'dark', 'ocean', 'sea', 'navy', 'water', 'deep', 'rich', 'natural', 'calm'] },
  { color: '#284e6c', name: 'Dark Ocean', tags: ['blue', 'ocean', 'sea', 'navy', 'water', 'deep', 'natural', 'calm', 'serene', 'cool'] },
  { color: '#325e7c', name: 'Sea Blue', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'serene', 'cool', 'fresh', 'clean'] },
  { color: '#3c6e8c', name: 'Light Sea', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'serene', 'cool', 'fresh', 'soft'] },
  { color: '#467e9c', name: 'Soft Sea', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'serene', 'cool', 'soft', 'gentle'] },
  { color: '#508eac', name: 'Gentle Sea', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'serene', 'soft', 'gentle', 'light'] },
  { color: '#5a9ebc', name: 'Pale Sea', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'soft', 'gentle', 'light', 'pale'] },
  { color: '#64aecc', name: 'Light Ocean', tags: ['blue', 'ocean', 'sea', 'water', 'natural', 'calm', 'soft', 'light', 'pale', 'fresh'] },
  { color: '#1a2a4a', name: 'Night Blue', tags: ['blue', 'dark', 'night', 'navy', 'midnight', 'deep', 'rich', 'space', 'cosmic', 'mystery'] },
  { color: '#2a3a5a', name: 'Dark Night', tags: ['blue', 'dark', 'night', 'navy', 'midnight', 'deep', 'rich', 'space', 'cosmic', 'calm'] },
  { color: '#3a4a6a', name: 'Twilight Blue', tags: ['blue', 'dark', 'night', 'navy', 'twilight', 'dusk', 'evening', 'space', 'calm', 'serene'] },
  { color: '#4a5a7a', name: 'Dusk Blue', tags: ['blue', 'twilight', 'dusk', 'evening', 'navy', 'muted', 'soft', 'calm', 'serene', 'cool'] },
  { color: '#5a6a8a', name: 'Evening Blue', tags: ['blue', 'twilight', 'dusk', 'evening', 'muted', 'soft', 'calm', 'serene', 'cool', 'gentle'] },
  { color: '#6a7a9a', name: 'Soft Evening', tags: ['blue', 'twilight', 'dusk', 'evening', 'muted', 'soft', 'calm', 'serene', 'gentle', 'pale'] },
  { color: '#7a8aaa', name: 'Pale Evening', tags: ['blue', 'twilight', 'dusk', 'evening', 'muted', 'soft', 'calm', 'gentle', 'pale', 'light'] },
  { color: '#8a9aba', name: 'Light Evening', tags: ['blue', 'lavender', 'dusk', 'evening', 'muted', 'soft', 'calm', 'gentle', 'pale', 'light'] },
  { color: '#9aaaca', name: 'Gentle Evening', tags: ['blue', 'lavender', 'dusk', 'evening', 'soft', 'calm', 'gentle', 'pale', 'light', 'pastel'] },
  { color: '#aabada', name: 'Pale Lavender Blue', tags: ['blue', 'lavender', 'pale', 'soft', 'calm', 'gentle', 'light', 'pastel', 'dreamy', 'delicate'] },
  { color: '#0a3a3a', name: 'Deep Sea Teal', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'night', 'tropical', 'mystery', 'cool'] },
  { color: '#144a4a', name: 'Dark Sea Teal', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'tropical', 'cool', 'calm', 'serene'] },
  { color: '#1e5a5a', name: 'Ocean Teal', tags: ['teal', 'dark', 'ocean', 'sea', 'water', 'tropical', 'cool', 'calm', 'serene', 'fresh'] },
  { color: '#286a6a', name: 'Sea Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'cool', 'calm', 'serene', 'fresh', 'natural'] },
  { color: '#327a7a', name: 'Light Sea Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'cool', 'calm', 'serene', 'fresh', 'soft'] },
  { color: '#3c8a8a', name: 'Soft Sea Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'cool', 'calm', 'soft', 'gentle', 'fresh'] },
  { color: '#469a9a', name: 'Gentle Sea Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'cool', 'soft', 'gentle', 'fresh', 'light'] },
  { color: '#50aaaa', name: 'Pale Sea Teal', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'cool', 'soft', 'gentle', 'light', 'pale'] },
  { color: '#5ababa', name: 'Light Aqua Teal', tags: ['teal', 'aqua', 'ocean', 'sea', 'water', 'tropical', 'soft', 'light', 'pale', 'fresh'] },
  { color: '#64caca', name: 'Soft Aqua', tags: ['teal', 'aqua', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'light', 'pale', 'fresh'] },
  { color: '#6edada', name: 'Light Aqua', tags: ['aqua', 'cyan', 'teal', 'ocean', 'sea', 'water', 'tropical', 'light', 'pale', 'soft'] },
  { color: '#78eaea', name: 'Pale Aqua', tags: ['aqua', 'cyan', 'teal', 'water', 'ice', 'cool', 'light', 'pale', 'soft', 'gentle'] },
  { color: '#82fafa', name: 'Ice Aqua', tags: ['aqua', 'cyan', 'ice', 'water', 'cool', 'light', 'pale', 'soft', 'gentle', 'fresh'] },
  { color: '#0a2a3a', name: 'Deep Sapphire', tags: ['blue', 'dark', 'deep', 'sapphire', 'jewel', 'ocean', 'night', 'navy', 'rich', 'mystery'] },
  { color: '#143a4a', name: 'Dark Sapphire', tags: ['blue', 'dark', 'deep', 'sapphire', 'jewel', 'ocean', 'navy', 'rich', 'elegant', 'luxury'] },
  { color: '#1e4a5a', name: 'Sapphire Blue', tags: ['blue', 'dark', 'sapphire', 'jewel', 'ocean', 'navy', 'rich', 'elegant', 'luxury', 'cool'] },
  { color: '#285a6a', name: 'Light Sapphire', tags: ['blue', 'sapphire', 'jewel', 'ocean', 'rich', 'elegant', 'luxury', 'cool', 'calm', 'serene'] },
  { color: '#326a7a', name: 'Soft Sapphire', tags: ['blue', 'sapphire', 'jewel', 'ocean', 'elegant', 'luxury', 'cool', 'calm', 'serene', 'soft'] },
  { color: '#3c7a8a', name: 'Pale Sapphire', tags: ['blue', 'sapphire', 'jewel', 'ocean', 'elegant', 'cool', 'calm', 'serene', 'soft', 'gentle'] },
  { color: '#468a9a', name: 'Gentle Sapphire', tags: ['blue', 'sapphire', 'jewel', 'cool', 'calm', 'serene', 'soft', 'gentle', 'light', 'elegant'] },

  // Extra Purples & Magentas (401-440)
  { color: '#1a0a2a', name: 'Void Violet', tags: ['purple', 'dark', 'deep', 'violet', 'night', 'shadow', 'mystery', 'gothic', 'cosmic', 'space'] },
  { color: '#2a1a3a', name: 'Deep Violet', tags: ['purple', 'dark', 'deep', 'violet', 'night', 'mystery', 'gothic', 'cosmic', 'space', 'rich'] },
  { color: '#3a2a4a', name: 'Dark Violet', tags: ['purple', 'dark', 'violet', 'night', 'mystery', 'gothic', 'cosmic', 'space', 'rich', 'elegant'] },
  { color: '#4a3a5a', name: 'Rich Violet', tags: ['purple', 'violet', 'night', 'mystery', 'gothic', 'cosmic', 'rich', 'elegant', 'luxury', 'royal'] },
  { color: '#5a4a6a', name: 'Royal Violet', tags: ['purple', 'violet', 'royal', 'regal', 'elegant', 'luxury', 'rich', 'noble', 'majestic', 'sophisticated'] },
  { color: '#6a5a7a', name: 'Medium Violet', tags: ['purple', 'violet', 'royal', 'regal', 'elegant', 'luxury', 'soft', 'noble', 'sophisticated', 'gentle'] },
  { color: '#7a6a8a', name: 'Soft Violet', tags: ['purple', 'violet', 'lavender', 'royal', 'elegant', 'soft', 'gentle', 'noble', 'sophisticated', 'romantic'] },
  { color: '#8a7a9a', name: 'Light Violet', tags: ['purple', 'violet', 'lavender', 'soft', 'gentle', 'romantic', 'feminine', 'elegant', 'delicate', 'pastel'] },
  { color: '#9a8aaa', name: 'Pale Violet', tags: ['purple', 'violet', 'lavender', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'pastel', 'dreamy'] },
  { color: '#aa9aba', name: 'Gentle Violet', tags: ['purple', 'lavender', 'violet', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'pastel', 'dreamy'] },
  { color: '#baaaca', name: 'Pale Lavender Violet', tags: ['purple', 'lavender', 'pale', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'pastel', 'dreamy'] },
  { color: '#cabada', name: 'Light Lavender', tags: ['lavender', 'purple', 'pale', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'pastel', 'dreamy'] },
  { color: '#dacaea', name: 'Soft Lavender', tags: ['lavender', 'purple', 'pale', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'light', 'pastel'] },
  { color: '#eadafa', name: 'Pale Lavender Light', tags: ['lavender', 'purple', 'pale', 'light', 'soft', 'gentle', 'romantic', 'feminine', 'delicate', 'pastel'] },
  { color: '#2a0a2a', name: 'Deep Plum', tags: ['purple', 'dark', 'deep', 'plum', 'grape', 'wine', 'berry', 'mystery', 'gothic', 'rich'] },
  { color: '#3a1a3a', name: 'Dark Plum', tags: ['purple', 'dark', 'plum', 'grape', 'wine', 'berry', 'mystery', 'gothic', 'rich', 'elegant'] },
  { color: '#4a2a4a', name: 'Rich Plum', tags: ['purple', 'dark', 'plum', 'grape', 'wine', 'berry', 'rich', 'elegant', 'luxury', 'sophisticated'] },
  { color: '#5a3a5a', name: 'Plum Purple', tags: ['purple', 'plum', 'grape', 'wine', 'berry', 'rich', 'elegant', 'luxury', 'sophisticated', 'romantic'] },
  { color: '#6a4a6a', name: 'Medium Plum', tags: ['purple', 'plum', 'grape', 'wine', 'berry', 'elegant', 'luxury', 'sophisticated', 'romantic', 'soft'] },
  { color: '#7a5a7a', name: 'Soft Plum', tags: ['purple', 'plum', 'grape', 'wine', 'berry', 'elegant', 'soft', 'romantic', 'feminine', 'gentle'] },
  { color: '#8a6a8a', name: 'Light Plum', tags: ['purple', 'plum', 'mauve', 'grape', 'wine', 'soft', 'romantic', 'feminine', 'gentle', 'elegant'] },
  { color: '#9a7a9a', name: 'Pale Plum', tags: ['purple', 'plum', 'mauve', 'soft', 'romantic', 'feminine', 'gentle', 'elegant', 'delicate', 'pastel'] },
  { color: '#aa8aaa', name: 'Gentle Plum', tags: ['purple', 'mauve', 'plum', 'soft', 'romantic', 'feminine', 'gentle', 'elegant', 'delicate', 'pastel'] },
  { color: '#ba9aba', name: 'Dusty Plum', tags: ['purple', 'mauve', 'dusty', 'soft', 'romantic', 'feminine', 'gentle', 'elegant', 'vintage', 'muted'] },
  { color: '#caaaca', name: 'Pale Mauve', tags: ['mauve', 'purple', 'pale', 'soft', 'romantic', 'feminine', 'gentle', 'elegant', 'vintage', 'delicate'] },
  { color: '#dabada', name: 'Light Mauve', tags: ['mauve', 'purple', 'pale', 'light', 'soft', 'romantic', 'feminine', 'gentle', 'delicate', 'pastel'] },
  { color: '#eacaea', name: 'Soft Mauve', tags: ['mauve', 'purple', 'pale', 'light', 'soft', 'romantic', 'feminine', 'gentle', 'delicate', 'pastel'] },
  { color: '#fadafa', name: 'Pale Mauve Light', tags: ['mauve', 'lavender', 'pale', 'light', 'soft', 'romantic', 'feminine', 'gentle', 'delicate', 'pastel'] },
  { color: '#3a0a1a', name: 'Deep Berry', tags: ['purple', 'red', 'dark', 'deep', 'berry', 'wine', 'cherry', 'maroon', 'mystery', 'gothic'] },
  { color: '#4a1a2a', name: 'Dark Berry', tags: ['purple', 'red', 'dark', 'berry', 'wine', 'cherry', 'maroon', 'rich', 'elegant', 'luxury'] },
  { color: '#5a2a3a', name: 'Rich Berry', tags: ['purple', 'red', 'berry', 'wine', 'cherry', 'maroon', 'rich', 'elegant', 'luxury', 'sophisticated'] },
  { color: '#6a3a4a', name: 'Berry Wine', tags: ['purple', 'red', 'berry', 'wine', 'cherry', 'rich', 'elegant', 'luxury', 'sophisticated', 'romantic'] },
  { color: '#7a4a5a', name: 'Soft Berry', tags: ['purple', 'red', 'berry', 'wine', 'cherry', 'elegant', 'soft', 'romantic', 'feminine', 'gentle'] },
  { color: '#8a5a6a', name: 'Light Berry', tags: ['purple', 'red', 'pink', 'berry', 'wine', 'soft', 'romantic', 'feminine', 'gentle', 'elegant'] },
  { color: '#9a6a7a', name: 'Pale Berry', tags: ['purple', 'pink', 'berry', 'wine', 'soft', 'romantic', 'feminine', 'gentle', 'elegant', 'delicate'] },
  { color: '#aa7a8a', name: 'Dusty Berry', tags: ['purple', 'pink', 'berry', 'dusty', 'soft', 'romantic', 'feminine', 'gentle', 'vintage', 'muted'] },
  { color: '#ba8a9a', name: 'Gentle Berry', tags: ['pink', 'purple', 'berry', 'dusty', 'soft', 'romantic', 'feminine', 'gentle', 'vintage', 'delicate'] },
  { color: '#ca9aaa', name: 'Pale Rose Berry', tags: ['pink', 'rose', 'berry', 'pale', 'soft', 'romantic', 'feminine', 'gentle', 'vintage', 'delicate'] },
  { color: '#daaaba', name: 'Light Rose', tags: ['pink', 'rose', 'pale', 'light', 'soft', 'romantic', 'feminine', 'gentle', 'delicate', 'pastel'] },
  { color: '#eabaca', name: 'Soft Rose', tags: ['pink', 'rose', 'pale', 'light', 'soft', 'romantic', 'feminine', 'gentle', 'delicate', 'pastel'] },

  // Extra Warm Colors (441-480)
  { color: '#3a1a0a', name: 'Deep Rust', tags: ['brown', 'red', 'dark', 'deep', 'rust', 'iron', 'metal', 'earth', 'autumn', 'warm'] },
  { color: '#4a2a1a', name: 'Dark Rust', tags: ['brown', 'red', 'dark', 'rust', 'iron', 'metal', 'earth', 'autumn', 'warm', 'rich'] },
  { color: '#5a3a2a', name: 'Rust Brown', tags: ['brown', 'red', 'rust', 'iron', 'metal', 'earth', 'autumn', 'warm', 'rich', 'natural'] },
  { color: '#6a4a3a', name: 'Medium Rust', tags: ['brown', 'red', 'rust', 'iron', 'earth', 'autumn', 'warm', 'rich', 'natural', 'organic'] },
  { color: '#7a5a4a', name: 'Light Rust', tags: ['brown', 'tan', 'rust', 'earth', 'autumn', 'warm', 'rich', 'natural', 'organic', 'soft'] },
  { color: '#8a6a5a', name: 'Soft Rust', tags: ['brown', 'tan', 'rust', 'earth', 'autumn', 'warm', 'natural', 'organic', 'soft', 'gentle'] },
  { color: '#9a7a6a', name: 'Pale Rust', tags: ['brown', 'tan', 'rust', 'earth', 'autumn', 'warm', 'natural', 'soft', 'gentle', 'muted'] },
  { color: '#aa8a7a', name: 'Gentle Rust', tags: ['brown', 'tan', 'peach', 'rust', 'earth', 'warm', 'soft', 'gentle', 'muted', 'natural'] },
  { color: '#ba9a8a', name: 'Dusty Rust', tags: ['tan', 'peach', 'rust', 'dusty', 'warm', 'soft', 'gentle', 'muted', 'natural', 'vintage'] },
  { color: '#caaa9a', name: 'Pale Tan', tags: ['tan', 'peach', 'cream', 'warm', 'soft', 'gentle', 'muted', 'natural', 'vintage', 'neutral'] },
  { color: '#4a2a0a', name: 'Deep Auburn', tags: ['brown', 'red', 'dark', 'deep', 'auburn', 'chestnut', 'wood', 'earth', 'autumn', 'warm'] },
  { color: '#5a3a1a', name: 'Dark Auburn', tags: ['brown', 'red', 'dark', 'auburn', 'chestnut', 'wood', 'earth', 'autumn', 'warm', 'rich'] },
  { color: '#6a4a2a', name: 'Auburn', tags: ['brown', 'red', 'auburn', 'chestnut', 'wood', 'earth', 'autumn', 'warm', 'rich', 'natural'] },
  { color: '#7a5a3a', name: 'Light Auburn', tags: ['brown', 'red', 'tan', 'auburn', 'chestnut', 'wood', 'earth', 'autumn', 'warm', 'natural'] },
  { color: '#8a6a4a', name: 'Soft Auburn', tags: ['brown', 'tan', 'auburn', 'chestnut', 'wood', 'earth', 'autumn', 'warm', 'natural', 'soft'] },
  { color: '#9a7a5a', name: 'Pale Auburn', tags: ['brown', 'tan', 'auburn', 'wood', 'earth', 'autumn', 'warm', 'natural', 'soft', 'gentle'] },
  { color: '#aa8a6a', name: 'Gentle Auburn', tags: ['tan', 'brown', 'auburn', 'wood', 'earth', 'warm', 'natural', 'soft', 'gentle', 'muted'] },
  { color: '#ba9a7a', name: 'Light Tan Brown', tags: ['tan', 'brown', 'cream', 'wood', 'earth', 'warm', 'natural', 'soft', 'gentle', 'neutral'] },
  { color: '#caaa8a', name: 'Cream Tan', tags: ['tan', 'cream', 'beige', 'warm', 'natural', 'soft', 'gentle', 'neutral', 'light', 'pale'] },
  { color: '#daba9a', name: 'Pale Cream', tags: ['cream', 'tan', 'beige', 'warm', 'natural', 'soft', 'gentle', 'neutral', 'light', 'pale'] },
  { color: '#5a2a1a', name: 'Deep Cinnamon', tags: ['brown', 'red', 'dark', 'cinnamon', 'spice', 'wood', 'earth', 'autumn', 'warm', 'rich'] },
  { color: '#6a3a2a', name: 'Dark Cinnamon', tags: ['brown', 'red', 'cinnamon', 'spice', 'wood', 'earth', 'autumn', 'warm', 'rich', 'natural'] },
  { color: '#7a4a3a', name: 'Cinnamon', tags: ['brown', 'red', 'cinnamon', 'spice', 'wood', 'earth', 'autumn', 'warm', 'rich', 'natural'] },
  { color: '#8a5a4a', name: 'Light Cinnamon', tags: ['brown', 'tan', 'cinnamon', 'spice', 'wood', 'earth', 'autumn', 'warm', 'natural', 'soft'] },
  { color: '#9a6a5a', name: 'Soft Cinnamon', tags: ['brown', 'tan', 'cinnamon', 'spice', 'earth', 'autumn', 'warm', 'natural', 'soft', 'gentle'] },
  { color: '#aa7a6a', name: 'Pale Cinnamon', tags: ['tan', 'brown', 'cinnamon', 'spice', 'earth', 'warm', 'natural', 'soft', 'gentle', 'muted'] },
  { color: '#ba8a7a', name: 'Dusty Cinnamon', tags: ['tan', 'brown', 'cinnamon', 'dusty', 'warm', 'natural', 'soft', 'gentle', 'muted', 'vintage'] },
  { color: '#ca9a8a', name: 'Gentle Cinnamon', tags: ['tan', 'peach', 'cinnamon', 'dusty', 'warm', 'soft', 'gentle', 'muted', 'vintage', 'neutral'] },
  { color: '#daaa9a', name: 'Pale Peach Tan', tags: ['peach', 'tan', 'cream', 'warm', 'soft', 'gentle', 'muted', 'natural', 'neutral', 'light'] },
  { color: '#eabaaa', name: 'Light Peach', tags: ['peach', 'cream', 'pink', 'warm', 'soft', 'gentle', 'natural', 'neutral', 'light', 'pale'] },
  { color: '#6a3a1a', name: 'Deep Amber Brown', tags: ['brown', 'orange', 'dark', 'amber', 'honey', 'caramel', 'wood', 'earth', 'autumn', 'warm'] },
  { color: '#7a4a2a', name: 'Dark Amber', tags: ['brown', 'orange', 'amber', 'honey', 'caramel', 'wood', 'earth', 'autumn', 'warm', 'rich'] },
  { color: '#8a5a3a', name: 'Amber Brown', tags: ['brown', 'orange', 'amber', 'honey', 'caramel', 'wood', 'earth', 'autumn', 'warm', 'natural'] },
  { color: '#9a6a4a', name: 'Light Amber', tags: ['brown', 'tan', 'amber', 'honey', 'caramel', 'earth', 'autumn', 'warm', 'natural', 'soft'] },
  { color: '#aa7a5a', name: 'Soft Amber', tags: ['tan', 'brown', 'amber', 'honey', 'caramel', 'earth', 'warm', 'natural', 'soft', 'gentle'] },
  { color: '#ba8a6a', name: 'Pale Amber', tags: ['tan', 'brown', 'amber', 'honey', 'earth', 'warm', 'natural', 'soft', 'gentle', 'muted'] },
  { color: '#ca9a7a', name: 'Gentle Amber', tags: ['tan', 'cream', 'amber', 'honey', 'warm', 'natural', 'soft', 'gentle', 'muted', 'neutral'] },
  { color: '#daaa8a', name: 'Cream Amber', tags: ['cream', 'tan', 'amber', 'honey', 'warm', 'natural', 'soft', 'gentle', 'neutral', 'light'] },
  { color: '#eaba9a', name: 'Light Cream Amber', tags: ['cream', 'peach', 'amber', 'warm', 'natural', 'soft', 'gentle', 'neutral', 'light', 'pale'] },
  { color: '#facaaa', name: 'Pale Cream Peach', tags: ['cream', 'peach', 'pale', 'warm', 'natural', 'soft', 'gentle', 'neutral', 'light', 'delicate'] },

  // Extra Grays & Neutrals (481-500)
  { color: '#1a1a1e', name: 'Cool Black', tags: ['gray', 'black', 'dark', 'cool', 'night', 'shadow', 'steel', 'iron', 'modern', 'sleek'] },
  { color: '#2a2a2e', name: 'Dark Cool Gray', tags: ['gray', 'dark', 'cool', 'charcoal', 'steel', 'iron', 'modern', 'sleek', 'professional', 'urban'] },
  { color: '#3a3a3e', name: 'Cool Charcoal', tags: ['gray', 'dark', 'cool', 'charcoal', 'steel', 'iron', 'modern', 'sleek', 'professional', 'urban'] },
  { color: '#4a4a4e', name: 'Medium Cool Gray', tags: ['gray', 'cool', 'charcoal', 'steel', 'iron', 'modern', 'sleek', 'professional', 'urban', 'neutral'] },
  { color: '#5a5a5e', name: 'Cool Gray', tags: ['gray', 'cool', 'steel', 'iron', 'modern', 'sleek', 'professional', 'urban', 'neutral', 'balanced'] },
  { color: '#6a6a6e', name: 'Light Cool Gray', tags: ['gray', 'cool', 'steel', 'modern', 'sleek', 'professional', 'neutral', 'balanced', 'soft', 'subtle'] },
  { color: '#7a7a7e', name: 'Soft Cool Gray', tags: ['gray', 'cool', 'steel', 'modern', 'professional', 'neutral', 'balanced', 'soft', 'subtle', 'gentle'] },
  { color: '#8a8a8e', name: 'Pale Cool Gray', tags: ['gray', 'cool', 'silver', 'modern', 'professional', 'neutral', 'soft', 'subtle', 'gentle', 'light'] },
  { color: '#9a9a9e', name: 'Gentle Cool Gray', tags: ['gray', 'silver', 'cool', 'modern', 'professional', 'neutral', 'soft', 'subtle', 'gentle', 'light'] },
  { color: '#aaaaae', name: 'Light Silver Gray', tags: ['gray', 'silver', 'cool', 'modern', 'professional', 'neutral', 'soft', 'light', 'pale', 'gentle'] },
  { color: '#1e1a1a', name: 'Warm Black', tags: ['gray', 'black', 'dark', 'warm', 'night', 'shadow', 'charcoal', 'iron', 'rich', 'deep'] },
  { color: '#2e2a2a', name: 'Dark Warm Gray', tags: ['gray', 'dark', 'warm', 'charcoal', 'brown', 'earth', 'rich', 'natural', 'organic', 'deep'] },
  { color: '#3e3a3a', name: 'Warm Charcoal', tags: ['gray', 'dark', 'warm', 'charcoal', 'brown', 'earth', 'natural', 'organic', 'rich', 'cozy'] },
  { color: '#4e4a4a', name: 'Medium Warm Gray', tags: ['gray', 'warm', 'charcoal', 'brown', 'earth', 'natural', 'organic', 'neutral', 'cozy', 'soft'] },
  { color: '#5e5a5a', name: 'Warm Gray', tags: ['gray', 'warm', 'brown', 'earth', 'natural', 'organic', 'neutral', 'cozy', 'soft', 'balanced'] },
  { color: '#6e6a6a', name: 'Light Warm Gray', tags: ['gray', 'warm', 'brown', 'earth', 'natural', 'neutral', 'cozy', 'soft', 'balanced', 'gentle'] },
  { color: '#7e7a7a', name: 'Soft Warm Gray', tags: ['gray', 'warm', 'brown', 'natural', 'neutral', 'cozy', 'soft', 'balanced', 'gentle', 'subtle'] },
  { color: '#8e8a8a', name: 'Pale Warm Gray', tags: ['gray', 'warm', 'beige', 'natural', 'neutral', 'soft', 'balanced', 'gentle', 'subtle', 'light'] },
  { color: '#9e9a9a', name: 'Gentle Warm Gray', tags: ['gray', 'warm', 'beige', 'natural', 'neutral', 'soft', 'gentle', 'subtle', 'light', 'pale'] },
  { color: '#aeaaaa', name: 'Light Warm Silver', tags: ['gray', 'silver', 'warm', 'beige', 'natural', 'neutral', 'soft', 'gentle', 'light', 'pale'] },
];

export function SpriteEditor({ onClose }: SpriteEditorProps) {
  const { plants, animals, resources } = useDefinitionsStore();

  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(1); // Zoom level: 0.5x to 2x
  const [currentTool, setCurrentTool] = useState<'paint' | 'polygon' | 'texture' | 'depth' | 'alignment'>('paint');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<'plant' | 'animal' | 'resource'>('plant');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');

  // Color management state
  const [colorNames] = useState<Record<string, string>>({});
  const [colorGroups] = useState<{ id: string; name: string; colors: string[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Polygon tool state - simplified
  const [polygonState, setPolygonState] = useState<PolygonState>({
    step: 'drawing',
    isClosed: false,
    boundaryPoints: [],
    highlights: [],
    currentHighlightPoints: [],
    baseColor: '#4a90d9',
  });

  // Texture tool state - simplified
  const [texturePattern, setTexturePattern] = useState<TexturePattern>('noise');
  const [textureIntensity, setTextureIntensity] = useState(0.3);
  const [textureState, setTextureState] = useState<TextureState>({
    step: 'drawing',
    isClosed: false,
    areaPoints: [],
  });

  // Depth tool state - simplified
  const [depthState, setDepthState] = useState<DepthState>({
    step: 'drawing',
    isClosed: false,
    areaPoints: [],
    lightDirection: null,
  });

  // Alignment tool state
  const [alignmentSelection, setAlignmentSelection] = useState<AlignmentSelection | null>(null);
  const [isSelectingAlignment, setIsSelectingAlignment] = useState(false);
  const [alignmentStart, setAlignmentStart] = useState<{ x: number; y: number } | null>(null);

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
        colors = colors.filter(entry => group.colors.includes(entry.color));
      }
    }

    // Filter by search query (search in tags and color names)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      colors = colors.filter(entry => {
        const name = colorNames[entry.color]?.toLowerCase() || '';
        const hex = entry.color.toLowerCase();
        const tagsMatch = entry.tags.some(tag => tag.includes(query));
        return name.includes(query) || hex.includes(query) || tagsMatch;
      });
    }

    return colors;
  }, [searchQuery, selectedGroupFilter, colorGroups, colorNames]);

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
    } else if (currentTool === 'polygon') {
      const point: PolygonPoint = { x: col, y: row };

      if (polygonState.step === 'drawing') {
        // Just add points, use Next button to close
        setPolygonState(prev => ({ ...prev, boundaryPoints: [...prev.boundaryPoints, point] }));
      } else if (polygonState.step === 'highlights') {
        // Add highlight points (inside the boundary)
        if (isPointInPolygon(col, row, polygonState.boundaryPoints)) {
          setPolygonState(prev => ({ ...prev, currentHighlightPoints: [...prev.currentHighlightPoints, point] }));
        }
      } else if (polygonState.step === 'coloring') {
        // Right-click to assign selected color to base or highlight
        if (e.button === 2) {
          e.preventDefault();
          // Check if clicking inside a highlight first
          const highlightIndex = polygonState.highlights.findIndex(h =>
            h.points.length >= 3 && isPointInPolygon(col, row, h.points)
          );
          if (highlightIndex >= 0) {
            // Assign color to this highlight
            setPolygonState(prev => ({
              ...prev,
              highlights: prev.highlights.map((h, i) =>
                i === highlightIndex ? { ...h, color: selectedColor } : h
              )
            }));
          } else if (isPointInPolygon(col, row, polygonState.boundaryPoints)) {
            // Assign color to base
            setPolygonState(prev => ({ ...prev, baseColor: selectedColor }));
          }
        }
      }
    } else if (currentTool === 'texture') {
      const point: PolygonPoint = { x: col, y: row };

      if (textureState.step === 'drawing') {
        // Just add points, use Next button to close
        setTextureState(prev => ({ ...prev, areaPoints: [...prev.areaPoints, point] }));
      }
    } else if (currentTool === 'depth') {
      const point: PolygonPoint = { x: col, y: row };

      if (depthState.step === 'drawing') {
        // Just add points, use Next button to close
        setDepthState(prev => ({ ...prev, areaPoints: [...prev.areaPoints, point] }));
      } else if (depthState.step === 'light') {
        // Set light direction
        setDepthState(prev => ({ ...prev, lightDirection: point }));
      }
    } else if (currentTool === 'alignment') {
      if (!isSelectingAlignment) {
        setIsSelectingAlignment(true);
        setAlignmentStart({ x: col, y: row });
        setAlignmentSelection({ startX: col, startY: row, endX: col, endY: row });
        setIsMouseDown(true);
      } else {
        setIsSelectingAlignment(false);
        setAlignmentStart(null);
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
    } else if (currentTool === 'texture' && isMouseDown) {
      applyTextureToPixel(row, col);
    } else if (currentTool === 'alignment' && isSelectingAlignment && alignmentStart) {
      setAlignmentSelection({
        startX: alignmentStart.x,
        startY: alignmentStart.y,
        endX: col,
        endY: row,
      });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (currentTool === 'alignment' && isSelectingAlignment) {
      setIsSelectingAlignment(false);
    }
    setIsMouseDown(false);
    setIsRightMouseDown(false);
  }, [currentTool, isSelectingAlignment]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Keyboard handler - simplified (only ESC and arrow keys for alignment)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close editor
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Alignment tool hotkeys (arrow keys)
      if (currentTool === 'alignment' && alignmentSelection) {
        const shift = { x: 0, y: 0 };
        if (e.key === 'ArrowUp') shift.y = -1;
        if (e.key === 'ArrowDown') shift.y = 1;
        if (e.key === 'ArrowLeft') shift.x = -1;
        if (e.key === 'ArrowRight') shift.x = 1;

        if (shift.x !== 0 || shift.y !== 0) {
          e.preventDefault();
          shiftSelectedPixels(shift.x, shift.y);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentTool, alignmentSelection]);

  // Shift selected pixels for alignment tool
  const shiftSelectedPixels = (dx: number, dy: number) => {
    if (!alignmentSelection) return;

    const { startX, startY, endX, endY } = alignmentSelection;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    setPixels(prev => {
      const newPixels = prev.map(row => [...row]);
      const selectedRegion: string[][] = [];
      for (let y = minY; y <= maxY; y++) {
        const row: string[] = [];
        for (let x = minX; x <= maxX; x++) {
          row.push(prev[y]?.[x] || 'transparent');
        }
        selectedRegion.push(row);
      }

      // Clear original region
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
            newPixels[y][x] = 'transparent';
          }
        }
      }

      // Place at new position
      const newMinX = minX + dx;
      const newMinY = minY + dy;
      for (let y = 0; y < selectedRegion.length; y++) {
        for (let x = 0; x < selectedRegion[y].length; x++) {
          const destY = newMinY + y;
          const destX = newMinX + x;
          if (destY >= 0 && destY < GRID_SIZE && destX >= 0 && destX < GRID_SIZE) {
            newPixels[destY][destX] = selectedRegion[y][x];
          }
        }
      }
      return newPixels;
    });

    setAlignmentSelection(prev => prev ? {
      startX: prev.startX + dx,
      startY: prev.startY + dy,
      endX: prev.endX + dx,
      endY: prev.endY + dy,
    } : null);
  };

  // Check if a point is inside a polygon
  const isPointInPolygon = (x: number, y: number, polygon: PolygonPoint[]): boolean => {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Generate polygon shape
  const generatePolygonShape = () => {
    if (polygonState.boundaryPoints.length < 3) return;
    const newPixels = pixels.map(row => [...row]);

    // Fill base shape
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (isPointInPolygon(x, y, polygonState.boundaryPoints)) {
          newPixels[y][x] = polygonState.baseColor;
        }
      }
    }

    // Fill highlights on top
    polygonState.highlights.forEach(highlight => {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (highlight.points.length >= 3 && isPointInPolygon(x, y, highlight.points)) {
            newPixels[y][x] = highlight.color;
          }
        }
      }
    });

    setPixels(newPixels);
    setPolygonState({
      step: 'drawing',
      isClosed: false,
      boundaryPoints: [],
      highlights: [],
      currentHighlightPoints: [],
      baseColor: polygonState.baseColor,
    });
  };

  // Add current highlight to list
  const addHighlight = () => {
    if (polygonState.currentHighlightPoints.length >= 3) {
      setPolygonState(prev => ({
        ...prev,
        highlights: [...prev.highlights, { points: prev.currentHighlightPoints, color: '#ffffff' }],
        currentHighlightPoints: [],
      }));
    }
  };

  // Go to coloring step
  const goToColoring = () => {
    // Save any current highlight points first
    if (polygonState.currentHighlightPoints.length >= 3) {
      setPolygonState(prev => ({
        ...prev,
        highlights: [...prev.highlights, { points: prev.currentHighlightPoints, color: '#ffffff' }],
        currentHighlightPoints: [],
        step: 'coloring',
      }));
    } else {
      setPolygonState(prev => ({ ...prev, step: 'coloring' }));
    }
  };

  // Apply texture to a pixel
  const applyTextureToPixel = (row: number, col: number) => {
    const currentColor = pixels[row][col];
    if (currentColor === 'transparent') return;

    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);

    let newR = r, newG = g, newB = b;
    const variation = Math.floor(textureIntensity * 50);

    switch (texturePattern) {
      case 'noise':
        newR = Math.max(0, Math.min(255, r + Math.floor(Math.random() * variation * 2) - variation));
        newG = Math.max(0, Math.min(255, g + Math.floor(Math.random() * variation * 2) - variation));
        newB = Math.max(0, Math.min(255, b + Math.floor(Math.random() * variation * 2) - variation));
        break;
      case 'dither':
        if ((row + col) % 2 === 0) {
          newR = Math.max(0, r - variation);
          newG = Math.max(0, g - variation);
          newB = Math.max(0, b - variation);
        } else {
          newR = Math.min(255, r + variation);
          newG = Math.min(255, g + variation);
          newB = Math.min(255, b + variation);
        }
        break;
      case 'grain':
        const grain = (Math.random() - 0.5) * variation * 2;
        newR = Math.max(0, Math.min(255, r + grain));
        newG = Math.max(0, Math.min(255, g + grain));
        newB = Math.max(0, Math.min(255, b + grain));
        break;
      case 'crosshatch':
        if ((row + col) % 3 === 0 || (row - col + GRID_SIZE) % 3 === 0) {
          newR = Math.max(0, r - variation);
          newG = Math.max(0, g - variation);
          newB = Math.max(0, b - variation);
        }
        break;
    }

    const newColor = `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
    setPixels(prev => {
      const newPixels = prev.map(r => [...r]);
      newPixels[row][col] = newColor;
      return newPixels;
    });
  };

  // Generate depth shadows - simplified: lighten inside area, darken outside based on light direction
  const generateDepthShadows = () => {
    if (depthState.areaPoints.length < 3 || !depthState.lightDirection) return;
    const newPixels = pixels.map(row => [...row]);

    const centerX = depthState.areaPoints.reduce((sum, p) => sum + p.x, 0) / depthState.areaPoints.length;
    const centerY = depthState.areaPoints.reduce((sum, p) => sum + p.y, 0) / depthState.areaPoints.length;

    const lightAngle = Math.atan2(
      depthState.lightDirection.y - centerY,
      depthState.lightDirection.x - centerX
    );

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const currentColor = newPixels[y][x];
        if (currentColor === 'transparent') continue;

        const inArea = isPointInPolygon(x, y, depthState.areaPoints);
        if (!inArea) continue;

        // Calculate angle from center to this pixel
        const pixelAngle = Math.atan2(y - centerY, x - centerX);
        const angleDiff = Math.abs(pixelAngle - lightAngle);
        const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff) / Math.PI;

        const r = parseInt(currentColor.slice(1, 3), 16);
        const g = parseInt(currentColor.slice(3, 5), 16);
        const b = parseInt(currentColor.slice(5, 7), 16);

        // Pixels facing the light get lightened, others get darkened
        const adjustment = Math.floor((0.5 - normalizedDiff) * 60);
        const newR = Math.max(0, Math.min(255, r + adjustment));
        const newG = Math.max(0, Math.min(255, g + adjustment));
        const newB = Math.max(0, Math.min(255, b + adjustment));

        newPixels[y][x] = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }
    }

    setPixels(newPixels);
    setDepthState({
      step: 'drawing',
      isClosed: false,
      areaPoints: [],
      lightDirection: null,
    });
  };

  // Apply texture to selected area
  const applyTextureToArea = () => {
    if (textureState.areaPoints.length < 3) return;
    const newPixels = pixels.map(row => [...row]);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!isPointInPolygon(x, y, textureState.areaPoints)) continue;

        const currentColor = newPixels[y][x];
        if (currentColor === 'transparent') continue;

        const r = parseInt(currentColor.slice(1, 3), 16);
        const g = parseInt(currentColor.slice(3, 5), 16);
        const b = parseInt(currentColor.slice(5, 7), 16);

        let newR = r, newG = g, newB = b;
        const variation = Math.floor(textureIntensity * 50);

        switch (texturePattern) {
          case 'noise':
            newR = Math.max(0, Math.min(255, r + Math.floor(Math.random() * variation * 2) - variation));
            newG = Math.max(0, Math.min(255, g + Math.floor(Math.random() * variation * 2) - variation));
            newB = Math.max(0, Math.min(255, b + Math.floor(Math.random() * variation * 2) - variation));
            break;
          case 'dither':
            if ((y + x) % 2 === 0) {
              newR = Math.max(0, r - variation);
              newG = Math.max(0, g - variation);
              newB = Math.max(0, b - variation);
            } else {
              newR = Math.min(255, r + variation);
              newG = Math.min(255, g + variation);
              newB = Math.min(255, b + variation);
            }
            break;
          case 'grain':
            const grain = (Math.random() - 0.5) * variation * 2;
            newR = Math.max(0, Math.min(255, r + grain));
            newG = Math.max(0, Math.min(255, g + grain));
            newB = Math.max(0, Math.min(255, b + grain));
            break;
          case 'crosshatch':
            if ((y + x) % 3 === 0 || (y - x + GRID_SIZE) % 3 === 0) {
              newR = Math.max(0, r - variation);
              newG = Math.max(0, g - variation);
              newB = Math.max(0, b - variation);
            }
            break;
        }

        newPixels[y][x] = `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;
      }
    }

    setPixels(newPixels);
    setTextureState({
      step: 'drawing',
      isClosed: false,
      areaPoints: [],
    });
  };

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

          {/* View Controls Section */}
          <div style={{ marginTop: '25px', borderTop: '1px solid #E8DDD1', paddingTop: '20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#0D0D0D' }}>View</h2>

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

                    {/* Polygon Tool Visual Overlay - Simplified (no numbers) */}
                    {currentTool === 'polygon' && (
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: scaledCanvasSize,
                          height: scaledCanvasSize,
                          pointerEvents: 'none',
                          overflow: 'visible',
                        }}
                      >
                        {/* Boundary polygon */}
                        {polygonState.boundaryPoints.length >= 2 && (
                          <polygon
                            points={polygonState.boundaryPoints.map(p =>
                              `${p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2},${p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}`
                            ).join(' ')}
                            fill={polygonState.isClosed ? `${polygonState.baseColor}33` : 'rgba(34, 197, 94, 0.15)'}
                            stroke={polygonState.isClosed ? polygonState.baseColor : '#22c55e'}
                            strokeWidth="2"
                            strokeDasharray={polygonState.isClosed ? 'none' : '6,3'}
                          />
                        )}
                        {/* Boundary points (no numbers, smaller) */}
                        {polygonState.boundaryPoints.map((p, i) => (
                          <circle
                            key={`bp-${i}`}
                            cx={p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            cy={p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            r={i === 0 ? 7 : 5}
                            fill={i === 0 ? '#16a34a' : '#22c55e'}
                            stroke="white"
                            strokeWidth="2"
                          />
                        ))}

                        {/* Completed highlights */}
                        {polygonState.highlights.map((highlight, hi) => (
                          <g key={`h-${hi}`}>
                            {highlight.points.length >= 3 && (
                              <polygon
                                points={highlight.points.map(p =>
                                  `${p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2},${p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}`
                                ).join(' ')}
                                fill={`${highlight.color}55`}
                                stroke={highlight.color}
                                strokeWidth="2"
                              />
                            )}
                            {highlight.points.map((p, i) => (
                              <circle
                                key={`hp-${hi}-${i}`}
                                cx={p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                                cy={p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                                r={4}
                                fill={highlight.color}
                                stroke="white"
                                strokeWidth="1"
                              />
                            ))}
                          </g>
                        ))}

                        {/* Current highlight being drawn */}
                        {polygonState.currentHighlightPoints.length >= 1 && (
                          <>
                            {polygonState.currentHighlightPoints.length >= 2 && (
                              <polygon
                                points={polygonState.currentHighlightPoints.map(p =>
                                  `${p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2},${p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}`
                                ).join(' ')}
                                fill="rgba(251, 191, 36, 0.25)"
                                stroke="#fbbf24"
                                strokeWidth="2"
                                strokeDasharray="4,3"
                              />
                            )}
                            {polygonState.currentHighlightPoints.map((p, i) => (
                              <circle
                                key={`chp-${i}`}
                                cx={p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                                cy={p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                                r={5}
                                fill="#fbbf24"
                                stroke="white"
                                strokeWidth="2"
                              />
                            ))}
                          </>
                        )}
                      </svg>
                    )}

                    {/* Depth Tool Visual Overlay - Simplified */}
                    {currentTool === 'depth' && (
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: scaledCanvasSize,
                          height: scaledCanvasSize,
                          pointerEvents: 'none',
                          overflow: 'visible',
                        }}
                      >
                        {/* Area polygon */}
                        {depthState.areaPoints.length >= 2 && (
                          <polygon
                            points={depthState.areaPoints.map(p =>
                              `${p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2},${p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}`
                            ).join(' ')}
                            fill={depthState.isClosed ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'}
                            stroke="#8b5cf6"
                            strokeWidth="2"
                            strokeDasharray={depthState.isClosed ? 'none' : '6,3'}
                          />
                        )}
                        {/* Area points */}
                        {depthState.areaPoints.map((p, i) => (
                          <circle
                            key={`ap-${i}`}
                            cx={p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            cy={p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            r={i === 0 ? 7 : 5}
                            fill={i === 0 ? '#7c3aed' : '#8b5cf6'}
                            stroke="white"
                            strokeWidth="2"
                          />
                        ))}

                        {/* Light direction indicator */}
                        {depthState.lightDirection && (
                          <>
                            <circle
                              cx={depthState.lightDirection.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                              cy={depthState.lightDirection.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                              r={12}
                              fill="#fde68a"
                              stroke="#f59e0b"
                              strokeWidth="3"
                            />
                            <text
                              x={depthState.lightDirection.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                              y={depthState.lightDirection.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2 + 4}
                              textAnchor="middle"
                              fill="#92400e"
                              fontSize="12"
                              fontWeight="bold"
                            >
                              ☀
                            </text>
                          </>
                        )}
                      </svg>
                    )}

                    {/* Texture Tool Visual Overlay */}
                    {currentTool === 'texture' && (
                      <svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: scaledCanvasSize,
                          height: scaledCanvasSize,
                          pointerEvents: 'none',
                          overflow: 'visible',
                        }}
                      >
                        {/* Area polygon */}
                        {textureState.areaPoints.length >= 2 && (
                          <polygon
                            points={textureState.areaPoints.map(p =>
                              `${p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2},${p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}`
                            ).join(' ')}
                            fill={textureState.isClosed ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)'}
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray={textureState.isClosed ? 'none' : '6,3'}
                          />
                        )}
                        {/* Area points */}
                        {textureState.areaPoints.map((p, i) => (
                          <circle
                            key={`tp-${i}`}
                            cx={p.x * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            cy={p.y * PIXEL_SIZE * zoom + PIXEL_SIZE * zoom / 2}
                            r={i === 0 ? 7 : 5}
                            fill={i === 0 ? '#d97706' : '#f59e0b'}
                            stroke="white"
                            strokeWidth="2"
                          />
                        ))}
                      </svg>
                    )}

                    {/* Alignment Selection Overlay */}
                    {currentTool === 'alignment' && alignmentSelection && (
                      <div
                        style={{
                          position: 'absolute',
                          left: Math.min(alignmentSelection.startX, alignmentSelection.endX) * PIXEL_SIZE * zoom,
                          top: Math.min(alignmentSelection.startY, alignmentSelection.endY) * PIXEL_SIZE * zoom,
                          width: (Math.abs(alignmentSelection.endX - alignmentSelection.startX) + 1) * PIXEL_SIZE * zoom,
                          height: (Math.abs(alignmentSelection.endY - alignmentSelection.startY) + 1) * PIXEL_SIZE * zoom,
                          border: '3px dashed #ec4899',
                          background: 'rgba(236, 72, 153, 0.2)',
                          pointerEvents: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Tools Panel (Right of Canvas) */}
            <div style={{
              width: '280px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '12px',
              background: '#f9f9f9',
              maxHeight: VIEWPORT_SIZE,
              overflowY: 'auto',
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0D0D0D' }}>Tools</h4>

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
                  onClick={() => setCurrentTool('polygon')}
                  style={{
                    padding: '8px 14px',
                    background: currentTool === 'polygon' ? '#22c55e' : '#E8DDD1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    color: currentTool === 'polygon' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Polygon
                </button>
                <button
                  onClick={() => setCurrentTool('texture')}
                  style={{
                    padding: '8px 14px',
                    background: currentTool === 'texture' ? '#f59e0b' : '#E8DDD1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    color: currentTool === 'texture' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Texture
                </button>
                <button
                  onClick={() => setCurrentTool('depth')}
                  style={{
                    padding: '8px 14px',
                    background: currentTool === 'depth' ? '#8b5cf6' : '#E8DDD1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    color: currentTool === 'depth' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Depth
                </button>
                <button
                  onClick={() => setCurrentTool('alignment')}
                  style={{
                    padding: '8px 14px',
                    background: currentTool === 'alignment' ? '#ec4899' : '#E8DDD1',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    color: currentTool === 'alignment' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  Align
                </button>
              </div>

              {/* Brush Size (for paint tool) */}
              {currentTool === 'paint' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#0D0D0D', fontSize: '13px' }}>
                    Brush: {brushSize}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                    Left-click paint, right-click erase
                  </p>
                </div>
              )}

              {/* Polygon Tool Panel - Guided */}
              {currentTool === 'polygon' && (
                <div style={{ marginBottom: '15px', padding: '12px', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #a5d6a7' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' }}>
                    {polygonState.step === 'drawing' && '1. Draw Shape'}
                    {polygonState.step === 'highlights' && '2. Add Highlights'}
                    {polygonState.step === 'coloring' && '3. Assign Colors'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px', lineHeight: '1.4' }}>
                    {polygonState.step === 'drawing' && (
                      <>Click pixels to add points. Press Next when done.</>
                    )}
                    {polygonState.step === 'highlights' && (
                      <>Click inside shape to add highlight points. Click "New Highlight" to start another.</>
                    )}
                    {polygonState.step === 'coloring' && (
                      <>Select a color from palette, then right-click on shape or highlight to assign.</>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    Points: {polygonState.boundaryPoints.length} | Highlights: {polygonState.highlights.length}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {polygonState.step === 'drawing' && (
                      <button
                        onClick={() => setPolygonState(prev => ({ ...prev, isClosed: true, step: 'highlights' }))}
                        disabled={polygonState.boundaryPoints.length < 3}
                        style={{
                          padding: '6px 10px',
                          background: polygonState.boundaryPoints.length >= 3 ? '#3b82f6' : '#ccc',
                          border: 'none', borderRadius: '4px', color: 'white',
                          cursor: polygonState.boundaryPoints.length >= 3 ? 'pointer' : 'not-allowed', fontSize: '11px',
                        }}
                      >
                        Next
                      </button>
                    )}
                    {polygonState.step === 'highlights' && (
                      <>
                        <button
                          onClick={addHighlight}
                          disabled={polygonState.currentHighlightPoints.length < 3}
                          style={{
                            padding: '6px 10px',
                            background: polygonState.currentHighlightPoints.length >= 3 ? '#22c55e' : '#ccc',
                            border: 'none', borderRadius: '4px', color: 'white', cursor: polygonState.currentHighlightPoints.length >= 3 ? 'pointer' : 'not-allowed', fontSize: '11px',
                          }}
                        >
                          New Highlight
                        </button>
                        <button
                          onClick={goToColoring}
                          style={{ padding: '6px 10px', background: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Next
                        </button>
                      </>
                    )}
                    {polygonState.step === 'coloring' && (
                      <button
                        onClick={generatePolygonShape}
                        style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Generate Shape
                      </button>
                    )}
                    <button
                      onClick={() => setPolygonState({ step: 'drawing', isClosed: false, boundaryPoints: [], highlights: [], currentHighlightPoints: [], baseColor: polygonState.baseColor })}
                      style={{ padding: '6px 10px', background: '#666', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Texture Tool Panel - Guided */}
              {currentTool === 'texture' && (
                <div style={{ marginBottom: '15px', padding: '12px', background: '#fff8e1', borderRadius: '6px', border: '1px solid #ffcc80' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#f57c00' }}>
                    {textureState.step === 'drawing' && '1. Select Area'}
                    {textureState.step === 'apply' && '2. Apply Texture'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px', lineHeight: '1.4' }}>
                    {textureState.step === 'drawing' && (
                      <>Click pixels to add points. Press Next when done.</>
                    )}
                    {textureState.step === 'apply' && (
                      <>Choose texture type and intensity, then click Apply.</>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    Points: {textureState.areaPoints.length}
                  </div>
                  {textureState.step === 'apply' && (
                    <>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {(['noise', 'dither', 'grain', 'crosshatch'] as TexturePattern[]).map(p => (
                          <button
                            key={p}
                            onClick={() => setTexturePattern(p)}
                            style={{
                              padding: '4px 8px', background: texturePattern === p ? '#f59e0b' : '#E8DDD1',
                              border: 'none', borderRadius: '4px', color: texturePattern === p ? 'white' : '#333',
                              cursor: 'pointer', fontSize: '10px', textTransform: 'capitalize',
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                        Intensity: {Math.round(textureIntensity * 100)}%
                        <input
                          type="range" min="0.1" max="1" step="0.1" value={textureIntensity}
                          onChange={(e) => setTextureIntensity(Number(e.target.value))}
                          style={{ width: '100%', marginTop: '4px' }}
                        />
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {textureState.step === 'drawing' && (
                      <button
                        onClick={() => setTextureState(prev => ({ ...prev, isClosed: true, step: 'apply' }))}
                        disabled={textureState.areaPoints.length < 3}
                        style={{
                          padding: '6px 10px',
                          background: textureState.areaPoints.length >= 3 ? '#3b82f6' : '#ccc',
                          border: 'none', borderRadius: '4px', color: 'white',
                          cursor: textureState.areaPoints.length >= 3 ? 'pointer' : 'not-allowed', fontSize: '11px',
                        }}
                      >
                        Next
                      </button>
                    )}
                    {textureState.step === 'apply' && (
                      <button
                        onClick={applyTextureToArea}
                        style={{ padding: '6px 12px', background: '#f59e0b', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Apply Texture
                      </button>
                    )}
                    <button
                      onClick={() => setTextureState({ step: 'drawing', isClosed: false, areaPoints: [] })}
                      style={{ padding: '6px 10px', background: '#666', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Depth Tool Panel - Guided */}
              {currentTool === 'depth' && (
                <div style={{ marginBottom: '15px', padding: '12px', background: '#ede7f6', borderRadius: '6px', border: '1px solid #b39ddb' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#7b1fa2' }}>
                    {depthState.step === 'drawing' && '1. Select Area'}
                    {depthState.step === 'light' && '2. Set Light Source'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px', lineHeight: '1.4' }}>
                    {depthState.step === 'drawing' && (
                      <>Click pixels to add points. Press Next when done.</>
                    )}
                    {depthState.step === 'light' && (
                      <>Click anywhere to set light direction. Pixels facing light will be brighter.</>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    Points: {depthState.areaPoints.length} | Light: {depthState.lightDirection ? 'Set' : 'Not set'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {depthState.step === 'drawing' && (
                      <button
                        onClick={() => setDepthState(prev => ({ ...prev, isClosed: true, step: 'light' }))}
                        disabled={depthState.areaPoints.length < 3}
                        style={{
                          padding: '6px 10px',
                          background: depthState.areaPoints.length >= 3 ? '#3b82f6' : '#ccc',
                          border: 'none', borderRadius: '4px', color: 'white',
                          cursor: depthState.areaPoints.length >= 3 ? 'pointer' : 'not-allowed', fontSize: '11px',
                        }}
                      >
                        Next
                      </button>
                    )}
                    {depthState.step === 'light' && depthState.lightDirection && (
                      <button
                        onClick={generateDepthShadows}
                        style={{ padding: '6px 12px', background: '#8b5cf6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        Apply Shading
                      </button>
                    )}
                    <button
                      onClick={() => setDepthState({ step: 'drawing', isClosed: false, areaPoints: [], lightDirection: null })}
                      style={{ padding: '6px 10px', background: '#666', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Alignment Tool Panel */}
              {currentTool === 'alignment' && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#fce4ec', borderRadius: '4px' }}>
                  <p style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                    Click to select, arrow keys to shift
                  </p>
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                    {alignmentSelection ? 'Selection active - use arrow keys!' : 'Click and drag to select'}
                  </div>
                  <button
                    onClick={() => { setAlignmentSelection(null); setIsSelectingAlignment(false); setAlignmentStart(null); }}
                    style={{ padding: '6px 12px', background: '#666', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              {/* Selected Color Display */}
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0D0D0D' }}>Selected Color</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: selectedColor,
                    border: '2px solid #ccc',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }} />
                  <div style={{ fontSize: '12px', color: '#666' }}>{selectedColor}</div>
                </div>
              </div>
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
                    {filteredColors.map((entry, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedColor(entry.color)}
                        style={{
                          width: '28px',
                          height: '28px',
                          backgroundColor: entry.color,
                          border: selectedColor === entry.color ? '2px solid #0D0D0D' : '1px solid #ccc',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          boxShadow: selectedColor === entry.color ? '0 0 6px rgba(13, 13, 13, 0.5)' : 'none',
                          position: 'relative',
                        }}
                        title={colorNames[entry.color] ? `${colorNames[entry.color]} (${entry.color})` : entry.tags.slice(0, 5).join(', ')}
                      >
                        {colorNames[entry.color] && (
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
