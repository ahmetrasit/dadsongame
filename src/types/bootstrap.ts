export type BootstrapAction = 'gather' | 'break' | 'twist' | 'mold' | 'stack';

export interface BootstrapRecipe {
  action: BootstrapAction;
  input: string;           // resourceId
  output: string;          // resourceId
  outputQuantity: number;
}

export const BOOTSTRAP_RECIPES: BootstrapRecipe[] = [
  { action: 'break', input: 'res-stone', output: 'res-stone-fragment', outputQuantity: 3 },
  { action: 'twist', input: 'res-plant-fiber', output: 'res-cordage', outputQuantity: 1 },
  { action: 'mold', input: 'res-wet-clay', output: 'res-clay-vessel', outputQuantity: 1 },
];

// Returns bootstrap action available for a resource, or null
export function getBootstrapAction(resourceId: string): BootstrapAction | null {
  const recipe = BOOTSTRAP_RECIPES.find(r => r.input === resourceId);
  return recipe?.action || null;
}

// Returns the full recipe for a resource, or null
export function getBootstrapRecipe(resourceId: string): BootstrapRecipe | null {
  return BOOTSTRAP_RECIPES.find(r => r.input === resourceId) || null;
}

// Stack Recipe System (for combining items from inventory)
export interface StackRecipeInput {
  resourceId: string;
  quantity: number;
}

export interface StackRecipe {
  id: string;
  name: string;
  inputs: StackRecipeInput[];
  outputType: 'structure';  // For now, only structures
  outputId: string;         // Structure definition ID
  heatLevel?: number;       // Heat output (for fire pit)
}

export const STACK_RECIPES: StackRecipe[] = [
  {
    id: 'fire-pit',
    name: 'Fire Pit',
    inputs: [
      { resourceId: 'res-stone', quantity: 5 },
      { resourceId: 'res-wood', quantity: 3 }
    ],
    outputType: 'structure',
    outputId: 'struct-fire-pit',
    heatLevel: 150
  }
];

// Check if player can craft a stack recipe
export function canCraftStackRecipe(recipe: StackRecipe, inventory: { itemId: string | null; quantity: number }[]): boolean {
  return recipe.inputs.every(input => {
    const total = inventory
      .filter(slot => slot.itemId === input.resourceId)
      .reduce((sum, slot) => sum + slot.quantity, 0);
    return total >= input.quantity;
  });
}

// Get all craftable stack recipes based on inventory
export function getCraftableStackRecipes(inventory: { itemId: string | null; quantity: number }[]): StackRecipe[] {
  return STACK_RECIPES.filter(recipe => canCraftStackRecipe(recipe, inventory));
}
