import { useInventorySlots, useSelectedSlot, ITEM_DEFINITIONS } from '@/stores/inventoryStore';

const HOTBAR_SIZE = 10;

export function Hotbar() {
  const slots = useInventorySlots();
  const selectedSlot = useSelectedSlot();

  // Only show first 10 slots in hotbar
  const hotbarSlots = slots.slice(0, HOTBAR_SIZE);

  return (
    <div className="hotbar">
      {hotbarSlots.map((slot, index) => {
        const item = slot.itemId ? ITEM_DEFINITIONS[slot.itemId] : null;
        const isSelected = index === selectedSlot;

        return (
          <div
            key={index}
            className={`hotbar-slot ${isSelected ? 'selected' : ''}`}
          >
            <span className="slot-number">{index === 9 ? 0 : index + 1}</span>
            {item && (
              <>
                <div
                  className="slot-icon"
                  style={{ backgroundColor: getItemColor(slot.itemId!) }}
                />
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

// Simple color mapping for items (matches the Phaser textures)
function getItemColor(itemId: string): string {
  const colors: Record<string, string> = {
    wood: '#d97706',
    stone: '#6b7280',
    sword: '#fbbf24',
    pickaxe: '#78716c',
    apple: '#ef4444'
  };
  return colors[itemId] || '#888';
}
