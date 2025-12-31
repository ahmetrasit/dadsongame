import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCysgqmvmqPApxO0NG0FZwygyunP83BPKQ",
  authDomain: "dadson-a048f.firebaseapp.com",
  projectId: "dadson-a048f",
  storageBucket: "dadson-a048f.firebasestorage.app",
  messagingSenderId: "151293218012",
  appId: "1:151293218012:web:b9a4da52f2f65b1c62dc64"
};

const ALL_NUTRIENTS = ['A', 'B', 'C', 'D', 'E', 'K', 'fiber', 'calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'phosphorus'];

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

  // Filter food items only
  const foodItems = resources.filter((r: any) => r.category === 'food');

  console.log(`Total food items: ${foodItems.length}\n`);

  // Count each nutrient
  const counts: Record<string, number> = {};
  const foodsWithNutrient: Record<string, string[]> = {};

  ALL_NUTRIENTS.forEach(n => {
    counts[n] = 0;
    foodsWithNutrient[n] = [];
  });

  foodItems.forEach((r: any) => {
    if (r.nutrition && r.nutrition.vitamins) {
      r.nutrition.vitamins.forEach((v: string) => {
        if (counts[v] !== undefined) {
          counts[v]++;
          foodsWithNutrient[v].push(r.name);
        }
      });
    }
  });

  // Sort by count (descending)
  const sorted = ALL_NUTRIENTS.sort((a, b) => counts[b] - counts[a]);

  console.log('=== VITAMIN/MINERAL DISTRIBUTION ===\n');
  console.log('Nutrient       | Count | Percentage');
  console.log('---------------|-------|----------');

  sorted.forEach(n => {
    const count = counts[n];
    const pct = ((count / foodItems.length) * 100).toFixed(1);
    const name = n.padEnd(14);
    const countStr = count.toString().padStart(5);
    console.log(`${name} | ${countStr} | ${pct}%`);
  });

  // Show foods with zero nutrients
  console.log('\n=== NUTRIENTS WITH FEW FOODS (<5) ===\n');
  sorted.filter(n => counts[n] < 5).forEach(n => {
    console.log(`${n}: ${foodsWithNutrient[n].join(', ') || 'None'}`);
  });
}

main().catch(console.error);
