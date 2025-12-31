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

  console.log(`Total resources before: ${resources.length}`);

  // Find duplicates (by normalized name)
  const seen = new Map<string, any>();
  const duplicates: string[] = [];

  resources.forEach((r: any) => {
    const normalizedName = r.name.trim().toLowerCase();
    if (seen.has(normalizedName)) {
      duplicates.push(`${r.name} (id: ${r.id})`);
    } else {
      seen.set(normalizedName, r);
    }
  });

  if (duplicates.length === 0) {
    console.log('No duplicates found!');
    process.exit(0);
  }

  console.log(`\nFound ${duplicates.length} duplicate(s):`);
  duplicates.forEach(d => console.log(`  - ${d}`));

  // Keep unique resources (first occurrence wins, but prefer trimmed names)
  const uniqueResources: any[] = [];
  const seenNames = new Set<string>();

  resources.forEach((r: any) => {
    const normalizedName = r.name.trim().toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      // Use trimmed name
      uniqueResources.push({ ...r, name: r.name.trim() });
    }
  });

  console.log(`\nRemoving duplicates...`);
  console.log(`Resources after: ${uniqueResources.length}`);

  await setDoc(docRef, {
    ...data,
    resources: uniqueResources,
    updatedAt: new Date().toISOString(),
  });

  console.log('Done!');
}

main().catch(console.error);
