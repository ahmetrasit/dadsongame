import { StateCreator } from 'zustand';
import type {
  ProductDefinition,
  MadeOf,
  CanDo,
  CanBeUsedFor,
  Tier,
} from '@/types/ontology';

// Product slice state and actions
export interface ProductSlice {
  products: ProductDefinition[];
  draftProduct: ProductDefinition | null;

  addProduct: () => void;
  saveProduct: () => void;
  cancelProduct: () => void;
  updateProduct: (id: string, updates: Partial<ProductDefinition>) => void;
  updateDraftProduct: (updates: Partial<ProductDefinition>) => void;
  deleteProduct: (id: string) => void;
}

// Initialize counter from existing products to prevent ID collisions
let productIdCounter = 0;
const genProductId = (existingProducts: ProductDefinition[] = []) => {
  const maxId = existingProducts.reduce((max, product) => {
    const match = product.id.match(/^product-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, productIdCounter);

  productIdCounter = maxId + 1;
  return `product-${productIdCounter}`;
};

// Default empty structures
const emptyMadeOf: MadeOf = {
  raw: [],
  components: [],
};

const emptyCanDo: CanDo = [];

const emptyCanBeUsedFor: CanBeUsedFor = [];

export const defaultProduct = (existingProducts: ProductDefinition[] = []): ProductDefinition => ({
  id: genProductId(existingProducts),
  name: 'New Product',
  description: '',
  tier: 1 as Tier,
  madeOf: { ...emptyMadeOf },
  canDo: [...emptyCanDo],
  canBeUsedFor: [...emptyCanBeUsedFor],
  spriteKey: '',
});

// Bootstrap T1 hand-craftable products
export const initialProducts: ProductDefinition[] = [
  {
    id: 'product-stone-edge',
    name: 'Stone Edge',
    description: 'A sharp stone fragment for crude cutting',
    tier: 1,
    madeOf: {
      raw: [{ materialId: 'res-stone', amount: 1, purity: 'med', state: 'raw' }],
      components: [],
    },
    canDo: [
      { verb: 'cut', capacity: 15, unit: 'power' },
      { verb: 'scrape', capacity: 12, unit: 'power' },
    ],
    canBeUsedFor: [
      { category: 'Crafting', subcategory: 'cutting' },
    ],
    spriteKey: 'stone-edge',
  },
  {
    id: 'product-cordage',
    name: 'Cordage',
    description: 'Twisted plant fiber rope',
    tier: 1,
    madeOf: {
      raw: [{ materialId: 'res-fiber', amount: 2, purity: 'med', state: 'processed' }],
      components: [],
    },
    canDo: [
      { verb: 'tie', capacity: 20, unit: 'kg' },
    ],
    canBeUsedFor: [],
    spriteKey: 'cordage',
  },
  {
    id: 'product-stone-knife',
    name: 'Stone Knife',
    description: 'A proper cutting tool with handle',
    tier: 1,
    madeOf: {
      raw: [
        { materialId: 'res-wood', amount: 1, purity: 'low', state: 'processed' },
      ],
      components: [
        { componentId: 'product-stone-edge', count: 1 },
        { componentId: 'product-cordage', count: 1 },
      ],
    },
    canDo: [
      { verb: 'cut', capacity: 25, unit: 'power' },
      { verb: 'scrape', capacity: 20, unit: 'power' },
    ],
    canBeUsedFor: [
      { category: 'Crafting', subcategory: 'cutting' },
    ],
    weight: 0.5,
    durability: 50,
    spriteKey: 'stone-knife',
  },
  {
    id: 'product-stone-hammer',
    name: 'Stone Hammer',
    description: 'A shaping tool for forming materials',
    tier: 1,
    madeOf: {
      raw: [
        { materialId: 'res-stone', amount: 2, purity: 'med', state: 'raw' },
        { materialId: 'res-wood', amount: 1, purity: 'low', state: 'processed' },
      ],
      components: [
        { componentId: 'product-cordage', count: 1 },
      ],
    },
    canDo: [
      { verb: 'shape', capacity: 20, unit: 'force' },
      { verb: 'break', capacity: 25, unit: 'force' },
    ],
    canBeUsedFor: [
      { category: 'Crafting', subcategory: 'shaping' },
    ],
    weight: 1.5,
    durability: 80,
    spriteKey: 'stone-hammer',
  },
];

export const createProductSlice: StateCreator<
  ProductSlice & { selectedId: string | null },
  [],
  [],
  ProductSlice
> = (set, get) => ({
  products: initialProducts,
  draftProduct: null,

  addProduct: () => {
    const products = get().products;
    set({ draftProduct: defaultProduct(products), selectedId: null });
  },

  saveProduct: () => {
    const draft = get().draftProduct;
    if (draft) {
      set((s) => ({
        products: [...s.products, draft],
        selectedId: draft.id,
        draftProduct: null,
      }));
    }
  },

  cancelProduct: () => set({ draftProduct: null }),

  updateDraftProduct: (updates) => set((s) => ({
    draftProduct: s.draftProduct ? { ...s.draftProduct, ...updates } : null,
  })),

  updateProduct: (id, updates) => set((s) => ({
    products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  })),

  deleteProduct: (id) => set((s) => ({
    products: s.products.filter((p) => p.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
});
