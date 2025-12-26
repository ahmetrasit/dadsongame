import { useInteractionStore } from '@/stores/interactionStore';
import { getInteractionLabel } from '@/game/utils/interactionDetection';

export function InteractionPrompt() {
  const currentTarget = useInteractionStore((s) => s.currentTarget);

  if (!currentTarget) return null;

  const primaryAction = currentTarget.interactionTypes[0];
  const actionLabel = getInteractionLabel(primaryAction);

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
