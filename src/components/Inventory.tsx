import { useInventoryStore, useInventorySlots, useSelectedSlot, ITEM_DEFINITIONS } from '@/stores/inventoryStore';

export function Inventory() {
  const isOpen = useInventoryStore((s) => s.isOpen);
  const slots = useInventorySlots();
  const selectedSlot = useSelectedSlot();
  const { selectSlot, setOpen } = useInventoryStore();

  if (!isOpen) return null;

  const selectedItem = slots[selectedSlot];
  const itemDef = selectedItem?.itemId ? ITEM_DEFINITIONS[selectedItem.itemId] : null;

  return (
    <div className="inventory-overlay" onClick={() => setOpen(false)}>
      <div className="inventory-panel" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-header">
          <h2>Inventory</h2>
          <button className="close-btn" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        <div className="inventory-grid">
          {slots.map((slot, index) => {
            const item = slot.itemId ? ITEM_DEFINITIONS[slot.itemId] : null;
            const isSelected = index === selectedSlot;

            return (
              <div
                key={index}
                className={`inventory-slot ${isSelected ? 'selected' : ''}`}
                onClick={() => selectSlot(index)}
              >
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

        {/* Item details panel */}
        <div className="inventory-details">
          {itemDef ? (
            <>
              <h3>{itemDef.name}</h3>
              <p className="item-category">{itemDef.category}</p>
              <p className="item-description">{itemDef.description}</p>
              {selectedItem && selectedItem.quantity > 1 && (
                <p className="item-quantity">Quantity: {selectedItem.quantity}</p>
              )}
            </>
          ) : (
            <p className="no-item">Select an item to see details</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
