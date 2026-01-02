import { usePlacementStore } from '@/stores/placementStore';

export function PlacementPreview() {
  const { isPlacing, currentRecipe } = usePlacementStore();

  if (!isPlacing || !currentRecipe) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 120,
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <span>Placing: <strong>{currentRecipe.name}</strong></span>
      <span style={{ color: '#22c55e' }}>[Click] Place</span>
      <span style={{ color: '#ef4444' }}>[ESC] Cancel</span>
    </div>
  );
}
