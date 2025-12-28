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
  tags: string[];
}

const DEFAULT_PALETTE: ColorEntry[] = [
  // Grayscale
  { color: '#000000', tags: ['black', 'dark', 'night', 'shadow', 'void', 'coal', 'ink', 'raven', 'obsidian', 'midnight', 'charcoal', 'soot', 'onyx', 'pitch', 'ebony', 'crow', 'bat', 'cave', 'deep', 'noir'] },
  { color: '#1a1a1a', tags: ['black', 'dark', 'night', 'shadow', 'charcoal', 'coal', 'graphite', 'slate', 'iron', 'storm', 'thunder', 'ash', 'smoke', 'metal', 'steel', 'cave', 'deep', 'noir', 'gothic', 'raven'] },
  { color: '#333333', tags: ['dark', 'gray', 'grey', 'charcoal', 'graphite', 'stone', 'rock', 'metal', 'iron', 'steel', 'shadow', 'smoke', 'thunder', 'storm', 'wolf', 'slate', 'ash', 'urban', 'concrete', 'asphalt'] },
  { color: '#4d4d4d', tags: ['gray', 'grey', 'stone', 'rock', 'metal', 'iron', 'steel', 'concrete', 'ash', 'smoke', 'elephant', 'dolphin', 'urban', 'industrial', 'machinery', 'pewter', 'slate', 'boulder', 'gravel', 'neutral'] },
  { color: '#666666', tags: ['gray', 'grey', 'stone', 'rock', 'metal', 'concrete', 'ash', 'smoke', 'steel', 'iron', 'neutral', 'urban', 'industrial', 'pewter', 'slate', 'machinery', 'robot', 'tech', 'modern', 'elephant'] },
  { color: '#808080', tags: ['gray', 'grey', 'stone', 'rock', 'metal', 'concrete', 'neutral', 'silver', 'steel', 'iron', 'pewter', 'ash', 'fog', 'mist', 'cloud', 'overcast', 'mouse', 'elephant', 'dolphin', 'medium'] },
  { color: '#999999', tags: ['gray', 'grey', 'silver', 'metal', 'stone', 'fog', 'mist', 'cloud', 'smoke', 'ash', 'neutral', 'pale', 'light', 'soft', 'gentle', 'moon', 'platinum', 'titanium', 'chrome', 'sleek'] },
  { color: '#b3b3b3', tags: ['gray', 'grey', 'silver', 'light', 'pale', 'soft', 'cloud', 'fog', 'mist', 'platinum', 'chrome', 'moon', 'pearl', 'silk', 'satin', 'dove', 'feather', 'gentle', 'subtle', 'neutral'] },
  { color: '#cccccc', tags: ['gray', 'grey', 'silver', 'light', 'pale', 'soft', 'cloud', 'snow', 'fog', 'mist', 'platinum', 'pearl', 'silk', 'dove', 'feather', 'cotton', 'wool', 'gentle', 'subtle', 'clean'] },
  { color: '#e6e6e6', tags: ['gray', 'grey', 'white', 'light', 'pale', 'soft', 'snow', 'cloud', 'fog', 'pearl', 'bone', 'ivory', 'cream', 'silk', 'cotton', 'wool', 'clean', 'fresh', 'pure', 'minimal'] },
  { color: '#ffffff', tags: ['white', 'light', 'bright', 'pure', 'clean', 'snow', 'cloud', 'ice', 'pearl', 'ivory', 'bone', 'cream', 'milk', 'cotton', 'paper', 'blank', 'fresh', 'crisp', 'heaven', 'angel'] },

  // Reds
  { color: '#1a0000', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'deep', 'rich', 'vampire', 'gothic', 'noir', 'shadow', 'cherry', 'berry', 'burgundy', 'velvet', 'night', 'mystery', 'drama', 'intense', 'power'] },
  { color: '#330000', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'burgundy', 'deep', 'rich', 'cherry', 'berry', 'velvet', 'gothic', 'vampire', 'drama', 'intense', 'power', 'passion', 'love', 'heart', 'ember'] },
  { color: '#660000', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'burgundy', 'cherry', 'berry', 'crimson', 'velvet', 'rich', 'deep', 'passion', 'love', 'heart', 'ruby', 'garnet', 'drama', 'power', 'intense'] },
  { color: '#800000', tags: ['red', 'maroon', 'blood', 'wine', 'burgundy', 'cherry', 'berry', 'crimson', 'brick', 'rust', 'rich', 'deep', 'passion', 'love', 'heart', 'ruby', 'garnet', 'velvet', 'autumn', 'fall'] },
  { color: '#990000', tags: ['red', 'crimson', 'blood', 'wine', 'cherry', 'berry', 'ruby', 'garnet', 'brick', 'rust', 'passion', 'love', 'heart', 'fire', 'flame', 'hot', 'warm', 'intense', 'power', 'danger'] },
  { color: '#cc0000', tags: ['red', 'crimson', 'blood', 'cherry', 'berry', 'ruby', 'fire', 'flame', 'hot', 'warm', 'passion', 'love', 'heart', 'danger', 'stop', 'alert', 'apple', 'tomato', 'strawberry', 'intense'] },
  { color: '#ff0000', tags: ['red', 'bright', 'fire', 'flame', 'hot', 'warm', 'passion', 'love', 'heart', 'danger', 'stop', 'alert', 'apple', 'tomato', 'strawberry', 'cherry', 'berry', 'ruby', 'candy', 'lipstick'] },
  { color: '#ff3333', tags: ['red', 'bright', 'fire', 'cherry', 'berry', 'strawberry', 'apple', 'tomato', 'candy', 'lipstick', 'passion', 'love', 'heart', 'warm', 'hot', 'vibrant', 'bold', 'electric', 'neon', 'pop'] },
  { color: '#ff6666', tags: ['red', 'pink', 'coral', 'salmon', 'peach', 'berry', 'strawberry', 'cherry', 'candy', 'bubblegum', 'warm', 'soft', 'gentle', 'sweet', 'romantic', 'blush', 'rose', 'flower', 'petal', 'light'] },
  { color: '#ff9999', tags: ['red', 'pink', 'coral', 'salmon', 'peach', 'blush', 'rose', 'petal', 'flower', 'candy', 'bubblegum', 'sweet', 'soft', 'gentle', 'romantic', 'baby', 'pale', 'light', 'pastel', 'feminine'] },
  { color: '#ffcccc', tags: ['pink', 'pale', 'light', 'blush', 'rose', 'petal', 'flower', 'soft', 'gentle', 'romantic', 'baby', 'pastel', 'feminine', 'sweet', 'candy', 'cotton', 'skin', 'peach', 'cream', 'delicate'] },
  { color: '#8b0000', tags: ['red', 'dark', 'blood', 'wine', 'maroon', 'burgundy', 'cherry', 'berry', 'crimson', 'brick', 'rust', 'rich', 'deep', 'autumn', 'fall', 'velvet', 'leather', 'mahogany', 'ox', 'barn'] },
  { color: '#a52a2a', tags: ['red', 'brown', 'brick', 'rust', 'auburn', 'chestnut', 'cinnamon', 'clay', 'earth', 'autumn', 'fall', 'leather', 'wood', 'warm', 'rich', 'natural', 'organic', 'spice', 'nutmeg', 'sienna'] },
  { color: '#b22222', tags: ['red', 'brick', 'fire', 'rust', 'crimson', 'barn', 'clay', 'earth', 'autumn', 'fall', 'warm', 'rich', 'bold', 'intense', 'passion', 'love', 'heart', 'blood', 'ruby', 'garnet'] },
  { color: '#cd5c5c', tags: ['red', 'pink', 'coral', 'salmon', 'rose', 'dusty', 'muted', 'soft', 'warm', 'earth', 'clay', 'terracotta', 'autumn', 'vintage', 'antique', 'faded', 'romantic', 'gentle', 'subtle', 'natural'] },
  { color: '#dc143c', tags: ['red', 'crimson', 'cherry', 'berry', 'ruby', 'garnet', 'blood', 'passion', 'love', 'heart', 'fire', 'hot', 'warm', 'intense', 'bold', 'vibrant', 'royal', 'rich', 'jewel', 'lipstick'] },

  // Oranges
  { color: '#331400', tags: ['brown', 'dark', 'chocolate', 'coffee', 'espresso', 'wood', 'bark', 'earth', 'soil', 'mud', 'umber', 'sepia', 'walnut', 'mahogany', 'rich', 'deep', 'warm', 'organic', 'natural', 'rustic'] },
  { color: '#663300', tags: ['brown', 'orange', 'dark', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'soil', 'leather', 'saddle', 'caramel', 'toffee', 'amber', 'warm', 'rich', 'organic', 'natural', 'rustic', 'autumn'] },
  { color: '#994d00', tags: ['orange', 'brown', 'rust', 'copper', 'bronze', 'caramel', 'toffee', 'amber', 'honey', 'wood', 'leather', 'autumn', 'fall', 'warm', 'rich', 'earth', 'spice', 'cinnamon', 'nutmeg', 'maple'] },
  { color: '#cc6600', tags: ['orange', 'rust', 'copper', 'bronze', 'caramel', 'toffee', 'amber', 'honey', 'maple', 'autumn', 'fall', 'pumpkin', 'squash', 'warm', 'rich', 'fire', 'sunset', 'spice', 'ginger', 'turmeric'] },
  { color: '#ff8000', tags: ['orange', 'bright', 'fire', 'flame', 'sunset', 'sunrise', 'pumpkin', 'carrot', 'mango', 'tangerine', 'citrus', 'tropical', 'warm', 'hot', 'vibrant', 'bold', 'energy', 'autumn', 'fall', 'halloween'] },
  { color: '#ff9933', tags: ['orange', 'bright', 'fire', 'sunset', 'sunrise', 'mango', 'tangerine', 'citrus', 'tropical', 'peach', 'apricot', 'warm', 'vibrant', 'bold', 'energy', 'happy', 'cheerful', 'autumn', 'golden', 'honey'] },
  { color: '#ffad5c', tags: ['orange', 'peach', 'apricot', 'mango', 'tangerine', 'citrus', 'tropical', 'warm', 'soft', 'gentle', 'sunset', 'golden', 'honey', 'caramel', 'butterscotch', 'cream', 'light', 'pale', 'pastel', 'sweet'] },
  { color: '#ffc285', tags: ['orange', 'peach', 'apricot', 'cream', 'light', 'pale', 'soft', 'gentle', 'warm', 'skin', 'nude', 'blush', 'sunset', 'golden', 'honey', 'caramel', 'butterscotch', 'pastel', 'sweet', 'delicate'] },
  { color: '#d2691e', tags: ['orange', 'brown', 'chocolate', 'caramel', 'toffee', 'cinnamon', 'spice', 'wood', 'leather', 'saddle', 'autumn', 'fall', 'warm', 'rich', 'earth', 'organic', 'natural', 'rustic', 'copper', 'bronze'] },
  { color: '#ff7f50', tags: ['orange', 'coral', 'salmon', 'peach', 'tropical', 'beach', 'sunset', 'warm', 'soft', 'vibrant', 'summer', 'mango', 'papaya', 'citrus', 'flower', 'petal', 'romantic', 'feminine', 'pretty', 'sweet'] },
  { color: '#ff6347', tags: ['orange', 'red', 'tomato', 'coral', 'salmon', 'warm', 'hot', 'fire', 'sunset', 'tropical', 'summer', 'vibrant', 'bold', 'spicy', 'pepper', 'chili', 'fruit', 'vegetable', 'garden', 'fresh'] },
  { color: '#e2725b', tags: ['orange', 'coral', 'terracotta', 'clay', 'earth', 'warm', 'muted', 'dusty', 'vintage', 'antique', 'rustic', 'mediterranean', 'desert', 'southwest', 'adobe', 'pottery', 'ceramic', 'natural', 'organic', 'autumn'] },
  { color: '#c04000', tags: ['orange', 'rust', 'burnt', 'brick', 'terracotta', 'clay', 'earth', 'autumn', 'fall', 'warm', 'rich', 'deep', 'fire', 'ember', 'copper', 'bronze', 'vintage', 'antique', 'rustic', 'natural'] },

  // Yellows
  { color: '#333300', tags: ['yellow', 'olive', 'dark', 'army', 'military', 'khaki', 'earth', 'mud', 'swamp', 'moss', 'forest', 'jungle', 'camouflage', 'nature', 'organic', 'natural', 'muted', 'vintage', 'antique', 'rustic'] },
  { color: '#666600', tags: ['yellow', 'olive', 'army', 'military', 'khaki', 'earth', 'moss', 'forest', 'jungle', 'swamp', 'camouflage', 'nature', 'organic', 'natural', 'muted', 'vintage', 'antique', 'rustic', 'safari', 'autumn'] },
  { color: '#999900', tags: ['yellow', 'olive', 'gold', 'mustard', 'khaki', 'earth', 'autumn', 'fall', 'harvest', 'wheat', 'hay', 'straw', 'grass', 'nature', 'organic', 'natural', 'warm', 'muted', 'vintage', 'rustic'] },
  { color: '#cccc00', tags: ['yellow', 'gold', 'mustard', 'chartreuse', 'lime', 'acid', 'neon', 'bright', 'vibrant', 'bold', 'electric', 'energy', 'sun', 'sunny', 'happy', 'cheerful', 'spring', 'summer', 'fresh', 'citrus'] },
  { color: '#ffff00', tags: ['yellow', 'bright', 'sun', 'sunny', 'gold', 'lemon', 'citrus', 'banana', 'canary', 'happy', 'cheerful', 'energy', 'vibrant', 'bold', 'electric', 'neon', 'summer', 'spring', 'fresh', 'warm'] },
  { color: '#ffff33', tags: ['yellow', 'bright', 'sun', 'sunny', 'gold', 'lemon', 'citrus', 'banana', 'happy', 'cheerful', 'energy', 'vibrant', 'summer', 'spring', 'fresh', 'warm', 'light', 'pale', 'soft', 'gentle'] },
  { color: '#ffff66', tags: ['yellow', 'light', 'pale', 'soft', 'sunny', 'lemon', 'citrus', 'banana', 'cream', 'butter', 'happy', 'cheerful', 'gentle', 'warm', 'summer', 'spring', 'fresh', 'pastel', 'sweet', 'delicate'] },
  { color: '#ffff99', tags: ['yellow', 'pale', 'light', 'cream', 'butter', 'vanilla', 'soft', 'gentle', 'warm', 'sunny', 'pastel', 'baby', 'sweet', 'delicate', 'feminine', 'spring', 'summer', 'fresh', 'clean', 'bright'] },
  { color: '#ffffcc', tags: ['yellow', 'cream', 'pale', 'light', 'butter', 'vanilla', 'ivory', 'soft', 'gentle', 'warm', 'pastel', 'baby', 'sweet', 'delicate', 'feminine', 'clean', 'fresh', 'pure', 'minimal', 'subtle'] },
  { color: '#ffd700', tags: ['yellow', 'gold', 'golden', 'metal', 'metallic', 'shiny', 'rich', 'luxury', 'royal', 'crown', 'treasure', 'coin', 'sun', 'honey', 'amber', 'warm', 'bright', 'vibrant', 'precious', 'valuable'] },
  { color: '#daa520', tags: ['yellow', 'gold', 'golden', 'amber', 'honey', 'caramel', 'butterscotch', 'autumn', 'fall', 'harvest', 'wheat', 'warm', 'rich', 'earth', 'natural', 'organic', 'vintage', 'antique', 'mustard', 'ochre'] },
  { color: '#b8860b', tags: ['yellow', 'gold', 'dark', 'amber', 'honey', 'caramel', 'mustard', 'ochre', 'earth', 'autumn', 'fall', 'harvest', 'warm', 'rich', 'deep', 'natural', 'organic', 'vintage', 'antique', 'rustic'] },
  { color: '#f0c420', tags: ['yellow', 'gold', 'bright', 'sunny', 'lemon', 'mustard', 'taxi', 'school', 'warning', 'caution', 'energy', 'happy', 'cheerful', 'vibrant', 'bold', 'warm', 'summer', 'spring', 'fresh', 'citrus'] },

  // Earth Tones
  { color: '#8b4513', tags: ['brown', 'earth', 'saddle', 'leather', 'wood', 'bark', 'chocolate', 'coffee', 'cinnamon', 'spice', 'autumn', 'fall', 'warm', 'rich', 'natural', 'organic', 'rustic', 'country', 'western', 'horse'] },
  { color: '#a0522d', tags: ['brown', 'earth', 'sienna', 'clay', 'terracotta', 'rust', 'copper', 'autumn', 'fall', 'warm', 'rich', 'natural', 'organic', 'rustic', 'pottery', 'ceramic', 'southwest', 'desert', 'adobe', 'brick'] },
  { color: '#6b4423', tags: ['brown', 'earth', 'wood', 'bark', 'tree', 'forest', 'chocolate', 'coffee', 'espresso', 'dark', 'rich', 'deep', 'natural', 'organic', 'rustic', 'cabin', 'log', 'furniture', 'walnut', 'oak'] },
  { color: '#cd853f', tags: ['brown', 'tan', 'peru', 'caramel', 'toffee', 'butterscotch', 'sand', 'desert', 'beach', 'warm', 'earth', 'natural', 'organic', 'skin', 'nude', 'leather', 'suede', 'autumn', 'fall', 'harvest'] },
  { color: '#d2691e', tags: ['brown', 'orange', 'chocolate', 'caramel', 'toffee', 'cinnamon', 'spice', 'autumn', 'fall', 'warm', 'rich', 'earth', 'natural', 'organic', 'rustic', 'wood', 'leather', 'copper', 'bronze', 'harvest'] },
  { color: '#deb887', tags: ['brown', 'tan', 'beige', 'cream', 'sand', 'desert', 'beach', 'wheat', 'straw', 'hay', 'warm', 'soft', 'gentle', 'natural', 'organic', 'neutral', 'skin', 'nude', 'light', 'pale'] },
  { color: '#d2b48c', tags: ['brown', 'tan', 'beige', 'sand', 'desert', 'beach', 'khaki', 'camel', 'warm', 'soft', 'natural', 'neutral', 'earth', 'organic', 'safari', 'travel', 'adventure', 'outdoor', 'light', 'pale'] },
  { color: '#c4a76c', tags: ['brown', 'tan', 'gold', 'khaki', 'sand', 'desert', 'wheat', 'straw', 'hay', 'harvest', 'autumn', 'warm', 'soft', 'natural', 'organic', 'neutral', 'earth', 'vintage', 'antique', 'rustic'] },
  { color: '#f5deb3', tags: ['brown', 'tan', 'beige', 'cream', 'wheat', 'straw', 'hay', 'sand', 'light', 'pale', 'soft', 'warm', 'gentle', 'natural', 'neutral', 'organic', 'bread', 'grain', 'harvest', 'autumn'] },
  { color: '#faebd7', tags: ['cream', 'white', 'beige', 'ivory', 'antique', 'vintage', 'lace', 'linen', 'cotton', 'soft', 'gentle', 'warm', 'light', 'pale', 'delicate', 'elegant', 'classic', 'romantic', 'feminine', 'wedding'] },
  { color: '#ffe4c4', tags: ['cream', 'peach', 'beige', 'bisque', 'skin', 'nude', 'blush', 'soft', 'gentle', 'warm', 'light', 'pale', 'delicate', 'feminine', 'romantic', 'baby', 'sweet', 'natural', 'organic', 'subtle'] },
  { color: '#cc7722', tags: ['orange', 'brown', 'ochre', 'amber', 'honey', 'caramel', 'butterscotch', 'autumn', 'fall', 'harvest', 'warm', 'rich', 'earth', 'natural', 'organic', 'rustic', 'vintage', 'antique', 'copper', 'bronze'] },
  { color: '#c19a6b', tags: ['brown', 'tan', 'camel', 'sand', 'desert', 'khaki', 'fawn', 'deer', 'warm', 'soft', 'natural', 'neutral', 'earth', 'organic', 'safari', 'autumn', 'fall', 'leather', 'suede', 'vintage'] },

  // Browns
  { color: '#1a0f00', tags: ['brown', 'black', 'dark', 'chocolate', 'coffee', 'espresso', 'wood', 'bark', 'earth', 'soil', 'mud', 'deep', 'rich', 'natural', 'organic', 'rustic', 'night', 'shadow', 'umber', 'sepia'] },
  { color: '#2d1a00', tags: ['brown', 'dark', 'chocolate', 'coffee', 'espresso', 'wood', 'bark', 'earth', 'soil', 'mud', 'umber', 'sepia', 'rich', 'deep', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'walnut'] },
  { color: '#3d2b1f', tags: ['brown', 'dark', 'chocolate', 'coffee', 'espresso', 'wood', 'bark', 'earth', 'leather', 'rich', 'deep', 'warm', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'walnut', 'mahogany', 'furniture'] },
  { color: '#4a2c2a', tags: ['brown', 'dark', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'leather', 'rich', 'deep', 'warm', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'mahogany', 'chestnut', 'auburn', 'wine'] },
  { color: '#5c4033', tags: ['brown', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'leather', 'saddle', 'rich', 'warm', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'furniture', 'cabin', 'log', 'walnut', 'oak'] },
  { color: '#6b4423', tags: ['brown', 'chocolate', 'coffee', 'wood', 'bark', 'earth', 'leather', 'saddle', 'rich', 'warm', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'furniture', 'walnut', 'oak', 'chestnut', 'autumn'] },
  { color: '#7b3f00', tags: ['brown', 'chocolate', 'coffee', 'caramel', 'toffee', 'wood', 'leather', 'saddle', 'rich', 'warm', 'natural', 'organic', 'rustic', 'autumn', 'fall', 'harvest', 'cinnamon', 'spice', 'copper', 'bronze'] },
  { color: '#8b4513', tags: ['brown', 'saddle', 'leather', 'wood', 'bark', 'chocolate', 'coffee', 'cinnamon', 'spice', 'earth', 'autumn', 'fall', 'warm', 'rich', 'natural', 'organic', 'rustic', 'western', 'country', 'horse'] },
  { color: '#6f4e37', tags: ['brown', 'coffee', 'mocha', 'chocolate', 'wood', 'bark', 'earth', 'leather', 'warm', 'rich', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'cafe', 'latte', 'espresso', 'bean', 'roast'] },
  { color: '#4b3621', tags: ['brown', 'dark', 'coffee', 'chocolate', 'wood', 'bark', 'earth', 'leather', 'rich', 'deep', 'warm', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'walnut', 'mahogany', 'furniture', 'cabin'] },
  { color: '#8b7355', tags: ['brown', 'tan', 'taupe', 'mushroom', 'stone', 'earth', 'warm', 'muted', 'neutral', 'natural', 'organic', 'rustic', 'antique', 'vintage', 'soft', 'gentle', 'subtle', 'elegant', 'sophisticated', 'cafe'] },
  { color: '#a67b5b', tags: ['brown', 'tan', 'caramel', 'toffee', 'coffee', 'latte', 'mocha', 'warm', 'soft', 'natural', 'neutral', 'earth', 'organic', 'rustic', 'antique', 'vintage', 'leather', 'suede', 'autumn', 'fall'] },
  { color: '#bc8f8f', tags: ['brown', 'pink', 'rose', 'dusty', 'muted', 'soft', 'warm', 'gentle', 'romantic', 'vintage', 'antique', 'faded', 'subtle', 'elegant', 'feminine', 'blush', 'mauve', 'neutral', 'natural', 'earth'] },

  // Greens
  { color: '#0a1a00', tags: ['green', 'dark', 'forest', 'jungle', 'night', 'shadow', 'deep', 'rich', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'moss', 'fern', 'pine', 'evergreen', 'mysterious', 'enchanted'] },
  { color: '#143300', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'moss', 'fern', 'pine', 'evergreen', 'hunter', 'military', 'army', 'camouflage'] },
  { color: '#1e4d00', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'moss', 'fern', 'pine', 'evergreen', 'hunter', 'bottle', 'emerald', 'jewel'] },
  { color: '#286600', tags: ['green', 'forest', 'jungle', 'nature', 'tree', 'leaf', 'plant', 'grass', 'organic', 'natural', 'moss', 'fern', 'pine', 'evergreen', 'hunter', 'bottle', 'rich', 'deep', 'vibrant', 'fresh'] },
  { color: '#328000', tags: ['green', 'forest', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'lawn', 'meadow', 'field', 'vibrant', 'alive', 'growth', 'life'] },
  { color: '#3c9900', tags: ['green', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'lawn', 'meadow', 'field', 'vibrant', 'alive', 'growth', 'life', 'healthy'] },
  { color: '#46b300', tags: ['green', 'bright', 'grass', 'nature', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'lime', 'kiwi', 'apple', 'vibrant', 'alive', 'growth', 'life', 'healthy'] },
  { color: '#50cc00', tags: ['green', 'bright', 'lime', 'grass', 'nature', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'kiwi', 'apple', 'citrus'] },
  { color: '#00ff00', tags: ['green', 'bright', 'lime', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'plant', 'toxic', 'radioactive', 'glow', 'alien', 'matrix', 'digital'] },
  { color: '#33ff33', tags: ['green', 'bright', 'lime', 'neon', 'electric', 'vibrant', 'bold', 'energy', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'glow', 'light', 'pale', 'soft', 'gentle', 'mint', 'kiwi'] },
  { color: '#66ff66', tags: ['green', 'light', 'lime', 'mint', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'plant', 'soft', 'gentle', 'pale', 'pastel', 'sweet', 'candy', 'kiwi', 'apple', 'melon', 'honeydew'] },
  { color: '#99ff99', tags: ['green', 'light', 'pale', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'sweet', 'candy', 'baby', 'delicate', 'feminine', 'clean', 'pure', 'melon'] },
  { color: '#ccffcc', tags: ['green', 'pale', 'light', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature', 'clean', 'pure', 'baby', 'delicate', 'feminine', 'sweet', 'subtle', 'minimal', 'cream', 'ice'] },
  { color: '#228b22', tags: ['green', 'forest', 'nature', 'tree', 'leaf', 'plant', 'grass', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'park', 'jungle', 'tropical', 'rich', 'vibrant', 'alive', 'growth'] },
  { color: '#2e8b57', tags: ['green', 'sea', 'ocean', 'water', 'nature', 'forest', 'jungle', 'tropical', 'organic', 'natural', 'fresh', 'cool', 'calm', 'serene', 'peaceful', 'healing', 'jade', 'emerald', 'jewel', 'rich'] },
  { color: '#3cb371', tags: ['green', 'sea', 'ocean', 'water', 'nature', 'tropical', 'spring', 'fresh', 'cool', 'calm', 'serene', 'peaceful', 'healing', 'mint', 'jade', 'soft', 'gentle', 'natural', 'organic', 'vibrant'] },
  { color: '#006400', tags: ['green', 'dark', 'forest', 'jungle', 'deep', 'rich', 'nature', 'tree', 'leaf', 'pine', 'evergreen', 'hunter', 'bottle', 'emerald', 'jewel', 'organic', 'natural', 'mysterious', 'enchanted', 'celtic'] },
  { color: '#008000', tags: ['green', 'grass', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'lawn', 'meadow', 'field', 'go', 'safe', 'healthy', 'eco', 'environment'] },
  { color: '#355e3b', tags: ['green', 'dark', 'forest', 'hunter', 'jungle', 'nature', 'tree', 'leaf', 'pine', 'evergreen', 'organic', 'natural', 'deep', 'rich', 'muted', 'sophisticated', 'elegant', 'classic', 'british', 'racing'] },
  { color: '#556b2f', tags: ['green', 'olive', 'army', 'military', 'khaki', 'camouflage', 'nature', 'earth', 'forest', 'jungle', 'muted', 'dusty', 'vintage', 'antique', 'rustic', 'organic', 'natural', 'autumn', 'fall', 'safari'] },
  { color: '#6b8e23', tags: ['green', 'olive', 'yellow', 'grass', 'nature', 'meadow', 'field', 'prairie', 'autumn', 'fall', 'harvest', 'organic', 'natural', 'fresh', 'spring', 'summer', 'chartreuse', 'lime', 'pear', 'apple'] },
  { color: '#808000', tags: ['green', 'olive', 'yellow', 'army', 'military', 'khaki', 'camouflage', 'earth', 'nature', 'autumn', 'fall', 'harvest', 'muted', 'dusty', 'vintage', 'antique', 'rustic', 'organic', 'natural', 'safari'] },
  { color: '#9acd32', tags: ['green', 'yellow', 'lime', 'chartreuse', 'bright', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'plant', 'organic', 'natural', 'vibrant', 'bold', 'energy', 'citrus', 'pear', 'apple', 'kiwi'] },
  { color: '#4f7942', tags: ['green', 'fern', 'forest', 'nature', 'tree', 'leaf', 'plant', 'organic', 'natural', 'fresh', 'spring', 'summer', 'garden', 'muted', 'soft', 'gentle', 'calm', 'serene', 'peaceful', 'healing'] },
  { color: '#8fbc8f', tags: ['green', 'sea', 'sage', 'muted', 'soft', 'gentle', 'pale', 'light', 'nature', 'organic', 'natural', 'calm', 'serene', 'peaceful', 'healing', 'spa', 'zen', 'relaxing', 'soothing', 'fresh'] },
  { color: '#90ee90', tags: ['green', 'light', 'pale', 'mint', 'spring', 'fresh', 'nature', 'grass', 'leaf', 'soft', 'gentle', 'pastel', 'sweet', 'candy', 'baby', 'delicate', 'feminine', 'clean', 'pure', 'melon'] },
  { color: '#98fb98', tags: ['green', 'pale', 'light', 'mint', 'pastel', 'soft', 'gentle', 'spring', 'fresh', 'nature', 'clean', 'pure', 'baby', 'delicate', 'feminine', 'sweet', 'candy', 'ice', 'melon', 'honeydew'] },
  { color: '#adff2f', tags: ['green', 'yellow', 'lime', 'chartreuse', 'neon', 'bright', 'electric', 'vibrant', 'bold', 'energy', 'spring', 'fresh', 'citrus', 'acid', 'toxic', 'radioactive', 'glow', 'kiwi', 'grape', 'unripe'] },

  // Teals & Cyans
  { color: '#003333', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'night', 'shadow', 'forest', 'jungle', 'mysterious', 'enchanted', 'cool', 'cold', 'winter', 'ice', 'arctic', 'rich', 'jewel', 'emerald'] },
  { color: '#004d4d', tags: ['teal', 'dark', 'deep', 'ocean', 'sea', 'water', 'forest', 'jungle', 'mysterious', 'cool', 'cold', 'winter', 'ice', 'arctic', 'rich', 'jewel', 'emerald', 'peacock', 'elegant', 'sophisticated'] },
  { color: '#006666', tags: ['teal', 'dark', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'cool', 'cold', 'winter', 'ice', 'arctic', 'rich', 'deep', 'jewel', 'emerald', 'peacock', 'elegant', 'sophisticated', 'nature'] },
  { color: '#008080', tags: ['teal', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'aqua', 'cool', 'calm', 'serene', 'peaceful', 'healing', 'spa', 'zen', 'nature', 'beach', 'lagoon', 'paradise', 'exotic'] },
  { color: '#009999', tags: ['teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'aqua', 'cool', 'calm', 'serene', 'peaceful', 'fresh', 'clean', 'modern', 'tech', 'digital', 'vibrant', 'bold'] },
  { color: '#00b3b3', tags: ['teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'fresh', 'clean', 'modern', 'tech', 'digital', 'vibrant', 'bold', 'bright', 'electric', 'neon', 'pool'] },
  { color: '#00cccc', tags: ['cyan', 'teal', 'ocean', 'sea', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'fresh', 'clean', 'modern', 'tech', 'digital', 'vibrant', 'bright', 'electric', 'neon', 'pool', 'ice'] },
  { color: '#00ffff', tags: ['cyan', 'aqua', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'water', 'ocean', 'sea', 'pool', 'ice', 'cool', 'fresh', 'clean', 'modern', 'tech', 'digital', 'futuristic', 'sci-fi'] },
  { color: '#33ffff', tags: ['cyan', 'aqua', 'bright', 'neon', 'electric', 'water', 'ocean', 'pool', 'ice', 'cool', 'fresh', 'clean', 'modern', 'light', 'pale', 'soft', 'gentle', 'mint', 'turquoise', 'tropical'] },
  { color: '#66ffff', tags: ['cyan', 'aqua', 'light', 'pale', 'water', 'ocean', 'pool', 'ice', 'cool', 'fresh', 'clean', 'soft', 'gentle', 'pastel', 'mint', 'turquoise', 'tropical', 'beach', 'lagoon', 'paradise'] },
  { color: '#99ffff', tags: ['cyan', 'aqua', 'pale', 'light', 'pastel', 'water', 'ice', 'cool', 'fresh', 'clean', 'soft', 'gentle', 'baby', 'delicate', 'feminine', 'mint', 'turquoise', 'arctic', 'frozen', 'crystal'] },
  { color: '#ccffff', tags: ['cyan', 'aqua', 'pale', 'light', 'pastel', 'ice', 'snow', 'cool', 'fresh', 'clean', 'soft', 'gentle', 'baby', 'delicate', 'feminine', 'pure', 'minimal', 'subtle', 'arctic', 'frozen'] },
  { color: '#008b8b', tags: ['teal', 'dark', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'turquoise', 'cool', 'calm', 'deep', 'rich', 'jewel', 'peacock', 'elegant', 'sophisticated', 'nature', 'exotic', 'lagoon'] },
  { color: '#20b2aa', tags: ['teal', 'cyan', 'sea', 'ocean', 'water', 'tropical', 'turquoise', 'aqua', 'cool', 'calm', 'serene', 'peaceful', 'fresh', 'nature', 'beach', 'lagoon', 'paradise', 'exotic', 'caribbean', 'spring'] },
  { color: '#40e0d0', tags: ['turquoise', 'teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'caribbean', 'aqua', 'bright', 'vibrant', 'cool', 'fresh', 'beach', 'lagoon', 'paradise', 'exotic', 'jewel', 'gemstone', 'summer'] },
  { color: '#48d1cc', tags: ['turquoise', 'teal', 'cyan', 'ocean', 'sea', 'water', 'tropical', 'aqua', 'medium', 'cool', 'fresh', 'calm', 'serene', 'beach', 'lagoon', 'paradise', 'exotic', 'caribbean', 'spring', 'summer'] },
  { color: '#00ced1', tags: ['turquoise', 'cyan', 'teal', 'ocean', 'sea', 'water', 'tropical', 'aqua', 'bright', 'vibrant', 'cool', 'fresh', 'beach', 'lagoon', 'paradise', 'exotic', 'caribbean', 'electric', 'neon', 'bold'] },
  { color: '#5f9ea0', tags: ['teal', 'gray', 'blue', 'sea', 'ocean', 'water', 'muted', 'dusty', 'soft', 'calm', 'serene', 'peaceful', 'cool', 'nature', 'stone', 'slate', 'sophisticated', 'elegant', 'vintage', 'antique'] },

  // Blues
  { color: '#000033', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space', 'cosmic', 'galaxy', 'universe', 'mysterious', 'shadow', 'ink', 'royal', 'regal', 'elegant', 'sophisticated'] },
  { color: '#000066', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space', 'cosmic', 'royal', 'regal', 'elegant', 'sophisticated', 'formal', 'classic', 'traditional', 'ink', 'indigo'] },
  { color: '#000080', tags: ['blue', 'navy', 'dark', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'elegant', 'sophisticated', 'formal', 'classic', 'traditional', 'military', 'uniform', 'sailor', 'nautical', 'maritime', 'preppy'] },
  { color: '#000099', tags: ['blue', 'navy', 'dark', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'elegant', 'sophisticated', 'formal', 'classic', 'sapphire', 'jewel', 'gemstone', 'precious', 'indigo', 'ink', 'cobalt'] },
  { color: '#0000cc', tags: ['blue', 'bright', 'royal', 'cobalt', 'electric', 'vibrant', 'bold', 'rich', 'deep', 'ocean', 'sea', 'sapphire', 'jewel', 'gemstone', 'precious', 'intense', 'dramatic', 'powerful', 'strong', 'primary'] },
  { color: '#0000ff', tags: ['blue', 'bright', 'primary', 'electric', 'vibrant', 'bold', 'royal', 'cobalt', 'intense', 'dramatic', 'powerful', 'strong', 'pure', 'clean', 'digital', 'tech', 'modern', 'sapphire', 'jewel', 'neon'] },
  { color: '#3333ff', tags: ['blue', 'bright', 'electric', 'vibrant', 'bold', 'royal', 'cobalt', 'intense', 'dramatic', 'powerful', 'neon', 'glow', 'digital', 'tech', 'modern', 'futuristic', 'sci-fi', 'sapphire', 'jewel', 'violet'] },
  { color: '#6666ff', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'bright', 'electric', 'vibrant', 'soft', 'gentle', 'dreamy', 'fantasy', 'magical', 'mystical', 'cosmic', 'space', 'galaxy', 'twilight', 'dusk', 'evening'] },
  { color: '#9999ff', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'light', 'pale', 'soft', 'gentle', 'pastel', 'dreamy', 'fantasy', 'magical', 'mystical', 'romantic', 'feminine', 'delicate', 'sweet', 'twilight', 'sky'] },
  { color: '#ccccff', tags: ['blue', 'purple', 'violet', 'periwinkle', 'lavender', 'pale', 'light', 'pastel', 'soft', 'gentle', 'dreamy', 'fantasy', 'romantic', 'feminine', 'delicate', 'sweet', 'baby', 'subtle', 'minimal', 'clean'] },
  { color: '#191970', tags: ['blue', 'dark', 'navy', 'midnight', 'night', 'deep', 'rich', 'ocean', 'sea', 'space', 'cosmic', 'galaxy', 'mysterious', 'elegant', 'sophisticated', 'formal', 'classic', 'royal', 'regal', 'indigo'] },
  { color: '#00008b', tags: ['blue', 'dark', 'navy', 'deep', 'rich', 'ocean', 'sea', 'royal', 'regal', 'elegant', 'sophisticated', 'formal', 'classic', 'sapphire', 'jewel', 'gemstone', 'precious', 'cobalt', 'indigo', 'ink'] },
  { color: '#4169e1', tags: ['blue', 'royal', 'bright', 'vibrant', 'rich', 'elegant', 'sophisticated', 'regal', 'noble', 'majestic', 'sapphire', 'jewel', 'gemstone', 'precious', 'formal', 'classic', 'traditional', 'bold', 'strong', 'powerful'] },
  { color: '#1e90ff', tags: ['blue', 'bright', 'sky', 'dodger', 'electric', 'vibrant', 'bold', 'ocean', 'sea', 'water', 'summer', 'fresh', 'clean', 'modern', 'tech', 'digital', 'sports', 'athletic', 'energetic', 'dynamic'] },
  { color: '#4682b4', tags: ['blue', 'steel', 'gray', 'muted', 'dusty', 'soft', 'calm', 'serene', 'peaceful', 'cool', 'professional', 'corporate', 'business', 'formal', 'classic', 'sophisticated', 'elegant', 'neutral', 'industrial', 'metal'] },
  { color: '#6495ed', tags: ['blue', 'cornflower', 'medium', 'soft', 'gentle', 'calm', 'serene', 'peaceful', 'sky', 'spring', 'summer', 'fresh', 'clean', 'romantic', 'pretty', 'feminine', 'delicate', 'flower', 'petal', 'garden'] },
  { color: '#87ceeb', tags: ['blue', 'sky', 'light', 'pale', 'soft', 'gentle', 'calm', 'serene', 'peaceful', 'fresh', 'clean', 'summer', 'spring', 'baby', 'pastel', 'sweet', 'delicate', 'feminine', 'dreamy', 'cloud'] },
  { color: '#add8e6', tags: ['blue', 'light', 'pale', 'soft', 'gentle', 'calm', 'baby', 'pastel', 'powder', 'sky', 'cloud', 'ice', 'snow', 'winter', 'fresh', 'clean', 'pure', 'delicate', 'feminine', 'sweet'] },
  { color: '#b0c4de', tags: ['blue', 'steel', 'light', 'pale', 'gray', 'muted', 'soft', 'gentle', 'calm', 'cool', 'professional', 'corporate', 'business', 'formal', 'classic', 'sophisticated', 'elegant', 'neutral', 'subtle', 'understated'] },

  // Purples & Violets
  { color: '#1a001a', tags: ['purple', 'dark', 'black', 'night', 'shadow', 'deep', 'rich', 'mysterious', 'gothic', 'vampire', 'witch', 'magic', 'mystic', 'cosmic', 'space', 'galaxy', 'void', 'eggplant', 'plum', 'grape'] },
  { color: '#330033', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'gothic', 'vampire', 'witch', 'magic', 'mystic', 'cosmic', 'space', 'galaxy', 'eggplant', 'plum', 'grape', 'wine', 'royal', 'regal', 'elegant'] },
  { color: '#4d004d', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'gothic', 'magic', 'mystic', 'cosmic', 'eggplant', 'plum', 'grape', 'wine', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'velvet', 'jewel'] },
  { color: '#660066', tags: ['purple', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'eggplant', 'plum', 'grape', 'wine', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'velvet', 'jewel', 'amethyst'] },
  { color: '#800080', tags: ['purple', 'magenta', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'rich', 'deep', 'grape', 'plum', 'wine', 'berry', 'jewel', 'amethyst', 'velvet', 'noble', 'majestic', 'imperial', 'exotic'] },
  { color: '#990099', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'royal', 'regal', 'elegant', 'luxury', 'grape', 'plum', 'berry', 'jewel', 'amethyst', 'exotic', 'tropical', 'dramatic', 'intense', 'powerful'] },
  { color: '#b300b3', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'neon', 'grape', 'berry', 'orchid', 'flower', 'petal', 'exotic', 'tropical', 'dramatic', 'intense', 'powerful', 'energetic', 'fun', 'party'] },
  { color: '#cc00cc', tags: ['purple', 'magenta', 'bright', 'vibrant', 'bold', 'electric', 'neon', 'hot', 'grape', 'berry', 'orchid', 'flower', 'exotic', 'tropical', 'dramatic', 'intense', 'powerful', 'energetic', 'fun', 'party'] },
  { color: '#ff00ff', tags: ['magenta', 'pink', 'purple', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'hot', 'fuchsia', 'orchid', 'flower', 'exotic', 'tropical', 'dramatic', 'intense', 'powerful', 'energetic', 'fun', 'party'] },
  { color: '#ff33ff', tags: ['magenta', 'pink', 'purple', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'hot', 'fuchsia', 'orchid', 'flower', 'exotic', 'tropical', 'dramatic', 'intense', 'light', 'pale', 'soft', 'gentle'] },
  { color: '#ff66ff', tags: ['magenta', 'pink', 'purple', 'light', 'bright', 'vibrant', 'soft', 'gentle', 'fuchsia', 'orchid', 'flower', 'petal', 'romantic', 'feminine', 'pretty', 'sweet', 'candy', 'bubblegum', 'fun', 'playful'] },
  { color: '#ff99ff', tags: ['pink', 'purple', 'magenta', 'light', 'pale', 'soft', 'gentle', 'pastel', 'orchid', 'flower', 'petal', 'romantic', 'feminine', 'pretty', 'sweet', 'candy', 'bubblegum', 'baby', 'delicate', 'dreamy'] },
  { color: '#ffccff', tags: ['pink', 'purple', 'pale', 'light', 'pastel', 'soft', 'gentle', 'romantic', 'feminine', 'pretty', 'sweet', 'candy', 'bubblegum', 'baby', 'delicate', 'dreamy', 'subtle', 'minimal', 'clean', 'pure'] },
  { color: '#4b0082', tags: ['purple', 'indigo', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'space', 'galaxy', 'night', 'twilight', 'jewel', 'amethyst', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury'] },
  { color: '#6a0dad', tags: ['purple', 'violet', 'dark', 'deep', 'rich', 'mysterious', 'magic', 'mystic', 'cosmic', 'grape', 'plum', 'berry', 'jewel', 'amethyst', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'velvet'] },
  { color: '#8b008b', tags: ['purple', 'magenta', 'dark', 'deep', 'rich', 'grape', 'plum', 'berry', 'orchid', 'flower', 'jewel', 'amethyst', 'royal', 'regal', 'elegant', 'sophisticated', 'luxury', 'exotic', 'tropical', 'bold'] },
  { color: '#9400d3', tags: ['purple', 'violet', 'bright', 'vibrant', 'bold', 'electric', 'grape', 'plum', 'berry', 'orchid', 'flower', 'jewel', 'amethyst', 'royal', 'regal', 'exotic', 'tropical', 'dramatic', 'intense', 'powerful'] },
  { color: '#9932cc', tags: ['purple', 'orchid', 'violet', 'bright', 'vibrant', 'bold', 'grape', 'plum', 'berry', 'flower', 'petal', 'jewel', 'amethyst', 'exotic', 'tropical', 'romantic', 'feminine', 'pretty', 'elegant', 'sophisticated'] },
  { color: '#ba55d3', tags: ['purple', 'orchid', 'violet', 'medium', 'soft', 'gentle', 'grape', 'plum', 'berry', 'flower', 'petal', 'romantic', 'feminine', 'pretty', 'sweet', 'elegant', 'sophisticated', 'spring', 'garden', 'bloom'] },
  { color: '#800020', tags: ['purple', 'red', 'burgundy', 'wine', 'maroon', 'dark', 'deep', 'rich', 'grape', 'berry', 'cherry', 'plum', 'velvet', 'elegant', 'sophisticated', 'luxury', 'formal', 'classic', 'vintage', 'antique'] },
  { color: '#722f37', tags: ['purple', 'red', 'wine', 'burgundy', 'maroon', 'dark', 'deep', 'rich', 'grape', 'berry', 'cherry', 'plum', 'velvet', 'elegant', 'sophisticated', 'luxury', 'formal', 'vintage', 'antique', 'romantic'] },
  { color: '#5d3954', tags: ['purple', 'brown', 'mauve', 'dusty', 'muted', 'soft', 'vintage', 'antique', 'romantic', 'feminine', 'elegant', 'sophisticated', 'subtle', 'understated', 'grape', 'plum', 'berry', 'wine', 'velvet', 'faded'] },
  { color: '#673147', tags: ['purple', 'red', 'wine', 'burgundy', 'mauve', 'dusty', 'muted', 'vintage', 'antique', 'romantic', 'feminine', 'elegant', 'sophisticated', 'subtle', 'grape', 'plum', 'berry', 'velvet', 'rose', 'faded'] },

  // Pinks & Rose
  { color: '#330019', tags: ['pink', 'dark', 'deep', 'rich', 'wine', 'burgundy', 'maroon', 'berry', 'cherry', 'plum', 'magenta', 'fuchsia', 'romantic', 'passionate', 'dramatic', 'intense', 'mysterious', 'gothic', 'velvet', 'rose'] },
  { color: '#660033', tags: ['pink', 'dark', 'deep', 'rich', 'wine', 'burgundy', 'berry', 'cherry', 'plum', 'magenta', 'fuchsia', 'romantic', 'passionate', 'dramatic', 'intense', 'elegant', 'sophisticated', 'luxury', 'velvet', 'rose'] },
  { color: '#99004d', tags: ['pink', 'magenta', 'deep', 'rich', 'berry', 'cherry', 'raspberry', 'plum', 'fuchsia', 'hot', 'romantic', 'passionate', 'dramatic', 'intense', 'bold', 'vibrant', 'exotic', 'tropical', 'flower', 'orchid'] },
  { color: '#cc0066', tags: ['pink', 'magenta', 'hot', 'bright', 'vibrant', 'bold', 'fuchsia', 'berry', 'raspberry', 'cherry', 'romantic', 'passionate', 'dramatic', 'intense', 'electric', 'neon', 'exotic', 'tropical', 'flower', 'orchid'] },
  { color: '#ff0080', tags: ['pink', 'magenta', 'hot', 'bright', 'neon', 'electric', 'vibrant', 'bold', 'fuchsia', 'berry', 'raspberry', 'romantic', 'passionate', 'dramatic', 'intense', 'fun', 'party', 'exotic', 'tropical', 'flower'] },
  { color: '#ff3399', tags: ['pink', 'hot', 'bright', 'vibrant', 'bold', 'magenta', 'fuchsia', 'berry', 'raspberry', 'bubblegum', 'candy', 'fun', 'party', 'playful', 'energetic', 'youthful', 'girly', 'feminine', 'romantic', 'flower'] },
  { color: '#ff66b3', tags: ['pink', 'bright', 'vibrant', 'soft', 'gentle', 'magenta', 'fuchsia', 'berry', 'raspberry', 'bubblegum', 'candy', 'sweet', 'fun', 'playful', 'youthful', 'girly', 'feminine', 'romantic', 'flower', 'petal'] },
  { color: '#ff99cc', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic', 'feminine', 'pretty', 'sweet', 'candy', 'bubblegum', 'baby', 'delicate', 'dreamy', 'subtle', 'lovely'] },
  { color: '#ffcce6', tags: ['pink', 'pale', 'light', 'pastel', 'soft', 'gentle', 'rose', 'blush', 'petal', 'flower', 'romantic', 'feminine', 'pretty', 'sweet', 'baby', 'delicate', 'dreamy', 'subtle', 'minimal', 'clean'] },
  { color: '#c71585', tags: ['pink', 'magenta', 'violet', 'deep', 'rich', 'berry', 'raspberry', 'plum', 'orchid', 'flower', 'romantic', 'passionate', 'dramatic', 'bold', 'vibrant', 'exotic', 'tropical', 'elegant', 'sophisticated', 'jewel'] },
  { color: '#db7093', tags: ['pink', 'rose', 'dusty', 'muted', 'soft', 'gentle', 'romantic', 'feminine', 'pretty', 'vintage', 'antique', 'faded', 'elegant', 'sophisticated', 'subtle', 'understated', 'flower', 'petal', 'bloom', 'garden'] },
  { color: '#ff69b4', tags: ['pink', 'hot', 'bright', 'vibrant', 'bold', 'bubblegum', 'candy', 'sweet', 'fun', 'playful', 'youthful', 'girly', 'feminine', 'romantic', 'flower', 'petal', 'spring', 'summer', 'cheerful', 'happy'] },
  { color: '#ffb6c1', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic', 'feminine', 'pretty', 'sweet', 'baby', 'delicate', 'dreamy', 'subtle', 'lovely', 'spring', 'cherry'] },
  { color: '#ffc0cb', tags: ['pink', 'light', 'soft', 'gentle', 'pastel', 'rose', 'blush', 'petal', 'flower', 'romantic', 'feminine', 'pretty', 'sweet', 'baby', 'delicate', 'classic', 'traditional', 'lovely', 'valentine', 'love'] },
  { color: '#e75480', tags: ['pink', 'rose', 'medium', 'soft', 'gentle', 'romantic', 'feminine', 'pretty', 'flower', 'petal', 'bloom', 'garden', 'spring', 'summer', 'sweet', 'lovely', 'elegant', 'sophisticated', 'vintage', 'antique'] },
  { color: '#f08080', tags: ['pink', 'coral', 'salmon', 'peach', 'soft', 'warm', 'gentle', 'muted', 'dusty', 'romantic', 'feminine', 'vintage', 'antique', 'faded', 'subtle', 'understated', 'natural', 'organic', 'earth', 'skin'] },
  { color: '#fa8072', tags: ['pink', 'coral', 'salmon', 'peach', 'orange', 'soft', 'warm', 'gentle', 'tropical', 'beach', 'summer', 'sunset', 'romantic', 'feminine', 'pretty', 'fresh', 'natural', 'organic', 'fish', 'seafood'] },
  { color: '#e9967a', tags: ['pink', 'coral', 'salmon', 'peach', 'orange', 'soft', 'warm', 'gentle', 'muted', 'dusty', 'tropical', 'beach', 'summer', 'romantic', 'feminine', 'vintage', 'antique', 'natural', 'organic', 'earth'] },

  // Skin Tones
  { color: '#8d5524', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'cinnamon', 'spice', 'caramel', 'toffee', 'leather'] },
  { color: '#a0522d', tags: ['brown', 'skin', 'tan', 'sienna', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'cinnamon', 'spice', 'clay', 'terracotta'] },
  { color: '#b5651d', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'caramel', 'toffee', 'honey', 'amber', 'golden'] },
  { color: '#c68642', tags: ['brown', 'skin', 'tan', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'caramel', 'toffee', 'honey', 'golden', 'bronze'] },
  { color: '#d2a679', tags: ['brown', 'skin', 'tan', 'beige', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'sand', 'nude', 'neutral', 'soft'] },
  { color: '#e0ac69', tags: ['brown', 'skin', 'tan', 'beige', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'sand', 'nude', 'neutral', 'golden'] },
  { color: '#f1c27d', tags: ['skin', 'tan', 'beige', 'cream', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'sand', 'nude', 'neutral', 'light'] },
  { color: '#ffcd94', tags: ['skin', 'tan', 'beige', 'cream', 'peach', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'nude', 'neutral', 'light'] },
  { color: '#ffdbac', tags: ['skin', 'beige', 'cream', 'peach', 'light', 'pale', 'warm', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'nude', 'neutral', 'soft'] },
  { color: '#ffe4c4', tags: ['skin', 'beige', 'cream', 'peach', 'light', 'pale', 'warm', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'bisque', 'nude', 'neutral', 'soft', 'gentle', 'delicate'] },
  { color: '#ffecd9', tags: ['skin', 'cream', 'peach', 'ivory', 'light', 'pale', 'warm', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'nude', 'neutral', 'soft', 'gentle', 'delicate', 'pure'] },
  { color: '#fff5eb', tags: ['skin', 'cream', 'ivory', 'white', 'light', 'pale', 'warm', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'nude', 'neutral', 'soft', 'gentle', 'delicate', 'pure'] },
  { color: '#4a2c2a', tags: ['brown', 'dark', 'skin', 'chocolate', 'coffee', 'espresso', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'rich', 'deep'] },
  { color: '#6b4423', tags: ['brown', 'skin', 'chocolate', 'coffee', 'warm', 'earth', 'natural', 'organic', 'human', 'flesh', 'body', 'face', 'portrait', 'ethnic', 'diverse', 'inclusive', 'rich', 'deep', 'wood', 'bark'] },

  // Metallics & Stone
  { color: '#2f4f4f', tags: ['gray', 'dark', 'slate', 'stone', 'rock', 'metal', 'steel', 'iron', 'charcoal', 'graphite', 'industrial', 'urban', 'modern', 'cool', 'cold', 'professional', 'corporate', 'formal', 'serious', 'strong'] },
  { color: '#36454f', tags: ['gray', 'dark', 'charcoal', 'slate', 'stone', 'rock', 'metal', 'steel', 'iron', 'graphite', 'industrial', 'urban', 'modern', 'cool', 'cold', 'professional', 'corporate', 'formal', 'serious', 'strong'] },
  { color: '#4a4a4a', tags: ['gray', 'dark', 'charcoal', 'stone', 'rock', 'metal', 'steel', 'iron', 'graphite', 'industrial', 'urban', 'modern', 'neutral', 'professional', 'corporate', 'formal', 'serious', 'strong', 'solid', 'stable'] },
  { color: '#696969', tags: ['gray', 'medium', 'stone', 'rock', 'metal', 'steel', 'iron', 'concrete', 'industrial', 'urban', 'modern', 'neutral', 'professional', 'corporate', 'dim', 'muted', 'understated', 'subtle', 'solid', 'stable'] },
  { color: '#708090', tags: ['gray', 'blue', 'slate', 'stone', 'rock', 'metal', 'steel', 'cool', 'cold', 'professional', 'corporate', 'business', 'formal', 'classic', 'sophisticated', 'elegant', 'neutral', 'understated', 'subtle', 'modern'] },
  { color: '#778899', tags: ['gray', 'blue', 'slate', 'stone', 'light', 'pale', 'soft', 'cool', 'cold', 'professional', 'corporate', 'business', 'formal', 'classic', 'sophisticated', 'elegant', 'neutral', 'understated', 'subtle', 'modern'] },
  { color: '#808080', tags: ['gray', 'medium', 'neutral', 'stone', 'rock', 'metal', 'steel', 'concrete', 'industrial', 'urban', 'modern', 'professional', 'corporate', 'balanced', 'stable', 'solid', 'classic', 'timeless', 'universal', 'versatile'] },
  { color: '#a9a9a9', tags: ['gray', 'light', 'silver', 'metal', 'steel', 'stone', 'neutral', 'soft', 'gentle', 'muted', 'understated', 'subtle', 'professional', 'corporate', 'modern', 'clean', 'minimal', 'simple', 'elegant', 'sophisticated'] },
  { color: '#c0c0c0', tags: ['silver', 'gray', 'light', 'metal', 'metallic', 'shiny', 'chrome', 'platinum', 'steel', 'modern', 'tech', 'futuristic', 'sleek', 'clean', 'minimal', 'elegant', 'sophisticated', 'precious', 'valuable', 'luxury'] },
  { color: '#d3d3d3', tags: ['gray', 'light', 'silver', 'pale', 'soft', 'gentle', 'neutral', 'cloud', 'fog', 'mist', 'clean', 'minimal', 'simple', 'subtle', 'understated', 'modern', 'fresh', 'pure', 'delicate', 'airy'] },
  { color: '#ffd700', tags: ['gold', 'yellow', 'metal', 'metallic', 'shiny', 'bright', 'rich', 'luxury', 'royal', 'regal', 'crown', 'treasure', 'coin', 'sun', 'warm', 'precious', 'valuable', 'wealth', 'success', 'winner'] },
  { color: '#daa520', tags: ['gold', 'yellow', 'metal', 'metallic', 'amber', 'honey', 'caramel', 'autumn', 'fall', 'harvest', 'warm', 'rich', 'antique', 'vintage', 'classic', 'traditional', 'earth', 'natural', 'organic', 'mustard'] },
  { color: '#b8860b', tags: ['gold', 'yellow', 'dark', 'metal', 'metallic', 'amber', 'honey', 'caramel', 'autumn', 'fall', 'harvest', 'warm', 'rich', 'deep', 'antique', 'vintage', 'classic', 'earth', 'natural', 'mustard'] },
  { color: '#d4af37', tags: ['gold', 'yellow', 'metal', 'metallic', 'shiny', 'bright', 'rich', 'luxury', 'royal', 'regal', 'antique', 'vintage', 'classic', 'traditional', 'warm', 'precious', 'valuable', 'wealth', 'success', 'elegant'] },
  { color: '#cfb53b', tags: ['gold', 'yellow', 'metal', 'metallic', 'old', 'antique', 'vintage', 'classic', 'traditional', 'warm', 'rich', 'muted', 'dusty', 'faded', 'aged', 'patina', 'brass', 'bronze', 'earth', 'natural'] },
  { color: '#b87333', tags: ['copper', 'orange', 'brown', 'metal', 'metallic', 'shiny', 'warm', 'rich', 'earth', 'natural', 'organic', 'rustic', 'industrial', 'vintage', 'antique', 'penny', 'coin', 'autumn', 'fall', 'harvest'] },
  { color: '#cd7f32', tags: ['bronze', 'copper', 'orange', 'brown', 'metal', 'metallic', 'shiny', 'warm', 'rich', 'earth', 'natural', 'organic', 'rustic', 'industrial', 'vintage', 'antique', 'medal', 'trophy', 'autumn', 'fall'] },
  { color: '#b08d57', tags: ['bronze', 'gold', 'tan', 'brown', 'metal', 'metallic', 'warm', 'muted', 'dusty', 'antique', 'vintage', 'classic', 'traditional', 'earth', 'natural', 'organic', 'rustic', 'aged', 'patina', 'brass'] },
  { color: '#c9ae5d', tags: ['gold', 'bronze', 'tan', 'metal', 'metallic', 'warm', 'muted', 'dusty', 'antique', 'vintage', 'classic', 'traditional', 'earth', 'natural', 'organic', 'rustic', 'aged', 'patina', 'brass', 'harvest'] },
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
