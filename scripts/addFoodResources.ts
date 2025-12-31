import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCysgqmvmqPApxO0NG0FZwygyunP83BPKQ",
  authDomain: "dadson-a048f.firebaseapp.com",
  projectId: "dadson-a048f",
  storageBucket: "dadson-a048f.firebasestorage.app",
  messagingSenderId: "151293218012",
  appId: "1:151293218012:web:b9a4da52f2f65b1c62dc64"
};

// Food items by category with appropriate emojis
const FOOD_ITEMS: Record<string, { name: string; emoji: string; spoilageRate: 'fast' | 'medium' | 'slow' | 'never' }[]> = {
  // Fruits
  fruits: [
    { name: 'Apple', emoji: '🍎', spoilageRate: 'medium' },
    { name: 'Strawberry', emoji: '🍓', spoilageRate: 'fast' },
    { name: 'Blueberry', emoji: '🫐', spoilageRate: 'fast' },
    { name: 'Blackberry', emoji: '🫐', spoilageRate: 'fast' },
    { name: 'Raspberry', emoji: '🍇', spoilageRate: 'fast' },
    { name: 'Grape', emoji: '🍇', spoilageRate: 'medium' },
    { name: 'Melon', emoji: '🍈', spoilageRate: 'medium' },
    { name: 'Orange', emoji: '🍊', spoilageRate: 'medium' },
    { name: 'Lemon', emoji: '🍋', spoilageRate: 'slow' },
    { name: 'Cherry', emoji: '🍒', spoilageRate: 'fast' },
    { name: 'Pear', emoji: '🍐', spoilageRate: 'medium' },
    { name: 'Peach', emoji: '🍑', spoilageRate: 'medium' },
    { name: 'Plum', emoji: '🍑', spoilageRate: 'medium' },
    { name: 'Banana', emoji: '🍌', spoilageRate: 'fast' },
    { name: 'Pomegranate', emoji: '🍎', spoilageRate: 'medium' },
  ],
  // Vegetables
  vegetables: [
    { name: 'Carrot', emoji: '🥕', spoilageRate: 'slow' },
    { name: 'Potato', emoji: '🥔', spoilageRate: 'slow' },
    { name: 'Sweet Potato', emoji: '🍠', spoilageRate: 'slow' },
    { name: 'Tomato', emoji: '🍅', spoilageRate: 'medium' },
    { name: 'Cabbage', emoji: '🥬', spoilageRate: 'medium' },
    { name: 'Onion', emoji: '🧅', spoilageRate: 'slow' },
    { name: 'Garlic', emoji: '🧄', spoilageRate: 'slow' },
    { name: 'Pumpkin', emoji: '🎃', spoilageRate: 'slow' },
    { name: 'Squash', emoji: '🎃', spoilageRate: 'slow' },
    { name: 'Beet', emoji: '🍠', spoilageRate: 'slow' },
    { name: 'Turnip', emoji: '🥔', spoilageRate: 'slow' },
    { name: 'Radish', emoji: '🥕', spoilageRate: 'medium' },
    { name: 'Pepper', emoji: '🌶️', spoilageRate: 'medium' },
    { name: 'Lettuce', emoji: '🥬', spoilageRate: 'fast' },
    { name: 'Spinach', emoji: '🥬', spoilageRate: 'fast' },
    { name: 'Cucumber', emoji: '🥒', spoilageRate: 'medium' },
    { name: 'Eggplant', emoji: '🍆', spoilageRate: 'medium' },
  ],
  // Grains & Legumes
  grains: [
    { name: 'Wheat', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Barley', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Corn', emoji: '🌽', spoilageRate: 'medium' },
    { name: 'Rice', emoji: '🍚', spoilageRate: 'slow' },
    { name: 'Oats', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Rye', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Beans', emoji: '🫘', spoilageRate: 'slow' },
    { name: 'Lentils', emoji: '🫘', spoilageRate: 'slow' },
    { name: 'Peas', emoji: '🫛', spoilageRate: 'medium' },
    { name: 'Flax', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Quinoa', emoji: '🌾', spoilageRate: 'slow' },
  ],
  // Meat & Protein
  meat: [
    { name: 'Chicken', emoji: '🍗', spoilageRate: 'fast' },
    { name: 'Rabbit', emoji: '🍖', spoilageRate: 'fast' },
    { name: 'Venison', emoji: '🍖', spoilageRate: 'fast' },
    { name: 'Mutton', emoji: '🍖', spoilageRate: 'fast' },
    { name: 'Duck', emoji: '🍗', spoilageRate: 'fast' },
    { name: 'Fish', emoji: '🐟', spoilageRate: 'fast' },
    { name: 'Beef', emoji: '🥩', spoilageRate: 'fast' },
  ],
  // Dairy & Eggs
  dairy: [
    { name: 'Milk', emoji: '🥛', spoilageRate: 'fast' },
    { name: 'Cheese', emoji: '🧀', spoilageRate: 'medium' },
    { name: 'Butter', emoji: '🧈', spoilageRate: 'medium' },
    { name: 'Cream', emoji: '🥛', spoilageRate: 'fast' },
    { name: 'Yogurt', emoji: '🥛', spoilageRate: 'fast' },
    { name: 'Egg', emoji: '🥚', spoilageRate: 'medium' },
    { name: 'Goat Milk', emoji: '🥛', spoilageRate: 'fast' },
    { name: 'Goat Cheese', emoji: '🧀', spoilageRate: 'medium' },
  ],
  // Prepared Foods
  prepared: [
    { name: 'Bread', emoji: '🍞', spoilageRate: 'medium' },
    { name: 'Stew', emoji: '🍲', spoilageRate: 'fast' },
    { name: 'Soup', emoji: '🍲', spoilageRate: 'fast' },
    { name: 'Roasted Meat', emoji: '🍖', spoilageRate: 'fast' },
    { name: 'Pie', emoji: '🥧', spoilageRate: 'medium' },
    { name: 'Cake', emoji: '🍰', spoilageRate: 'medium' },
    { name: 'Porridge', emoji: '🥣', spoilageRate: 'fast' },
    { name: 'Dough', emoji: '🍞', spoilageRate: 'fast' },
    { name: 'Flour', emoji: '🌾', spoilageRate: 'slow' },
    { name: 'Cookies', emoji: '🍪', spoilageRate: 'slow' },
    { name: 'Jam', emoji: '🍯', spoilageRate: 'slow' },
    { name: 'Pickled Vegetables', emoji: '🥒', spoilageRate: 'slow' },
    { name: 'Smoked Meat', emoji: '🥓', spoilageRate: 'slow' },
    { name: 'Smoked Fish', emoji: '🐟', spoilageRate: 'slow' },
    { name: 'Salted Meat', emoji: '🥩', spoilageRate: 'slow' },
    { name: 'Sausage', emoji: '🌭', spoilageRate: 'medium' },
  ],
  // Foraged Items
  foraged: [
    { name: 'Mushroom', emoji: '🍄', spoilageRate: 'fast' },
    { name: 'Wild Berries', emoji: '🫐', spoilageRate: 'fast' },
    { name: 'Acorn', emoji: '🌰', spoilageRate: 'slow' },
    { name: 'Walnut', emoji: '🌰', spoilageRate: 'slow' },
    { name: 'Chestnut', emoji: '🌰', spoilageRate: 'slow' },
    { name: 'Hazelnut', emoji: '🌰', spoilageRate: 'slow' },
    { name: 'Honey', emoji: '🍯', spoilageRate: 'never' },
    { name: 'Wild Herbs', emoji: '🌿', spoilageRate: 'fast' },
  ],
  // Seeds & Nuts
  seeds: [
    { name: 'Sunflower Seeds', emoji: '🌻', spoilageRate: 'slow' },
    { name: 'Pumpkin Seeds', emoji: '🎃', spoilageRate: 'slow' },
    { name: 'Almond', emoji: '🌰', spoilageRate: 'slow' },
    { name: 'Peanut', emoji: '🥜', spoilageRate: 'slow' },
    { name: 'Pine Nut', emoji: '🌲', spoilageRate: 'slow' },
    { name: 'Flax Seeds', emoji: '🌾', spoilageRate: 'slow' },
  ],
};

// Default nutrition (will be updated by search agent)
const defaultNutrition = {
  kcalPerKg: 100,
  vitamins: [] as string[],
  protein: 25,
  carbs: 25,
  goodFat: 25,
  badFat: 25,
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Get current definitions
  const docRef = doc(db, 'definitions', 'global');
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.error('No definitions document found!');
    process.exit(1);
  }

  const data = snapshot.data();
  const existingResources = data.resources || [];
  const existingNames = new Set(existingResources.map((r: any) => r.name.toLowerCase()));

  console.log(`Found ${existingResources.length} existing resources`);
  console.log('Existing foods:', Array.from(existingNames).join(', '));

  // Find max resource ID
  let maxId = existingResources.reduce((max: number, r: any) => {
    const match = r.id.match(/resource-(\d+)/);
    if (match) {
      return Math.max(max, parseInt(match[1]));
    }
    return max;
  }, 0);

  // Also check res- prefixed IDs
  existingResources.forEach((r: any) => {
    if (r.id.startsWith('res-')) {
      // Keep these as is
    }
  });

  const newResources: any[] = [];
  let idCounter = maxId + 1;

  // Process all food items
  for (const [category, items] of Object.entries(FOOD_ITEMS)) {
    for (const item of items) {
      if (!existingNames.has(item.name.toLowerCase())) {
        const newResource = {
          id: `resource-${idCounter++}`,
          name: item.name,
          category: 'food',
          spoilageRate: item.spoilageRate,
          weight: 1,
          emoji: item.emoji,
          interactionTypes: ['collect'],
          interactionRadius: 24,
          isBlocking: false,
          nutrition: { ...defaultNutrition },
        };
        newResources.push(newResource);
        console.log(`+ Adding: ${item.name} (${item.emoji})`);
      } else {
        console.log(`= Exists: ${item.name}`);
      }
    }
  }

  if (newResources.length === 0) {
    console.log('\nNo new resources to add!');
    process.exit(0);
  }

  console.log(`\nAdding ${newResources.length} new food resources...`);

  // Merge and save
  const allResources = [...existingResources, ...newResources];

  await setDoc(docRef, {
    ...data,
    resources: allResources,
    updatedAt: new Date().toISOString(),
  });

  console.log(`\nSuccess! Total resources now: ${allResources.length}`);
  console.log('\nNew foods added:');
  newResources.forEach(r => console.log(`  - ${r.name}`));
}

main().catch(console.error);
