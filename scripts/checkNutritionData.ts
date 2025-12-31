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

  console.log(`Found ${foodItems.length} food items\n`);

  // Check for missing/empty vitamins
  const missingVitamins: string[] = [];
  const hasDefaultNutrition: string[] = [];
  const noNutrition: string[] = [];

  foodItems.forEach((r: any) => {
    if (!r.nutrition) {
      noNutrition.push(r.name);
    } else {
      // Check if vitamins array is empty or missing
      if (!r.nutrition.vitamins || r.nutrition.vitamins.length === 0) {
        missingVitamins.push(r.name);
      }

      // Check if using default values (25/25/25/25 macros and 100 kcal)
      if (
        r.nutrition.kcalPerKg === 100 &&
        r.nutrition.protein === 25 &&
        r.nutrition.carbs === 25 &&
        r.nutrition.goodFat === 25 &&
        r.nutrition.badFat === 25
      ) {
        hasDefaultNutrition.push(r.name);
      }
    }
  });

  console.log('=== MISSING NUTRITION OBJECT ===');
  if (noNutrition.length === 0) {
    console.log('None - all food items have nutrition data');
  } else {
    console.log(`${noNutrition.length} items:`);
    noNutrition.forEach(n => console.log(`  - ${n}`));
  }

  console.log('\n=== MISSING/EMPTY VITAMINS ===');
  if (missingVitamins.length === 0) {
    console.log('None - all food items have vitamins populated');
  } else {
    console.log(`${missingVitamins.length} items:`);
    missingVitamins.forEach(n => console.log(`  - ${n}`));
  }

  console.log('\n=== USING DEFAULT NUTRITION VALUES ===');
  if (hasDefaultNutrition.length === 0) {
    console.log('None - all food items have custom nutrition values');
  } else {
    console.log(`${hasDefaultNutrition.length} items (kcal=100, macros=25/25/25/25):`);
    hasDefaultNutrition.forEach(n => console.log(`  - ${n}`));
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total food items: ${foodItems.length}`);
  console.log(`Missing nutrition object: ${noNutrition.length}`);
  console.log(`Missing vitamins: ${missingVitamins.length}`);
  console.log(`Using default values: ${hasDefaultNutrition.length}`);
  console.log(`Fully populated: ${foodItems.length - noNutrition.length - hasDefaultNutrition.length}`);
}

main().catch(console.error);
