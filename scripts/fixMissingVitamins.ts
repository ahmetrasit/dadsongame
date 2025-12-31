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

// Vitamin data for items that were missing
const VITAMIN_FIXES: Record<string, string[]> = {
  // Honey has trace B vitamins, iron, potassium, zinc
  'honey': ['B', 'iron', 'potassium', 'zinc'],
  // Jam (fruit preserves) retains some vitamin C and potassium from fruit
  'jam': ['C', 'potassium'],
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

  let updatedCount = 0;
  const updatedResources = resources.map((r: any) => {
    const nameLower = r.name.toLowerCase();
    const vitamins = VITAMIN_FIXES[nameLower];

    if (vitamins && r.nutrition) {
      console.log(`${r.name}: Adding vitamins [${vitamins.join(', ')}]`);
      updatedCount++;
      return {
        ...r,
        nutrition: {
          ...r.nutrition,
          vitamins: vitamins,
        },
      };
    }
    return r;
  });

  if (updatedCount === 0) {
    console.log('No updates needed!');
    process.exit(0);
  }

  console.log(`\nUpdating ${updatedCount} items...`);

  await setDoc(docRef, {
    ...data,
    resources: updatedResources,
    updatedAt: new Date().toISOString(),
  });

  console.log('Done!');
}

main().catch(console.error);
