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

// Optimal emoji mapping for each food item
const EMOJI_MAP: Record<string, string> = {
  // Fruits
  'apple': '🍎',
  'strawberry': '🍓',
  'blueberry': '🫐',
  'blackberry': '🍇', // Dark berry - use grape as closest
  'raspberry': '🍒', // Red berry - use cherry as closest
  'grape': '🍇',
  'melon': '🍈',
  'orange': '🍊',
  'lemon': '🍋',
  'cherry': '🍒',
  'pear': '🍐',
  'peach': '🍑',
  'plum': '🫐', // Purple fruit
  'banana': '🍌',
  'pomegranate': '🍎', // Red round fruit

  // Vegetables
  'carrot': '🥕',
  'potato': '🥔',
  'sweet potato': '🍠',
  'tomato': '🍅',
  'cabbage': '🥬',
  'onion': '🧅',
  'garlic': '🧄',
  'pumpkin': '🎃',
  'squash': '🍂', // Fall squash
  'beet': '🟣', // Purple root
  'turnip': '🥔', // Root vegetable
  'radish': '🔴', // Red root
  'pepper': '🌶️',
  'lettuce': '🥬',
  'spinach': '🥗', // Leafy green
  'cucumber': '🥒',
  'eggplant': '🍆',

  // Grains & Legumes
  'wheat': '🌾',
  'barley': '🌾',
  'corn': '🌽',
  'rice': '🍚',
  'oats': '🌾',
  'rye': '🌾',
  'beans': '🫘',
  'lentils': '🫘',
  'peas': '🫛',
  'flax': '🌱',
  'quinoa': '🌾',

  // Meat & Protein
  'chicken': '🍗',
  'rabbit': '🍖',
  'venison': '🦌',
  'mutton': '🐑',
  'duck': '🦆',
  'fish': '🐟',
  'beef': '🥩',
  'meat': '🥩',

  // Dairy & Eggs
  'milk': '🥛',
  'cheese': '🧀',
  'butter': '🧈',
  'cream': '🍶', // Cream container
  'yogurt': '🥣', // Bowl of yogurt
  'egg': '🥚',
  'goat milk': '🥛',
  'goat cheese': '🧀',

  // Prepared Foods
  'bread': '🍞',
  'stew': '🍲',
  'soup': '🥣',
  'roasted meat': '🍖',
  'pie': '🥧',
  'cake': '🍰',
  'porridge': '🥣',
  'dough': '🥖',
  'flour': '🌾',
  'cookies': '🍪',
  'jam': '🍯',
  'pickled vegetables': '🥒',
  'smoked meat': '🥓',
  'smoked fish': '🐟',
  'salted meat': '🥩',
  'sausage': '🌭',

  // Foraged Items
  'mushroom': '🍄',
  'wild berries': '🫐',
  'acorn': '🌰',
  'walnut': '🌰',
  'chestnut': '🌰',
  'hazelnut': '🌰',
  'honey': '🍯',
  'wild herbs': '🌿',

  // Seeds & Nuts
  'sunflower seeds': '🌻',
  'pumpkin seeds': '🎃',
  'almond': '🌰',
  'peanut': '🥜',
  'pine nut': '🌲',
  'flax seeds': '🌱',

  // Original items
  'wood': '🪵',
  'leather': '🟫',
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const docRef = doc(db, 'definitions', 'global');
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.error('No definitions document found!');
    process.exit(1);
  }

  const data = snapshot.data();
  const resources = data.resources || [];

  console.log(`Found ${resources.length} resources`);

  let updatedCount = 0;
  const updatedResources = resources.map((r: any) => {
    const nameLower = r.name.toLowerCase();
    const newEmoji = EMOJI_MAP[nameLower];

    if (newEmoji && newEmoji !== r.emoji) {
      console.log(`${r.name}: ${r.emoji} → ${newEmoji}`);
      updatedCount++;
      return { ...r, emoji: newEmoji };
    }
    return r;
  });

  if (updatedCount === 0) {
    console.log('\nNo emoji updates needed!');
    process.exit(0);
  }

  console.log(`\nUpdating ${updatedCount} emojis...`);

  await setDoc(docRef, {
    ...data,
    resources: updatedResources,
    updatedAt: new Date().toISOString(),
  });

  console.log('Done!');
}

main().catch(console.error);
