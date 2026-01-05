import { useInventoryStore, useInventorySlots, useSelectedSlot } from '@/stores/inventoryStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';

const HOTBAR_SIZE = 10;

export function Hotbar() {
  const slots = useInventorySlots();
  const selectedSlot = useSelectedSlot();
  const getItemDefinition = useInventoryStore(s => s.getItemDefinition);
  const resources = useDefinitionsStore(s => s.resources);

  // Only show first 10 slots in hotbar
  const hotbarSlots = slots.slice(0, HOTBAR_SIZE);

  return (
    <div className="hotbar">
      {hotbarSlots.map((slot, index) => {
        const item = slot.itemId ? getItemDefinition(slot.itemId) : null;
        const resource = slot.itemId ? resources.find(r => r.id === slot.itemId) : null;
        const isSelected = index === selectedSlot;

        return (
          <div
            key={index}
            className={`hotbar-slot ${isSelected ? 'selected' : ''}`}
          >
            <span className="slot-number">{index === 9 ? 0 : index + 1}</span>
            {slot.itemId && (
              <>
                {resource?.emoji ? (
                  <span style={{ fontSize: '20px' }}>{resource.emoji}</span>
                ) : (
                  <div
                    className="slot-icon"
                    style={{ backgroundColor: getItemColor(resource?.category || item?.category || 'material') }}
                  />
                )}
                {slot.quantity > 1 && (
                  <span className="slot-quantity">{slot.quantity}</span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Color mapping for item categories
function getItemColor(category: string): string {
  const colors: Record<string, string> = {
    // Material categories (from resources)
    food: '#ef4444',      // red
    fiber: '#22c55e',     // green
    hide: '#92400e',      // brown
    wood: '#d97706',      // orange
    clay: '#78716c',      // stone gray
    ore: '#6b7280',       // gray
    metal: '#60a5fa',     // blue
    // Item categories
    material: '#888888',
    weapon: '#fbbf24',    // yellow
    tool: '#78716c',      // gray
    consumable: '#ef4444' // red
  };
  return colors[category] || '#888';
}
