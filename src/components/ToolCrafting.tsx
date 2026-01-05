import { useToolsStore } from '@/stores/toolsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import {
  TOOL_FUNCTIONS,
  HANDLE_MATERIALS,
  WORKING_PART_MATERIALS,
  BINDER_MATERIALS,
  MATERIAL_SUITABILITY,
  getMaterialCategory,
} from '@/types/tools';
import { FaTimes } from 'react-icons/fa';

export function ToolCrafting() {
  const {
    isCraftingOpen,
    closeCrafting,
    selectedHandle,
    selectedWorkingPart,
    selectedBinder,
    selectedSize,
    functionPoints,
    selectHandle,
    selectWorkingPart,
    selectBinder,
    setSize,
    setFunctionPoints,
    canCraft,
    craftTool,
    getMaxPoints,
    getTotalPoints,
  } = useToolsStore();

  const slots = useInventoryStore(s => s.inventory.slots);
  const resources = useDefinitionsStore(s => s.resources);

  if (!isCraftingOpen) return null;

  // Get available materials from inventory by category (consolidate same resourceId)
  const getAvailableMaterials = (allowedCategories: readonly string[]) => {
    const materialsMap = new Map<string, { resourceId: string; name: string; emoji?: string; quantity: number }>();

    for (const slot of slots) {
      if (!slot.itemId || slot.quantity < 1) continue;

      const resource = resources.find(r => r.id === slot.itemId);
      if (!resource) continue;

      const category = getMaterialCategory(slot.itemId);
      if (allowedCategories.includes(category)) {
        const existing = materialsMap.get(slot.itemId);
        if (existing) {
          existing.quantity += slot.quantity;
        } else {
          materialsMap.set(slot.itemId, {
            resourceId: slot.itemId,
            name: resource.name,
            emoji: resource.emoji,
            quantity: slot.quantity,
          });
        }
      }
    }

    return Array.from(materialsMap.values());
  };

  const handleMaterials = getAvailableMaterials(HANDLE_MATERIALS);
  const workingPartMaterials = getAvailableMaterials(WORKING_PART_MATERIALS);
  const binderMaterials = getAvailableMaterials(BINDER_MATERIALS);

  const maxPoints = getMaxPoints();
  const totalPoints = getTotalPoints();
  const validation = canCraft();

  // Get material suitability for preview
  const workingPartCategory = selectedWorkingPart ? getMaterialCategory(selectedWorkingPart) : null;
  const suitability = workingPartCategory ? MATERIAL_SUITABILITY[workingPartCategory] : null;

  return (
    <div className="tool-crafting-overlay" onClick={closeCrafting}>
      <div className="tool-crafting-panel" onClick={e => e.stopPropagation()}>
        <div className="tool-crafting-header">
          <h2>🛠️ Craft Tool</h2>
          <button className="close-btn" onClick={closeCrafting}>
            <FaTimes />
          </button>
        </div>

        <div className="tool-crafting-content">
          {/* Material Selection */}
          <div className="material-section">
            <h3>Components</h3>

            <div className="material-row">
              <label>Handle:</label>
              <div className="material-options">
                {handleMaterials.length === 0 ? (
                  <span className="no-materials">No wood/bone/bamboo</span>
                ) : (
                  handleMaterials.map(m => (
                    <button
                      key={m.resourceId}
                      className={`material-btn ${selectedHandle === m.resourceId ? 'selected' : ''}`}
                      onClick={() => selectHandle(m.resourceId)}
                    >
                      {m.emoji || '📦'} {m.name} ({m.quantity})
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="material-row">
              <label>Working Part:</label>
              <div className="material-options">
                {workingPartMaterials.length === 0 ? (
                  <span className="no-materials">No stone/bone/metal</span>
                ) : (
                  workingPartMaterials.map(m => (
                    <button
                      key={m.resourceId}
                      className={`material-btn ${selectedWorkingPart === m.resourceId ? 'selected' : ''}`}
                      onClick={() => selectWorkingPart(m.resourceId)}
                    >
                      {m.emoji || '📦'} {m.name} ({m.quantity})
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="material-row">
              <label>Binder:</label>
              <div className="material-options">
                {binderMaterials.length === 0 ? (
                  <span className="no-materials">No fiber/hide/metal</span>
                ) : (
                  binderMaterials.map(m => (
                    <button
                      key={m.resourceId}
                      className={`material-btn ${selectedBinder === m.resourceId ? 'selected' : ''}`}
                      onClick={() => selectBinder(m.resourceId)}
                    >
                      {m.emoji || '📦'} {m.name} ({m.quantity})
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Size Selection */}
          <div className="size-section">
            <h3>Size</h3>
            <div className="size-options">
              <button
                className={`size-btn ${selectedSize === 'short' ? 'selected' : ''}`}
                onClick={() => setSize('short')}
              >
                Short (One-handed)
              </button>
              <button
                className={`size-btn ${selectedSize === 'long' ? 'selected' : ''}`}
                onClick={() => setSize('long')}
              >
                Long (Two-handed)
              </button>
            </div>
          </div>

          {/* Function Points */}
          <div className="function-section">
            <h3>Function Points ({totalPoints}/{maxPoints})</h3>
            <div className="function-grid">
              {TOOL_FUNCTIONS.map(func => (
                <div key={func} className="function-row">
                  <label>{func.charAt(0).toUpperCase() + func.slice(1)}</label>
                  <input
                    type="range"
                    min="0"
                    max={maxPoints}
                    value={functionPoints[func]}
                    onChange={e => setFunctionPoints(func, parseInt(e.target.value))}
                    disabled={!selectedWorkingPart}
                  />
                  <span className="function-value">{functionPoints[func]}</span>
                  {suitability && functionPoints[func] > 0 && (
                    <span className="function-effectiveness">
                      ×{suitability[func].toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {selectedWorkingPart && totalPoints > 0 && (
            <div className="preview-section">
              <h3>Preview</h3>
              <div className="preview-stats">
                {TOOL_FUNCTIONS.filter(f => functionPoints[f] > 0).map(func => {
                  const points = functionPoints[func];
                  const mult = suitability?.[func] ?? 1;
                  const effective = Math.round(points * mult * 10) / 10;
                  return (
                    <div key={func} className="preview-stat">
                      <span>{func}</span>
                      <span className="effective-power">{effective}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Craft Button */}
          <div className="craft-section">
            <button
              className="craft-tool-btn"
              onClick={craftTool}
              disabled={!validation.valid}
            >
              {validation.valid ? 'Craft Tool' : validation.error}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
