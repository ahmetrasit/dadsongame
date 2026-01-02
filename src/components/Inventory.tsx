import { useInventoryStore, useInventorySlots, useSelectedSlot } from '@/stores/inventoryStore';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { FaTrashAlt } from 'react-icons/fa';
import { getCraftableStackRecipes } from '@/types/bootstrap';
import { usePlacementStore } from '@/stores/placementStore';
import { useState } from 'react';

export function Inventory() {
  const isOpen = useInventoryStore((s) => s.isOpen);
  const slots = useInventorySlots();
  const selectedSlot = useSelectedSlot();
  const { selectSlot, setOpen, getItemDefinition } = useInventoryStore();
  const resources = useDefinitionsStore((s) => s.resources);
  const [showCraftMenu, setShowCraftMenu] = useState(false);

  if (!isOpen) return null;

  const selectedItem = slots[selectedSlot];
  const itemDef = selectedItem?.itemId ? getItemDefinition(selectedItem.itemId) : null;
  const craftableRecipes = getCraftableStackRecipes(slots);

  return (
    <div className="inventory-overlay" onClick={() => setOpen(false)}>
      <div className="inventory-panel" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-header">
          <h2>Inventory</h2>
          <button className="close-btn" onClick={() => setOpen(false)}>
            <FaTrashAlt />
          </button>
        </div>

        <div className="inventory-grid">
          {slots.map((slot, index) => {
            const item = slot.itemId ? getItemDefinition(slot.itemId) : null;
            const resource = slot.itemId ? resources.find(r => r.id === slot.itemId) : null;
            const isSelected = index === selectedSlot;

            return (
              <div
                key={index}
                className={`inventory-slot ${isSelected ? 'selected' : ''}`}
                onClick={() => selectSlot(index)}
              >
                {slot.itemId && (
                  <>
                    {resource?.emoji ? (
                      <span style={{ fontSize: '24px' }}>{resource.emoji}</span>
                    ) : (
                      <div
                        className="slot-icon"
                        style={{ backgroundColor: getItemColor(item?.category || 'material') }}
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

        {/* Craft section */}
        <div className="inventory-craft">
          <button
            className="craft-btn"
            disabled={craftableRecipes.length === 0}
            onClick={() => setShowCraftMenu(!showCraftMenu)}
          >
            Craft ({craftableRecipes.length})
          </button>

          {showCraftMenu && craftableRecipes.length > 0 && (
            <div className="craft-menu">
              {craftableRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  className="craft-option"
                  onClick={() => {
                    usePlacementStore.getState().startPlacement(recipe);
                    setOpen(false);
                    setShowCraftMenu(false);
                  }}
                >
                  <span>{recipe.name}</span>
                  <span className="craft-cost">
                    {recipe.inputs.map(i => `${i.quantity}x`).join(' + ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getItemColor(category: string): string {
  const colors: Record<string, string> = {
    // Material categories
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
