import { useInteractionStore } from '@/stores/interactionStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useToolsStore } from '@/stores/toolsStore';
import { getInteractionLabel } from '@/game/utils/interactionDetection';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { getAvailableTransformations, type AvailableTransformation } from '@/utils/transformationUtils';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';
import type { ToolFunctionAllocation } from '@/types/tools';

export function InteractionPrompt() {
  const currentTarget = useInteractionStore((s) => s.currentTarget);
  const resources = useDefinitionsStore((s) => s.resources);
  const selectedSlot = useInventoryStore((s) => s.inventory.selectedSlot);
  const slots = useInventoryStore((s) => s.inventory.slots);
  const getTool = useToolsStore((s) => s.getTool);

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

  // Get tool stats for transformation checks
  const toolStats = getToolStats();

  // Get transformations from resource definition
  let availableTransformations: AvailableTransformation[] = [];
  if (resourceDef) {
    availableTransformations = getAvailableTransformations(resourceDef, toolStats, 0);
  }

  // Also check hardcoded bootstrap recipes as fallback
  const bootstrapRecipe = isResource ? getBootstrapRecipe(currentTarget.object.definitionId) : null;

  // For plants/animals: use the pre-filtered interactionTypes from the detection system
  // The filtering is now done in interactionDetection.ts based on plant state (HAS_YIELD, NO_YIELD, DEAD)
  if ((isPlant || isAnimal) && currentTarget.interactionTypes.length > 0) {
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
          {currentTarget.interactionTypes.map((action, index) => {
            const keyNum = index + 1;
            const label = getInteractionLabel(action);

            return (
              <div
                key={`action-${index}`}
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
                <span>{label}</span>
              </div>
            );
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
