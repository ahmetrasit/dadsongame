import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCysgqmvmqPApxO0NG0FZwygyunP83BPKQ",
  authDomain: "dadson-a048f.firebaseapp.com",
  projectId: "dadson-a048f",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const snapshot = await getDoc(doc(db, 'definitions', 'global'));
  const data = snapshot.data()!;
  const resources = data.resources || [];

  const foodItems = resources.filter((r: any) => r.category === 'food');
  const nonFood = resources.filter((r: any) => r.category !== 'food');

  console.log('=== ALL RESOURCES ===');
  console.log('Total:', resources.length);
  console.log('Food items:', foodItems.length);
  console.log('Non-food:', nonFood.length);
  console.log();
  console.log('Non-food items:', nonFood.map((r: any) => `${r.name} (${r.category})`).join(', '));
  console.log();
  console.log('=== FOOD ITEMS ===');
  foodItems.forEach((r: any, i: number) => console.log(`${i+1}. ${r.name}`));
}

main();
