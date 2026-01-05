import { useState, useEffect, type ReactNode } from 'react';
import { FaTimes, FaHome, FaWarehouse, FaTree, FaTools } from 'react-icons/fa';
import { useBuildingStore, useIsMenuOpen } from '@/stores/buildingStore';
import type { BuildingType, BuildingMaterialRequirements } from '@/types/buildings';

// ==========================================
// Building Blueprint Data
// ==========================================

interface BuildingBlueprintInfo {
  id: string;
  name: string;
  emoji: string;
  type: BuildingType;
  description: string;
  category: BuildingCategory;
  materials: BuildingMaterialRequirements;
}

type BuildingCategory = 'shelter' | 'storage' | 'crafting' | 'farming';

const BUILDING_BLUEPRINTS: BuildingBlueprintInfo[] = [
  // Shelter Buildings
  {
    id: 'small-hut',
    name: 'Small Hut',
    emoji: '🏠',
    type: 'roofed',
    description: 'A basic shelter for 1-2 villagers',
    category: 'shelter',
    materials: { wood: 8, rock: 4, metal: 1 },
  },
  {
    id: 'house',
    name: 'House',
    emoji: '🏡',
    type: 'roofed',
    description: 'A comfortable home for a small family',
    category: 'shelter',
    materials: { wood: 15, rock: 8, metal: 2 },
  },
  {
    id: 'large-house',
    name: 'Large House',
    emoji: '🏘️',
    type: 'roofed',
    description: 'A spacious dwelling with multiple rooms',
    category: 'shelter',
    materials: { wood: 25, rock: 15, metal: 4 },
  },
  // Storage Buildings
  {
    id: 'storage-shed',
    name: 'Storage Shed',
    emoji: '📦',
    type: 'roofed',
    description: 'Store materials and goods safely',
    category: 'storage',
    materials: { wood: 12, rock: 4, metal: 2 },
  },
  {
    id: 'granary',
    name: 'Granary',
    emoji: '🌾',
    type: 'roofed',
    description: 'Store food and grain securely',
    category: 'storage',
    materials: { wood: 18, rock: 6, metal: 3 },
  },
  {
    id: 'cold-storage',
    name: 'Cold Storage',
    emoji: '❄️',
    type: 'roofed',
    description: 'Keep perishables fresh longer',
    category: 'storage',
    materials: { wood: 20, rock: 12, metal: 5 },
  },
  // Crafting Buildings
  {
    id: 'workshop',
    name: 'Workshop',
    emoji: '🔨',
    type: 'roofed',
    description: 'Craft tools and equipment faster',
    category: 'crafting',
    materials: { wood: 16, rock: 8, metal: 4 },
  },
  {
    id: 'forge',
    name: 'Forge',
    emoji: '⚒️',
    type: 'roofless',
    description: 'Smelt ores and work metal',
    category: 'crafting',
    materials: { wood: 10, rock: 20, metal: 6 },
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    emoji: '🍳',
    type: 'roofed',
    description: 'Prepare food and meals',
    category: 'crafting',
    materials: { wood: 14, rock: 8, metal: 3 },
  },
  // Farming Buildings
  {
    id: 'farm-plot',
    name: 'Farm Plot',
    emoji: '🌱',
    type: 'roofless',
    description: 'Grow crops and plants',
    category: 'farming',
    materials: { wood: 6, rock: 2, metal: 0 },
  },
  {
    id: 'stable',
    name: 'Stable',
    emoji: '🐴',
    type: 'roofed',
    description: 'House and care for animals',
    category: 'farming',
    materials: { wood: 20, rock: 6, metal: 2 },
  },
  {
    id: 'well',
    name: 'Well',
    emoji: '🪣',
    type: 'roofless',
    description: 'Collect water for the village',
    category: 'farming',
    materials: { wood: 4, rock: 15, metal: 2 },
  },
];

const CATEGORY_INFO: Record<BuildingCategory, { label: string; icon: ReactNode }> = {
  shelter: { label: 'Shelter', icon: <FaHome /> },
  storage: { label: 'Storage', icon: <FaWarehouse /> },
  crafting: { label: 'Crafting', icon: <FaTools /> },
  farming: { label: 'Farming', icon: <FaTree /> },
};

// ==========================================
// Building Menu Component
// ==========================================

export function BuildingMenu() {
  const [selectedCategory, setSelectedCategory] = useState<BuildingCategory | 'all'>('all');
  const isOpen = useIsMenuOpen();
  const { startPlacement, closeMenu, toggleMenu } = useBuildingStore();

  // Handle keyboard shortcut to toggle menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 'B' key toggles building menu (when not typing in an input)
      if (e.key.toLowerCase() === 'b' && !isInputFocused()) {
        e.preventDefault();
        toggleMenu();
      }
      // ESC closes the menu
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleMenu, closeMenu]);

  const handleSelectBuilding = (blueprintId: string) => {
    startPlacement(blueprintId);
    // Menu will auto-close via store's startPlacement action
  };

  const filteredBlueprints =
    selectedCategory === 'all'
      ? BUILDING_BLUEPRINTS
      : BUILDING_BLUEPRINTS.filter((b) => b.category === selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="building-menu-overlay" onClick={closeMenu}>
      <div className="building-menu-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="building-menu-header">
          <h2>Build Structure</h2>
          <button className="close-btn" onClick={closeMenu}>
            <FaTimes />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="building-category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'all' ? 'selected' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {(Object.keys(CATEGORY_INFO) as BuildingCategory[]).map((category) => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'selected' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {CATEGORY_INFO[category].icon}
              <span>{CATEGORY_INFO[category].label}</span>
            </button>
          ))}
        </div>

        {/* Building Grid */}
        <div className="building-grid">
          {filteredBlueprints.map((blueprint) => (
            <div
              key={blueprint.id}
              className="building-card"
              onClick={() => handleSelectBuilding(blueprint.id)}
            >
              <div className="building-card-header">
                <span className="building-emoji">{blueprint.emoji}</span>
                <div className="building-info">
                  <span className="building-name">{blueprint.name}</span>
                  <span className={`building-type ${blueprint.type}`}>
                    {blueprint.type === 'roofed' ? 'Roofed' : 'Open'}
                  </span>
                </div>
              </div>
              <p className="building-description">{blueprint.description}</p>
              <div className="building-materials">
                {blueprint.materials.wood > 0 && (
                  <span className="material-cost">
                    <span className="material-icon">🪵</span>
                    {blueprint.materials.wood}
                  </span>
                )}
                {blueprint.materials.rock > 0 && (
                  <span className="material-cost">
                    <span className="material-icon">🪨</span>
                    {blueprint.materials.rock}
                  </span>
                )}
                {blueprint.materials.metal > 0 && (
                  <span className="material-cost">
                    <span className="material-icon">⚙️</span>
                    {blueprint.materials.metal}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="building-menu-footer">
          <span>Click a building to place it. Press B to toggle this menu.</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Helper Functions
// ==========================================

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement?.getAttribute('contenteditable') === 'true'
  );
}

