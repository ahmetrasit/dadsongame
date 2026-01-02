import { useInteractionStore } from '@/stores/interactionStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { getInteractionLabel } from '@/game/utils/interactionDetection';
import { getBootstrapRecipe } from '@/types/bootstrap';
import { getAvailableTransformations, getEquippedToolStats } from '@/utils/transformationUtils';
import type { ResourceDefinition } from '@/stores/definitions/resourcesStore';

export function InteractionPrompt() {
  const currentTarget = useInteractionStore((s) => s.currentTarget);
  const resources = useDefinitionsStore((s) => s.resources);

  if (!currentTarget) return null;

  const primaryAction = currentTarget.interactionTypes[0];
  const actionLabel = getInteractionLabel(primaryAction);

  // Check if this is a resource
  const isResource = currentTarget.object.type === 'resource';

  // Get resource definition with transformations
  const resourceDef = isResource
    ? resources.find(r => r.id === currentTarget.object.definitionId) as ResourceDefinition | undefined
    : undefined;

  // Debug logging
  if (isResource) {
    console.log('[InteractionPrompt] Target:', currentTarget.object.definitionId);
    console.log('[InteractionPrompt] ResourceDef found:', !!resourceDef);
    console.log('[InteractionPrompt] Transformations:', resourceDef?.transformations);
  }

  // Check for transformations from resource definition
  const toolStats = getEquippedToolStats();
  const availableTransformations = resourceDef
    ? getAvailableTransformations(resourceDef, toolStats, 0)
    : [];

  // Also check hardcoded bootstrap recipes as fallback
  const bootstrapRecipe = isResource ? getBootstrapRecipe(currentTarget.object.definitionId) : null;

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
          {/* Always show collect as option 1 */}
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
