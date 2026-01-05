import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlus, FaMinus, FaUser, FaTrash, FaHammer } from 'react-icons/fa';
import { useBuildingStore, type PlacedBuilding } from '@/stores/buildingStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useVillagerStore, useRecruitedVillagers } from '@/stores/villagerStore';
import type { BuildingMaterialRequirements, ConstructionPhase } from '@/types/buildings';

// ==========================================
// Material Display Info
// ==========================================

const MATERIAL_INFO: Record<keyof BuildingMaterialRequirements, { emoji: string; name: string }> = {
  wood: { emoji: '🪵', name: 'Wood' },
  rock: { emoji: '🪨', name: 'Rock' },
  metal: { emoji: '⚙️', name: 'Metal' },
  branches: { emoji: '🌿', name: 'Branches' },
  brick: { emoji: '🧱', name: 'Brick' },
};

const PHASE_INFO: Record<ConstructionPhase, { label: string; color: string }> = {
  blueprint: { label: 'Blueprint', color: '#60a5fa' },
  gathering: { label: 'Gathering Materials', color: '#fbbf24' },
  building: { label: 'Under Construction', color: '#f97316' },
  complete: { label: 'Complete', color: '#22c55e' },
};

// ==========================================
// Construction Panel Component
// ==========================================

interface ConstructionPanelProps {
  buildingId: string | null;
  onClose: () => void;
}

export function ConstructionPanel({ buildingId, onClose }: ConstructionPanelProps) {
  const { placedBuildings, addMaterial, assignWorker, unassignWorker, removeBuilding, updateConstructionProgress, completeConstruction } = useBuildingStore();
  const { inventory, removeItems } = useInventoryStore();
  const { getVillager } = useVillagerStore();
  const recruitedVillagers = useRecruitedVillagers();

  const [showWorkerList, setShowWorkerList] = useState(false);

  const building = buildingId ? placedBuildings[buildingId] : null;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get inventory count for a material
  const getInventoryCount = useCallback((materialId: string): number => {
    return inventory.slots
      .filter(slot => slot.itemId === materialId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
  }, [inventory.slots]);

  // Handle adding material to building
  const handleAddMaterial = useCallback((materialId: keyof BuildingMaterialRequirements) => {
    if (!building) return;

    const inventoryCount = getInventoryCount(materialId);
    if (inventoryCount <= 0) {
      console.log(`[Construction] No ${materialId} in inventory`);
      return;
    }

    const currentAssigned = building.assignedMaterials[materialId] ?? 0;
    const required = building.requiredMaterials[materialId] ?? 0;
    const canAdd = Math.min(1, required - currentAssigned, inventoryCount);

    if (canAdd <= 0) {
      console.log(`[Construction] Already have enough ${materialId}`);
      return;
    }

    // Remove from inventory first
    const slots = inventory.slots;
    const slotIndex = slots.findIndex(s => s.itemId === materialId && s.quantity > 0);
    if (slotIndex === -1) return;

    // Remove 1 from inventory
    const removed = removeItems([{ itemId: materialId, quantity: 1 }]);
    if (!removed) {
      console.log(`[Construction] Failed to remove ${materialId} from inventory`);
      return;
    }

    // Add to building
    const added = addMaterial(building.id, materialId, 1);
    if (!added) {
      console.log(`[Construction] Failed to add ${materialId} to building, rolling back inventory`);
      // M-1: Rollback - return item to inventory if addMaterial fails
      const { addItem } = useInventoryStore.getState();
      addItem(materialId, 1);
    }
  }, [building, getInventoryCount, inventory.slots, removeItems, addMaterial]);

  // Handle removing material from building (returns to inventory)
  const handleRemoveMaterial = useCallback((e: React.MouseEvent, materialId: keyof BuildingMaterialRequirements) => {
    e.preventDefault(); // Prevent context menu on right-click
    if (!building) return;

    const currentAssigned = building.assignedMaterials[materialId] ?? 0;
    if (currentAssigned <= 0) return;

    // For now, removing materials is not supported once assigned
    // This could be implemented by adding an "unassignMaterial" action to buildingStore
    console.log(`[Construction] Material removal not yet implemented`);
  }, [building]);

  // Handle assigning a worker
  const handleAssignWorker = useCallback((villagerId: string) => {
    if (!building) return;
    assignWorker(building.id, villagerId);
    setShowWorkerList(false);
  }, [building, assignWorker]);

  // Handle unassigning a worker
  const handleUnassignWorker = useCallback((villagerId: string) => {
    if (!building) return;
    unassignWorker(building.id, villagerId);
  }, [building, unassignWorker]);

  // Handle cancelling construction
  const handleCancelConstruction = useCallback(() => {
    if (!building) return;

    // TODO: Return materials to inventory before removing
    // For now, just remove the building
    // L-1: TODO - Replace native confirm() with a custom modal component for better UX and security.
    // Native confirm() can be spoofed and doesn't match the game's visual style.
    if (confirm('Are you sure you want to cancel this construction? Materials will be lost.')) {
      removeBuilding(building.id);
      onClose();
    }
  }, [building, removeBuilding, onClose]);

  // Simulate construction progress (for testing)
  const handleSimulateProgress = useCallback(() => {
    if (!building || building.constructionPhase !== 'building') return;

    const newProgress = Math.min(1, building.constructionProgress + 0.25);
    updateConstructionProgress(building.id, newProgress);

    if (newProgress >= 1) {
      completeConstruction(building.id);
    }
  }, [building, updateConstructionProgress, completeConstruction]);

  // Calculate overall progress percentage
  const calculateProgress = useCallback((b: PlacedBuilding): number => {
    if (b.constructionPhase === 'complete') return 100;
    if (b.constructionPhase === 'blueprint') return 0;

    // Materials progress (50% of total)
    const materialKeys = Object.keys(b.requiredMaterials) as (keyof BuildingMaterialRequirements)[];
    const totalRequired = materialKeys.reduce((sum, key) => sum + (b.requiredMaterials[key] ?? 0), 0);
    const totalAssigned = materialKeys.reduce((sum, key) => sum + (b.assignedMaterials[key] ?? 0), 0);
    const materialsProgress = totalRequired > 0 ? (totalAssigned / totalRequired) * 50 : 0;

    // Construction progress (other 50%)
    const constructionProgress = b.constructionProgress * 50;

    return Math.round(materialsProgress + constructionProgress);
  }, []);

  // Get available workers (recruited villagers not assigned to this building)
  const getAvailableWorkers = useCallback(() => {
    if (!building) return [];
    return recruitedVillagers.filter(v => !building.assignedWorkers.includes(v.id));
  }, [building, recruitedVillagers]);

  if (!building) return null;

  const phaseInfo = PHASE_INFO[building.constructionPhase];
  const progress = calculateProgress(building);
  const availableWorkers = getAvailableWorkers();

  return (
    <div className="construction-panel-overlay" onClick={onClose}>
      <div className="construction-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="construction-panel-header">
          <div className="construction-title">
            <FaHammer className="construction-icon" />
            <div>
              <h2>{building.name}</h2>
              <span className="building-type-badge" style={{ background: `${phaseInfo.color}33`, color: phaseInfo.color }}>
                {building.type === 'roofed' ? 'Roofed' : 'Open'} Structure
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Phase indicator */}
        <div className="construction-phase" style={{ borderColor: phaseInfo.color }}>
          <span className="phase-dot" style={{ background: phaseInfo.color }} />
          <span className="phase-label">{phaseInfo.label}</span>
        </div>

        {/* Progress bar */}
        <div className="construction-progress-section">
          <div className="progress-header">
            <span>Construction Progress</span>
            <span className="progress-percent">{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress}%`,
                background: phaseInfo.color
              }}
            />
          </div>
        </div>

        {/* Material requirements */}
        <div className="construction-materials-section">
          <h3>Materials Required</h3>
          <div className="materials-grid">
            {(Object.keys(building.requiredMaterials) as (keyof BuildingMaterialRequirements)[]).map((materialId) => {
              const required = building.requiredMaterials[materialId] ?? 0;
              if (required === 0) return null;

              const assigned = building.assignedMaterials[materialId] ?? 0;
              const inInventory = getInventoryCount(materialId);
              const isFulfilled = assigned >= required;
              const canAdd = !isFulfilled && inInventory > 0 && building.constructionPhase !== 'complete';

              return (
                <div
                  key={materialId}
                  className={`material-slot ${isFulfilled ? 'fulfilled' : ''} ${canAdd ? 'can-add' : ''}`}
                  onClick={() => canAdd && handleAddMaterial(materialId)}
                  onContextMenu={(e) => handleRemoveMaterial(e, materialId)}
                >
                  <span className="material-emoji">{MATERIAL_INFO[materialId]?.emoji || '?'}</span>
                  <div className="material-info">
                    <span className="material-name">{MATERIAL_INFO[materialId]?.name || materialId}</span>
                    <span className={`material-count ${isFulfilled ? 'complete' : ''}`}>
                      {assigned} / {required}
                    </span>
                  </div>
                  <div className="material-inventory">
                    <span className="inventory-label">In bag:</span>
                    <span className="inventory-count">{inInventory}</span>
                  </div>
                  {canAdd && (
                    <button className="material-add-btn">
                      <FaPlus />
                    </button>
                  )}
                  {isFulfilled && (
                    <span className="material-check">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workers section */}
        <div className="construction-workers-section">
          <div className="workers-header">
            <h3>Assigned Workers ({building.assignedWorkers.length})</h3>
            <button
              className="assign-worker-btn"
              onClick={() => setShowWorkerList(!showWorkerList)}
              disabled={building.constructionPhase === 'complete' || availableWorkers.length === 0}
            >
              <FaPlus /> Assign
            </button>
          </div>

          {/* Assigned workers list */}
          <div className="workers-list">
            {building.assignedWorkers.length === 0 ? (
              <p className="no-workers">No workers assigned</p>
            ) : (
              building.assignedWorkers.map((workerId) => {
                const villager = getVillager(workerId);
                return (
                  <div key={workerId} className="worker-item">
                    <FaUser className="worker-icon" />
                    <span className="worker-name">{villager?.name || 'Unknown'}</span>
                    <button
                      className="unassign-btn"
                      onClick={() => handleUnassignWorker(workerId)}
                    >
                      <FaMinus />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Available workers dropdown */}
          {showWorkerList && availableWorkers.length > 0 && (
            <div className="worker-dropdown">
              {availableWorkers.map((villager) => (
                <button
                  key={villager.id}
                  className="worker-option"
                  onClick={() => handleAssignWorker(villager.id)}
                >
                  <FaUser />
                  <span>{villager.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="construction-actions">
          {building.constructionPhase === 'building' && (
            <button className="action-btn simulate" onClick={handleSimulateProgress}>
              <FaHammer /> Simulate Progress (+25%)
            </button>
          )}
          {building.constructionPhase !== 'complete' && (
            <button className="action-btn cancel" onClick={handleCancelConstruction}>
              <FaTrash /> Cancel Construction
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="construction-footer">
          <span>Click materials to assign from inventory</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Standalone trigger component for selecting buildings
// ==========================================

export function ConstructionPanelTrigger() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const buildingsUnderConstruction = useBuildingStore((state) =>
    Object.values(state.placedBuildings).filter(b => b.constructionPhase !== 'complete')
  );
  const allBuildings = useBuildingStore((state) => Object.values(state.placedBuildings));

  // Handle C key to toggle construction panel for first building
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !isInputFocused()) {
        if (selectedBuildingId) {
          setSelectedBuildingId(null);
        } else if (buildingsUnderConstruction.length > 0) {
          setSelectedBuildingId(buildingsUnderConstruction[0].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBuildingId, buildingsUnderConstruction]);

  // Listen for building clicks from Phaser scene
  useEffect(() => {
    const handleBuildingSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ buildingId: string }>;
      const { buildingId } = customEvent.detail;

      // Verify the building still exists
      const buildingExists = allBuildings.some(b => b.id === buildingId);
      if (buildingExists) {
        setSelectedBuildingId(buildingId);
        console.log(`[ConstructionPanel] Building selected via click: ${buildingId}`);
      }
    };

    window.addEventListener('building-selected', handleBuildingSelected);
    return () => window.removeEventListener('building-selected', handleBuildingSelected);
  }, [allBuildings]);

  if (!selectedBuildingId) return null;

  return (
    <ConstructionPanel
      buildingId={selectedBuildingId}
      onClose={() => setSelectedBuildingId(null)}
    />
  );
}

// ==========================================
// Hook for external building selection
// ==========================================

export function useConstructionPanel() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const openPanel = useCallback((buildingId: string) => {
    setSelectedBuildingId(buildingId);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedBuildingId(null);
  }, []);

  return {
    selectedBuildingId,
    openPanel,
    closePanel,
    ConstructionPanelElement: selectedBuildingId ? (
      <ConstructionPanel buildingId={selectedBuildingId} onClose={closePanel} />
    ) : null,
  };
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
