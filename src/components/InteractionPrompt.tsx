import { useInteractionStore } from '@/stores/interactionStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useToolsStore } from '@/stores/toolsStore';
import { useYieldStateStore } from '@/stores/yieldStateStore';
import { getInteractionLabel } from '@/game/utils/interactionDetection';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { getAvailableTransformations, type AvailableTransformation } from '@/utils/transformationUtils';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';
import type { PlantDefinition } from '@/stores/definitions/plantsStore';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';
import type { ToolFunctionAllocation } from '@/types/tools';

// Represents a yield action (milk, collect, harvest, etc.)
interface YieldAction {
  type: 'yield';
  action: string;
  label: string;
  resourceId: string;
}

// Represents a transformation action (chop, cook, etc.)
interface TransformationAction {
  type: 'transformation';
  transformation: AvailableTransformation;
}

type AvailableAction = YieldAction | TransformationAction;

export function InteractionPrompt() {
  const currentTarget = useInteractionStore((s) => s.currentTarget);
  const resources = useDefinitionsStore((s) => s.resources);
  const plants = useDefinitionsStore((s) => s.plants);
  const animals = useDefinitionsStore((s) => s.animals);
  const selectedSlot = useInventoryStore((s) => s.inventory.selectedSlot);
  const slots = useInventoryStore((s) => s.inventory.slots);
  const getTool = useToolsStore((s) => s.getTool);
  const getPlacementYields = useYieldStateStore((s) => s.getPlacementYields);

  // Get equipped tool stats
  const getToolStats = (): Partial<ToolFunctionAllocation> | null => {
    const slot = slots[selectedSlot];
    if (!slot?.itemId || !slot.itemId.startsWith('tool-')) {
      return null;
    }
    const tool = getTool(slot.itemId);
    return tool?.functionPoints ?? null;
  };

  if (!currentTarget) return null;

  const primaryAction = currentTarget.interactionTypes[0];
  const actionLabel = getInteractionLabel(primaryAction);

  // Determine object type
  const objectType = currentTarget.object.type;
  const isResource = objectType === 'resource';
  const isPlant = objectType === 'plant';
  const isAnimal = objectType === 'animal';

  // Get definition based on type
  const resourceDef = isResource
    ? resources.find(r => r.id === currentTarget.object.definitionId) as ResourceDefinition | undefined
    : undefined;

  const plantDef = isPlant
    ? plants.find(p => p.id === currentTarget.object.definitionId) as PlantDefinition | undefined
    : undefined;

  const animalDef = isAnimal
    ? animals.find(a => a.id === currentTarget.object.definitionId) as AnimalDefinition | undefined
    : undefined;

  // Get tool stats for transformation checks
  const toolStats = getToolStats();

  // Collect all available actions for plants/animals
  const availableActions: AvailableAction[] = [];

  // Get yield state for the current target (if plant or animal)
  const yieldState = (isPlant || isAnimal) ? getPlacementYields(currentTarget.object.id) : undefined;

  // For plants: collect yield actions and transformations (only if yield is available)
  if (plantDef?.aliveYields) {
    plantDef.aliveYields.forEach((yield_, index) => {
      // Check if this yield has remaining amount
      const yieldInfo = yieldState?.yields[index];
      const hasRemaining = yieldInfo?.isAvailable && yieldInfo.remaining > 0;

      if (hasRemaining) {
        // Add yield action (harvest, pick, collect)
        const yieldAction = yield_.interactionType || 'harvest';
        availableActions.push({
          type: 'yield',
          action: yieldAction,
          label: yieldAction.charAt(0).toUpperCase() + yieldAction.slice(1),
          resourceId: yield_.resourceId,
        });

        // Add any transformations on this yield (only if yield is available)
        if (yield_.transformations && yield_.transformations.length > 0) {
          const yieldAsResource = { transformations: yield_.transformations } as ResourceDefinition;
          const yieldTransformations = getAvailableTransformations(yieldAsResource, toolStats, 0);
          for (const t of yieldTransformations) {
            availableActions.push({ type: 'transformation', transformation: t });
          }
        }
      }
    });
  }

  // For animals: collect yield actions and transformations (only if yield is available)
  if (animalDef?.aliveYields) {
    animalDef.aliveYields.forEach((yield_, index) => {
      // Check if this yield has remaining amount
      const yieldInfo = yieldState?.yields[index];
      const hasRemaining = yieldInfo?.isAvailable && yieldInfo.remaining > 0;

      if (hasRemaining) {
        // Add yield action (milk, shear, gather, collect)
        const yieldAction = yield_.interactionType || 'collect';
        availableActions.push({
          type: 'yield',
          action: yieldAction,
          label: yieldAction.charAt(0).toUpperCase() + yieldAction.slice(1),
          resourceId: yield_.resourceId,
        });

        // Add any transformations on this yield (only if yield is available)
        if (yield_.transformations && yield_.transformations.length > 0) {
          const yieldAsResource = { transformations: yield_.transformations } as ResourceDefinition;
          const yieldTransformations = getAvailableTransformations(yieldAsResource, toolStats, 0);
          for (const t of yieldTransformations) {
            availableActions.push({ type: 'transformation', transformation: t });
          }
        }
      }
    });
  }

  // Get transformations from resource definition
  let availableTransformations: AvailableTransformation[] = [];
  if (resourceDef) {
    availableTransformations = getAvailableTransformations(resourceDef, toolStats, 0);
  }

  // Also check hardcoded bootstrap recipes as fallback
  const bootstrapRecipe = isResource ? getBootstrapRecipe(currentTarget.object.definitionId) : null;

  // For plants/animals: hide prompt if no yield actions are available
  if ((isPlant || isAnimal) && availableActions.length === 0) {
    return null;
  }

  // For plants/animals with yield actions, show them
  if ((isPlant || isAnimal) && availableActions.length > 0) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 110,
          pointerEvents: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong>{currentTarget.definition.name}</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {availableActions.map((action, index) => {
            const keyNum = index + 1;

            if (action.type === 'yield') {
              return (
                <div
                  key={`yield-${index}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span
                    style={{
                      background: '#3b82f6',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    {keyNum}
                  </span>
                  <span>{action.label}</span>
                </div>
              );
            } else {
              const at = action.transformation;
              const actionName = at.transformation.action.charAt(0).toUpperCase() + at.transformation.action.slice(1);
              return (
                <div
                  key={`transform-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: at.canPerform ? 1 : 0.5,
                  }}
                  title={at.canPerform ? '' : at.missingRequirements.join(', ')}
                >
                  <span
                    style={{
                      background: at.canPerform ? '#22c55e' : '#6b7280',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    {keyNum}
                  </span>
                  <span>{actionName}</span>
                  {!at.canPerform && (
                    <span style={{ fontSize: '10px', color: '#ef4444' }}>
                      ({at.missingRequirements[0]})
                    </span>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  // If resource has transformations, show them
  if (availableTransformations.length > 0) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 110,
          pointerEvents: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong>{currentTarget.definition.name}</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Show primary action as option 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                background: '#3b82f6',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              1
            </span>
            <span>{actionLabel}</span>
          </div>

          {/* Show transformations */}
          {availableTransformations.map((at, index) => {
            const keyNum = index + 2;
            const actionName = at.transformation.action.charAt(0).toUpperCase() + at.transformation.action.slice(1);

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: at.canPerform ? 1 : 0.5,
                }}
                title={at.canPerform ? '' : at.missingRequirements.join(', ')}
              >
                <span
                  style={{
                    background: at.canPerform ? '#22c55e' : '#6b7280',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  {keyNum}
                </span>
                <span>{actionName}</span>
                {!at.canPerform && (
                  <span style={{ fontSize: '10px', color: '#ef4444' }}>
                    ({at.missingRequirements[0]})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback to bootstrap recipe if no transformations defined
  if (bootstrapRecipe) {
    const bootstrapLabel = getInteractionLabel(bootstrapRecipe.action);

    return (
      <div
        style={{
          position: 'fixed',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 110,
          pointerEvents: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong>{currentTarget.definition.name}</strong>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                background: '#3b82f6',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              1
            </span>
            <span>Collect</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                background: '#22c55e',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
            >
              2
            </span>
            <span>{bootstrapLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default interaction UI
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 110,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <span
        style={{
          background: '#3b82f6',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        E
      </span>
      <span>
        {actionLabel} <strong>{currentTarget.definition.name}</strong>
      </span>
      {currentTarget.interactionTypes.length > 1 && (
        <span style={{ color: '#888', fontSize: '12px' }}>
          (+{currentTarget.interactionTypes.length - 1} more)
        </span>
      )}
    </div>
  );
}
