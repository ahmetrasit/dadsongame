/**
 * Script to update Firebase Firestore with accurate USDA nutritional values for food resources.
 *
 * Usage: npx tsx scripts/updateFoodNutrition.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || ''
};

// Type definitions matching the codebase
type VitaminType = 'A' | 'B' | 'C' | 'D' | 'E' | 'K' | 'fiber' | 'calcium' | 'iron' | 'magnesium' | 'potassium' | 'zinc' | 'phosphorus';

interface FoodNutrition {
  kcalPerKg: number;
  vitamins: VitaminType[];
  protein: number;
  carbs: number;
  goodFat: number;
  badFat: number;
}

interface ResourceDefinition {
  id: string;
  name: string;
  category: 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics';
  spoilageRate: 'fast' | 'medium' | 'slow' | 'never';
  weight: number;
  emoji: string;
  interactionTypes: string[];
  interactionRadius: number;
  isBlocking: boolean;
  imageUrl?: string;
  spriteVersions?: unknown[];
  nutrition?: FoodNutrition;
}

// USDA-based nutritional data
const nutritionData: Record<string, FoodNutrition> = {
  'Apple': {
    kcalPerKg: 520,
    vitamins: ['C'],
    protein: 2,
    carbs: 96,
    goodFat: 1,
    badFat: 1
  },
  'Wheat': {
    kcalPerKg: 3320,
    vitamins: ['B', 'fiber', 'iron', 'magnesium'],
    protein: 13,
    carbs: 84,
    goodFat: 2,
    badFat: 1
  },
  'Milk': {
    kcalPerKg: 610,
    vitamins: ['A', 'B', 'D', 'calcium', 'phosphorus', 'potassium'],
    protein: 21,
    carbs: 31,
    goodFat: 18,
    badFat: 30
  },
  'Meat': {
    kcalPerKg: 2500,
    vitamins: ['B'],
    protein: 43,
    carbs: 0,
    goodFat: 30,
    badFat: 27
  },
  'Egg': {
    kcalPerKg: 1430,
    vitamins: ['A', 'B', 'D', 'E', 'iron', 'phosphorus', 'zinc'],
    protein: 35,
    carbs: 2,
    goodFat: 43,
    badFat: 20
  },
  // New foods added based on USDA data
  'Blueberry': {
    // 57 kcal/100g = 570 kcal/kg
    // Macros: 0.74g protein (3 kcal), 14.5g carbs (58 kcal), 0.3g fat (2.7 kcal) = ~64 kcal
    // Percentages: protein 5%, carbs 91%, fat 4% (mostly unsaturated)
    kcalPerKg: 570,
    vitamins: ['C', 'E'],
    protein: 5,
    carbs: 91,
    goodFat: 3,
    badFat: 1
  },
  'Carrot': {
    // 41 kcal/100g = 410 kcal/kg
    // Macros: 0.93g protein (3.7 kcal), 9.58g carbs (38.3 kcal), 0.24g fat (2.2 kcal) = ~44 kcal
    // Percentages: protein 8%, carbs 87%, fat 5% (mostly unsaturated)
    // Very high in vitamin A (835 mcg RAE, 93% DV per 100g)
    kcalPerKg: 410,
    vitamins: ['A'],
    protein: 8,
    carbs: 87,
    goodFat: 4,
    badFat: 1
  },
  'Strawberry': {
    // 32 kcal/100g = 320 kcal/kg
    // Macros: 0.67g protein (2.7 kcal), 7.68g carbs (30.7 kcal), 0.3g fat (2.7 kcal) = ~36 kcal
    // Percentages: protein 7%, carbs 85%, fat 8% (mostly unsaturated)
    // Excellent source of vitamin C (59mg, 65% DV per 100g)
    kcalPerKg: 320,
    vitamins: ['C'],
    protein: 7,
    carbs: 85,
    goodFat: 6,
    badFat: 2
  },
  'Strawberry ': {
    // Duplicate entry for database name with trailing space
    kcalPerKg: 320,
    vitamins: ['C'],
    protein: 7,
    carbs: 85,
    goodFat: 6,
    badFat: 2
  },
  'Fish': {
    // Using cod/tilapia average: ~95 kcal/100g = 950 kcal/kg (using raw average)
    // Macros: ~20g protein (80 kcal), 0g carbs, ~1.5g fat (13.5 kcal) = ~94 kcal
    // Percentages: protein 86%, carbs 0%, fat 14% (mostly unsaturated omega-3s)
    // Good source of B vitamins and vitamin D
    kcalPerKg: 950,
    vitamins: ['B', 'D'],
    protein: 86,
    carbs: 0,
    goodFat: 12,
    badFat: 2
  },
  // GRAINS & LEGUMES - Requested USDA data
  'Barley': {
    kcalPerKg: 3520,
    vitamins: ['B', 'fiber', 'iron', 'magnesium'],
    protein: 11,
    carbs: 86,
    goodFat: 2,
    badFat: 1
  },
  'Corn': {
    kcalPerKg: 3650,
    vitamins: ['B', 'fiber', 'magnesium', 'phosphorus'],
    protein: 10,
    carbs: 81,
    goodFat: 7,
    badFat: 2
  },
  'Rice': {
    kcalPerKg: 3650,
    vitamins: ['B', 'iron', 'magnesium'],
    protein: 8,
    carbs: 88,
    goodFat: 1,
    badFat: 1
  },
  'Oats': {
    kcalPerKg: 3890,
    vitamins: ['B', 'E', 'fiber', 'iron', 'magnesium', 'phosphorus', 'zinc'],
    protein: 11,
    carbs: 68,
    goodFat: 15,
    badFat: 5
  },
  'Rye': {
    kcalPerKg: 3380,
    vitamins: ['B', 'E', 'fiber', 'iron', 'magnesium', 'phosphorus'],
    protein: 12,
    carbs: 85,
    goodFat: 2,
    badFat: 1
  },
  'Beans': {
    kcalPerKg: 1270,
    vitamins: ['B', 'fiber', 'iron', 'potassium', 'magnesium'],
    protein: 28,
    carbs: 68,
    goodFat: 2,
    badFat: 2
  },
  'Lentils': {
    kcalPerKg: 1160,
    vitamins: ['B', 'fiber', 'iron', 'potassium'],
    protein: 31,
    carbs: 66,
    goodFat: 2,
    badFat: 1
  },
  'Peas': {
    kcalPerKg: 840,
    vitamins: ['A', 'C', 'K', 'fiber', 'iron'],
    protein: 25,
    carbs: 71,
    goodFat: 2,
    badFat: 2
  },
  'Flax': {
    kcalPerKg: 5340,
    vitamins: ['B', 'E', 'fiber', 'magnesium', 'phosphorus'],
    protein: 14,
    carbs: 22,
    goodFat: 61,
    badFat: 3
  },
  'Quinoa': {
    kcalPerKg: 3680,
    vitamins: ['B', 'E', 'fiber', 'iron', 'magnesium', 'phosphorus', 'potassium'],
    protein: 15,
    carbs: 70,
    goodFat: 12,
    badFat: 3
  },
  // MEAT & PROTEIN - Requested USDA data
  'Chicken': {
    kcalPerKg: 1020,
    vitamins: ['B', 'phosphorus'],
    protein: 82,
    carbs: 0,
    goodFat: 14,
    badFat: 4
  },
  'Rabbit': {
    kcalPerKg: 1360,
    vitamins: ['B', 'iron', 'phosphorus'],
    protein: 59,
    carbs: 0,
    goodFat: 33,
    badFat: 8
  },
  'Venison': {
    kcalPerKg: 1490,
    vitamins: ['B', 'iron', 'zinc', 'phosphorus'],
    protein: 81,
    carbs: 0,
    goodFat: 14,
    badFat: 5
  },
  'Mutton': {
    kcalPerKg: 2940,
    vitamins: ['B', 'iron', 'zinc', 'phosphorus'],
    protein: 33,
    carbs: 0,
    goodFat: 38,
    badFat: 29
  },
  'Duck': {
    kcalPerKg: 3370,
    vitamins: ['B', 'iron', 'zinc', 'phosphorus'],
    protein: 23,
    carbs: 0,
    goodFat: 48,
    badFat: 29
  },
  'Beef': {
    kcalPerKg: 2540,
    vitamins: ['B', 'iron', 'zinc', 'phosphorus'],
    protein: 27,
    carbs: 0,
    goodFat: 42,
    badFat: 31
  },
  // DAIRY & EGGS - Requested USDA data
  'Cheese': {
    kcalPerKg: 4030,
    vitamins: ['A', 'B', 'calcium', 'phosphorus', 'zinc'],
    protein: 25,
    carbs: 1,
    goodFat: 27,
    badFat: 47
  },
  'Butter': {
    kcalPerKg: 7170,
    vitamins: ['A', 'D', 'E'],
    protein: 0,
    carbs: 0,
    goodFat: 37,
    badFat: 63
  },
  'Cream': {
    kcalPerKg: 3400,
    vitamins: ['A', 'D', 'E', 'calcium'],
    protein: 3,
    carbs: 3,
    goodFat: 35,
    badFat: 59
  },
  'Yogurt': {
    kcalPerKg: 970,
    vitamins: ['A', 'B', 'calcium', 'phosphorus', 'potassium'],
    protein: 37,
    carbs: 16,
    goodFat: 17,
    badFat: 30
  },
  'Goat Milk': {
    kcalPerKg: 690,
    vitamins: ['A', 'B', 'D', 'calcium', 'phosphorus'],
    protein: 20,
    carbs: 26,
    goodFat: 20,
    badFat: 34
  },
  'Goat Cheese': {
    kcalPerKg: 3640,
    vitamins: ['A', 'B', 'calcium', 'phosphorus'],
    protein: 24,
    carbs: 2,
    goodFat: 22,
    badFat: 52
  },
  // Fruits - USDA data
  'Blackberry': {
    // 43 kcal/100g = 430 kcal/kg
    // Macros: 1.4g protein (5.6 kcal), 9.6g carbs (38.4 kcal), 0.5g fat (4.5 kcal) = ~49 kcal
    // Percentages: protein 11%, carbs 79%, fat 10% (sat 0.01g, unsat 0.49g)
    // High in vitamin C, K, fiber, manganese
    kcalPerKg: 430,
    vitamins: ['C', 'K', 'fiber'],
    protein: 11,
    carbs: 79,
    goodFat: 9,
    badFat: 1
  },
  'Raspberry': {
    // 52 kcal/100g = 520 kcal/kg
    // Macros: 1.2g protein (4.8 kcal), 11.9g carbs (47.6 kcal), 0.7g fat (6.3 kcal) = ~59 kcal
    // Percentages: protein 8%, carbs 81%, fat 11% (sat 0.02g, unsat 0.68g)
    // High in vitamin C, fiber, manganese
    kcalPerKg: 520,
    vitamins: ['C', 'fiber'],
    protein: 8,
    carbs: 81,
    goodFat: 10,
    badFat: 1
  },
  'Grape': {
    // 69 kcal/100g = 690 kcal/kg
    // Macros: 0.72g protein (2.9 kcal), 18.1g carbs (72.4 kcal), 0.16g fat (1.4 kcal) = ~77 kcal
    // Percentages: protein 4%, carbs 94%, fat 2% (sat 0.05g, unsat 0.11g)
    // Good source of vitamin K
    kcalPerKg: 690,
    vitamins: ['K', 'C'],
    protein: 4,
    carbs: 94,
    goodFat: 1,
    badFat: 1
  },
  'Melon': {
    // Using cantaloupe: 34 kcal/100g = 340 kcal/kg
    // Macros: 0.84g protein (3.4 kcal), 8.16g carbs (32.6 kcal), 0.19g fat (1.7 kcal) = ~38 kcal
    // Percentages: protein 9%, carbs 89%, fat 2%
    // Very high in vitamin A and C
    kcalPerKg: 340,
    vitamins: ['A', 'C', 'potassium'],
    protein: 9,
    carbs: 89,
    goodFat: 1,
    badFat: 1
  },
  'Orange': {
    // 47 kcal/100g = 470 kcal/kg
    // Macros: 0.94g protein (3.8 kcal), 11.8g carbs (47.2 kcal), 0.12g fat (1.1 kcal) = ~52 kcal
    // Percentages: protein 7%, carbs 91%, fat 2% (sat 0.02g, unsat 0.10g)
    // Excellent source of vitamin C
    kcalPerKg: 470,
    vitamins: ['C', 'potassium'],
    protein: 7,
    carbs: 91,
    goodFat: 1,
    badFat: 1
  },
  'Lemon': {
    // 29 kcal/100g = 290 kcal/kg
    // Macros: 1.1g protein (4.4 kcal), 9.32g carbs (37.3 kcal), 0.3g fat (2.7 kcal) = ~44 kcal
    // Percentages: protein 10%, carbs 85%, fat 5%
    // Very high in vitamin C and fiber
    kcalPerKg: 290,
    vitamins: ['C', 'fiber'],
    protein: 10,
    carbs: 85,
    goodFat: 4,
    badFat: 1
  },
  'Cherry': {
    // 63 kcal/100g = 630 kcal/kg
    // Macros: 1.1g protein (4.4 kcal), 16.0g carbs (64 kcal), 0.2g fat (1.8 kcal) = ~70 kcal
    // Percentages: protein 6%, carbs 91%, fat 3%
    // Good source of vitamin C and potassium
    kcalPerKg: 630,
    vitamins: ['C', 'potassium'],
    protein: 6,
    carbs: 91,
    goodFat: 2,
    badFat: 1
  },
  'Pear': {
    // 57 kcal/100g = 570 kcal/kg
    // Macros: 0.36g protein (1.4 kcal), 15.23g carbs (60.9 kcal), 0.14g fat (1.3 kcal) = ~64 kcal
    // Percentages: protein 2%, carbs 95%, fat 3%
    // Good source of fiber and vitamin C
    kcalPerKg: 570,
    vitamins: ['C', 'K', 'fiber'],
    protein: 2,
    carbs: 95,
    goodFat: 2,
    badFat: 1
  },
  'Peach': {
    // 39 kcal/100g = 390 kcal/kg
    // Macros: 0.91g protein (3.6 kcal), 9.54g carbs (38.2 kcal), 0.25g fat (2.3 kcal) = ~44 kcal
    // Percentages: protein 8%, carbs 87%, fat 5%
    // Good source of vitamin C and A
    kcalPerKg: 390,
    vitamins: ['C', 'A'],
    protein: 8,
    carbs: 87,
    goodFat: 4,
    badFat: 1
  },
  'Plum': {
    // 46 kcal/100g = 460 kcal/kg
    // Macros: 0.7g protein (2.8 kcal), 11.42g carbs (45.7 kcal), 0.28g fat (2.5 kcal) = ~51 kcal
    // Percentages: protein 5%, carbs 90%, fat 5%
    // Good source of vitamin C and A
    kcalPerKg: 460,
    vitamins: ['C', 'A', 'K'],
    protein: 5,
    carbs: 90,
    goodFat: 4,
    badFat: 1
  },
  'Banana': {
    // 89 kcal/100g = 890 kcal/kg
    // Macros: 1.09g protein (4.4 kcal), 22.8g carbs (91.2 kcal), 0.33g fat (3.0 kcal) = ~99 kcal
    // Percentages: protein 4%, carbs 93%, fat 3% (sat 0.11g, unsat 0.22g)
    // Excellent source of potassium and vitamin B6
    kcalPerKg: 890,
    vitamins: ['B', 'C', 'potassium'],
    protein: 4,
    carbs: 93,
    goodFat: 2,
    badFat: 1
  },
  'Pomegranate': {
    // 83 kcal/100g = 830 kcal/kg
    // Macros: 1.67g protein (6.7 kcal), 18.7g carbs (74.8 kcal), 1.17g fat (10.5 kcal) = ~92 kcal
    // Percentages: protein 7%, carbs 81%, fat 12% (mostly unsaturated)
    // Good source of vitamin C, K, fiber, folate, potassium
    kcalPerKg: 830,
    vitamins: ['C', 'K', 'fiber', 'potassium'],
    protein: 7,
    carbs: 81,
    goodFat: 10,
    badFat: 2
  },
  // Vegetables - USDA data
  'Potato': {
    // 77 kcal/100g = 770 kcal/kg
    // Macros: 2.0g protein (8 kcal), 17.5g carbs (70 kcal), 0.1g fat (0.9 kcal) = ~79 kcal
    // Percentages: protein 10%, carbs 89%, fat 1%
    // Good source of vitamin C (33% DV), potassium (12% DV), fiber
    kcalPerKg: 770,
    vitamins: ['C', 'potassium', 'fiber'],
    protein: 10,
    carbs: 89,
    goodFat: 1,
    badFat: 0
  },
  'Sweet Potato': {
    // 86 kcal/100g = 860 kcal/kg
    // Macros: 1.6g protein (6.4 kcal), 20.1g carbs (80.4 kcal), 0.1g fat (0.9 kcal) = ~88 kcal
    // Percentages: protein 7%, carbs 92%, fat 1%
    // Excellent source of vitamin A (156% DV), vitamin C, fiber, potassium
    kcalPerKg: 860,
    vitamins: ['A', 'C', 'fiber', 'potassium'],
    protein: 7,
    carbs: 92,
    goodFat: 1,
    badFat: 0
  },
  'Tomato': {
    // 18 kcal/100g = 180 kcal/kg
    // Macros: 0.9g protein (3.6 kcal), 3.9g carbs (15.6 kcal), 0.2g fat (1.8 kcal) = ~21 kcal
    // Percentages: protein 17%, carbs 75%, fat 8%
    // Good source of vitamin C (28% DV), vitamin A, potassium
    kcalPerKg: 180,
    vitamins: ['C', 'A', 'potassium'],
    protein: 17,
    carbs: 75,
    goodFat: 7,
    badFat: 1
  },
  'Cabbage': {
    // 25 kcal/100g = 250 kcal/kg
    // Macros: 1.3g protein (5.2 kcal), 5.8g carbs (23.2 kcal), 0.1g fat (0.9 kcal) = ~29 kcal
    // Percentages: protein 18%, carbs 80%, fat 2%
    // Good source of vitamin C, vitamin K, fiber
    kcalPerKg: 250,
    vitamins: ['C', 'K', 'fiber'],
    protein: 18,
    carbs: 80,
    goodFat: 1,
    badFat: 1
  },
  'Onion': {
    // 40 kcal/100g = 400 kcal/kg
    // Macros: 1.1g protein (4.4 kcal), 9.34g carbs (37.4 kcal), 0.1g fat (0.9 kcal) = ~43 kcal
    // Percentages: protein 10%, carbs 87%, fat 3%
    // Good source of vitamin C, fiber
    kcalPerKg: 400,
    vitamins: ['C', 'fiber'],
    protein: 10,
    carbs: 87,
    goodFat: 2,
    badFat: 1
  },
  'Garlic': {
    // 149 kcal/100g = 1490 kcal/kg
    // Macros: 6.36g protein (25.4 kcal), 33.06g carbs (132.2 kcal), 0.5g fat (4.5 kcal) = ~162 kcal
    // Percentages: protein 16%, carbs 82%, fat 2%
    // Excellent source of vitamin B6 (95% DV), vitamin C, calcium (18% DV), iron (21% DV)
    kcalPerKg: 1490,
    vitamins: ['B', 'C', 'calcium', 'iron'],
    protein: 16,
    carbs: 82,
    goodFat: 1,
    badFat: 1
  },
  'Pumpkin': {
    // 26 kcal/100g = 260 kcal/kg
    // Macros: 1.0g protein (4 kcal), 6.5g carbs (26 kcal), 0.1g fat (0.9 kcal) = ~31 kcal
    // Percentages: protein 13%, carbs 84%, fat 3%
    // Excellent source of vitamin A (115% DV), good source of vitamin C
    kcalPerKg: 260,
    vitamins: ['A', 'C'],
    protein: 13,
    carbs: 84,
    goodFat: 2,
    badFat: 1
  },
  'Squash': {
    // Using butternut squash: 45 kcal/100g = 450 kcal/kg
    // Macros: 1.0g protein (4 kcal), 11.69g carbs (46.8 kcal), 0.1g fat (0.9 kcal) = ~52 kcal
    // Percentages: protein 8%, carbs 90%, fat 2%
    // Good source of vitamin A, vitamin C, potassium
    kcalPerKg: 450,
    vitamins: ['A', 'C', 'potassium'],
    protein: 8,
    carbs: 90,
    goodFat: 1,
    badFat: 1
  },
  'Beet': {
    // 43 kcal/100g = 430 kcal/kg
    // Macros: 1.61g protein (6.4 kcal), 9.56g carbs (38.2 kcal), 0.17g fat (1.5 kcal) = ~46 kcal
    // Percentages: protein 14%, carbs 83%, fat 3%
    // Good source of folate (27% DV), fiber
    kcalPerKg: 430,
    vitamins: ['fiber', 'potassium'],
    protein: 14,
    carbs: 83,
    goodFat: 2,
    badFat: 1
  },
  'Turnip': {
    // 28 kcal/100g = 280 kcal/kg
    // Macros: 0.9g protein (3.6 kcal), 6.43g carbs (25.7 kcal), 0.1g fat (0.9 kcal) = ~30 kcal
    // Percentages: protein 12%, carbs 86%, fat 2%
    // Good source of vitamin C (23% DV), fiber
    kcalPerKg: 280,
    vitamins: ['C', 'fiber'],
    protein: 12,
    carbs: 86,
    goodFat: 1,
    badFat: 1
  },
  'Radish': {
    // 16 kcal/100g = 160 kcal/kg
    // Macros: 0.68g protein (2.7 kcal), 3.4g carbs (13.6 kcal), 0.1g fat (0.9 kcal) = ~17 kcal
    // Percentages: protein 16%, carbs 80%, fat 4%
    // Good source of vitamin C
    kcalPerKg: 160,
    vitamins: ['C'],
    protein: 16,
    carbs: 80,
    goodFat: 3,
    badFat: 1
  },
  'Pepper': {
    // Using red bell pepper: 31 kcal/100g = 310 kcal/kg
    // Macros: 1.0g protein (4 kcal), 6.0g carbs (24 kcal), 0.3g fat (2.7 kcal) = ~31 kcal
    // Percentages: protein 13%, carbs 77%, fat 10%
    // Excellent source of vitamin C (142% DV), vitamin A (63% DV)
    kcalPerKg: 310,
    vitamins: ['C', 'A'],
    protein: 13,
    carbs: 77,
    goodFat: 8,
    badFat: 2
  },
  'Lettuce': {
    // 15 kcal/100g = 150 kcal/kg
    // Macros: 1.36g protein (5.4 kcal), 2.87g carbs (11.5 kcal), 0.15g fat (1.4 kcal) = ~18 kcal
    // Percentages: protein 30%, carbs 64%, fat 6%
    // Excellent source of vitamin K (105% DV), vitamin A
    kcalPerKg: 150,
    vitamins: ['K', 'A'],
    protein: 30,
    carbs: 64,
    goodFat: 5,
    badFat: 1
  },
  'Spinach': {
    // 23 kcal/100g = 230 kcal/kg
    // Macros: 2.86g protein (11.4 kcal), 3.63g carbs (14.5 kcal), 0.39g fat (3.5 kcal) = ~29 kcal
    // Percentages: protein 39%, carbs 50%, fat 11%
    // Excellent source of vitamin A (188% DV), vitamin K, vitamin C, iron, calcium, potassium
    kcalPerKg: 230,
    vitamins: ['A', 'K', 'C', 'iron', 'calcium', 'potassium'],
    protein: 39,
    carbs: 50,
    goodFat: 9,
    badFat: 2
  },
  'Cucumber': {
    // 15 kcal/100g = 150 kcal/kg
    // Macros: 0.65g protein (2.6 kcal), 3.63g carbs (14.5 kcal), 0.11g fat (1 kcal) = ~18 kcal
    // Percentages: protein 14%, carbs 81%, fat 5%
    // Good source of vitamin K
    kcalPerKg: 150,
    vitamins: ['K'],
    protein: 14,
    carbs: 81,
    goodFat: 4,
    badFat: 1
  },
  'Eggplant': {
    // 25 kcal/100g = 250 kcal/kg
    // Macros: 0.98g protein (3.9 kcal), 5.88g carbs (23.5 kcal), 0.18g fat (1.6 kcal) = ~29 kcal
    // Percentages: protein 13%, carbs 81%, fat 6%
    // Good source of fiber
    kcalPerKg: 250,
    vitamins: ['fiber'],
    protein: 13,
    carbs: 81,
    goodFat: 5,
    badFat: 1
  },

  // PREPARED FOODS - NEW USDA data
  'Bread': {
    // Whole wheat bread: 252 kcal/100g = 2520 kcal/kg
    // Macros: 12.45g protein (50 kcal), 42.71g carbs (171 kcal), 3.5g fat (32 kcal) = ~253 kcal
    // Percentages: protein 20%, carbs 67%, fat 13% (mostly unsaturated)
    kcalPerKg: 2520,
    vitamins: ['B', 'fiber', 'iron'],
    protein: 20,
    carbs: 67,
    goodFat: 10,
    badFat: 3
  },
  'Stew': {
    // Beef stew: ~100 kcal/100g = 1000 kcal/kg
    // Macros: 4g protein (16 kcal), 8g carbs (32 kcal), 6g fat (54 kcal) = ~102 kcal
    // Percentages: protein 16%, carbs 31%, fat 53%
    kcalPerKg: 1000,
    vitamins: ['B', 'iron'],
    protein: 16,
    carbs: 31,
    goodFat: 35,
    badFat: 18
  },
  'Soup': {
    // Vegetable soup: ~65 kcal/100g = 650 kcal/kg
    // Macros: 2.2g protein (9 kcal), 10g carbs (40 kcal), 2g fat (18 kcal) = ~67 kcal
    // Percentages: protein 13%, carbs 60%, fat 27%
    kcalPerKg: 650,
    vitamins: ['A', 'C', 'potassium'],
    protein: 13,
    carbs: 60,
    goodFat: 22,
    badFat: 5
  },
  'Roasted Meat': {
    // Roasted beef/pork: ~230 kcal/100g = 2300 kcal/kg
    // Macros: 26g protein (104 kcal), 0g carbs, 14g fat (126 kcal) = ~230 kcal
    // Percentages: protein 45%, carbs 0%, fat 55%
    kcalPerKg: 2300,
    vitamins: ['B', 'iron', 'zinc'],
    protein: 45,
    carbs: 0,
    goodFat: 40,
    badFat: 15
  },
  'Pie': {
    // Apple pie: 265 kcal/100g = 2650 kcal/kg
    // Macros: 2g protein (8 kcal), 37g carbs (148 kcal), 12g fat (108 kcal) = ~264 kcal
    // Percentages: protein 3%, carbs 56%, fat 41%
    kcalPerKg: 2650,
    vitamins: ['iron'],
    protein: 3,
    carbs: 56,
    goodFat: 32,
    badFat: 9
  },
  'Cake': {
    // Chocolate/vanilla cake: ~375 kcal/100g = 3750 kcal/kg
    // Macros: 4g protein (16 kcal), 52g carbs (208 kcal), 18g fat (162 kcal) = ~386 kcal
    // Percentages: protein 4%, carbs 54%, fat 42%
    kcalPerKg: 3750,
    vitamins: ['B', 'calcium'],
    protein: 4,
    carbs: 54,
    goodFat: 32,
    badFat: 10
  },
  'Porridge': {
    // Cooked oatmeal: 63 kcal/100g = 630 kcal/kg
    // Macros: 2.5g protein (10 kcal), 11g carbs (44 kcal), 1g fat (9 kcal) = ~63 kcal
    // Percentages: protein 16%, carbs 70%, fat 14%
    kcalPerKg: 630,
    vitamins: ['B', 'iron', 'magnesium', 'fiber'],
    protein: 16,
    carbs: 70,
    goodFat: 11,
    badFat: 3
  },
  'Dough': {
    // Bread/pizza dough: ~260 kcal/100g = 2600 kcal/kg
    // Macros: 10g protein (40 kcal), 50g carbs (200 kcal), 2g fat (18 kcal) = ~258 kcal
    // Percentages: protein 15%, carbs 78%, fat 7%
    kcalPerKg: 2600,
    vitamins: ['B', 'iron'],
    protein: 15,
    carbs: 78,
    goodFat: 5,
    badFat: 2
  },
  'Flour': {
    // All-purpose flour: 364 kcal/100g = 3640 kcal/kg
    // Macros: 10.33g protein (41 kcal), 76.31g carbs (305 kcal), 0.98g fat (9 kcal) = ~355 kcal
    // Percentages: protein 12%, carbs 86%, fat 2%
    kcalPerKg: 3640,
    vitamins: ['B', 'iron'],
    protein: 12,
    carbs: 86,
    goodFat: 1,
    badFat: 1
  },
  'Cookies': {
    // Chocolate chip cookies: ~470 kcal/100g = 4700 kcal/kg
    // Macros: 5g protein (20 kcal), 63g carbs (252 kcal), 22g fat (198 kcal) = ~470 kcal
    // Percentages: protein 4%, carbs 54%, fat 42%
    kcalPerKg: 4700,
    vitamins: ['B', 'iron'],
    protein: 4,
    carbs: 54,
    goodFat: 32,
    badFat: 10
  },
  'Jam': {
    // Fruit preserves: 278 kcal/100g = 2780 kcal/kg
    // Macros: 0.37g protein (1.5 kcal), 69g carbs (276 kcal), 0.1g fat (0.9 kcal) = ~278 kcal
    // Percentages: protein 1%, carbs 99%, fat 0%
    kcalPerKg: 2780,
    vitamins: [],
    protein: 1,
    carbs: 99,
    goodFat: 0,
    badFat: 0
  },
  'Pickled Vegetables': {
    // Pickled cucumber: 11 kcal/100g = 110 kcal/kg
    // Macros: 0.33g protein (1.3 kcal), 2.4g carbs (9.6 kcal), 0.2g fat (1.8 kcal) = ~13 kcal
    // Percentages: protein 10%, carbs 74%, fat 16%
    kcalPerKg: 110,
    vitamins: ['K'],
    protein: 10,
    carbs: 74,
    goodFat: 12,
    badFat: 4
  },
  'Smoked Meat': {
    // Smoked beef/pork: ~265 kcal/100g = 2650 kcal/kg
    // Macros: 26g protein (104 kcal), 0g carbs, 17g fat (153 kcal) = ~257 kcal
    // Percentages: protein 40%, carbs 0%, fat 60%
    kcalPerKg: 2650,
    vitamins: ['B', 'iron', 'zinc'],
    protein: 40,
    carbs: 0,
    goodFat: 45,
    badFat: 15
  },
  'Smoked Fish': {
    // Smoked salmon: 117 kcal/100g = 1170 kcal/kg
    // Macros: 18.28g protein (73 kcal), 0g carbs, 4.6g fat (41 kcal) = ~114 kcal
    // Percentages: protein 64%, carbs 0%, fat 36%
    kcalPerKg: 1170,
    vitamins: ['B', 'D'],
    protein: 64,
    carbs: 0,
    goodFat: 33,
    badFat: 3
  },
  'Salted Meat': {
    // Corned beef: ~250 kcal/100g = 2500 kcal/kg
    // Macros: 27g protein (108 kcal), 0g carbs, 15g fat (135 kcal) = ~243 kcal
    // Percentages: protein 44%, carbs 0%, fat 56%
    kcalPerKg: 2500,
    vitamins: ['B', 'zinc'],
    protein: 44,
    carbs: 0,
    goodFat: 40,
    badFat: 16
  },
  'Sausage': {
    // Pork sausage: ~340 kcal/100g = 3400 kcal/kg
    // Macros: 14g protein (56 kcal), 0g carbs, 31g fat (279 kcal) = ~335 kcal
    // Percentages: protein 17%, carbs 0%, fat 83%
    kcalPerKg: 3400,
    vitamins: ['B', 'zinc', 'iron'],
    protein: 17,
    carbs: 0,
    goodFat: 54,
    badFat: 29
  },

  // FORAGED FOODS - NEW USDA data
  'Mushroom': {
    // White mushrooms: 22 kcal/100g = 220 kcal/kg
    // Macros: 3.09g protein (12 kcal), 3.26g carbs (13 kcal), 0.34g fat (3 kcal) = ~28 kcal
    // Percentages: protein 43%, carbs 46%, fat 11%
    kcalPerKg: 220,
    vitamins: ['B', 'D'],
    protein: 43,
    carbs: 46,
    goodFat: 9,
    badFat: 2
  },
  'Wild Berries': {
    // Wild blueberries/blackberries: ~50 kcal/100g = 500 kcal/kg
    // Macros: 1g protein (4 kcal), 12g carbs (48 kcal), 0.3g fat (3 kcal) = ~55 kcal
    // Percentages: protein 7%, carbs 87%, fat 6%
    kcalPerKg: 500,
    vitamins: ['C', 'K', 'fiber'],
    protein: 7,
    carbs: 87,
    goodFat: 5,
    badFat: 1
  },
  'Acorn': {
    // Raw acorns: 387 kcal/100g = 3870 kcal/kg
    // Macros: 6.15g protein (25 kcal), 41g carbs (164 kcal), 24g fat (216 kcal) = ~405 kcal
    // Percentages: protein 6%, carbs 40%, fat 54%
    kcalPerKg: 3870,
    vitamins: ['B', 'potassium'],
    protein: 6,
    carbs: 40,
    goodFat: 49,
    badFat: 5
  },
  'Walnut': {
    // English walnuts: 654 kcal/100g = 6540 kcal/kg
    // Macros: 15g protein (60 kcal), 14g carbs (56 kcal), 65g fat (585 kcal) = ~701 kcal
    // Percentages: protein 9%, carbs 8%, fat 83%
    kcalPerKg: 6540,
    vitamins: ['B', 'E', 'magnesium', 'phosphorus'],
    protein: 9,
    carbs: 8,
    goodFat: 75,
    badFat: 8
  },
  'Chestnut': {
    // Roasted chestnuts: 245 kcal/100g = 2450 kcal/kg
    // Macros: 3.17g protein (13 kcal), 53g carbs (212 kcal), 2.2g fat (20 kcal) = ~245 kcal
    // Percentages: protein 5%, carbs 87%, fat 8%
    kcalPerKg: 2450,
    vitamins: ['B', 'C', 'potassium'],
    protein: 5,
    carbs: 87,
    goodFat: 6,
    badFat: 2
  },
  'Hazelnut': {
    // Hazelnuts: 628 kcal/100g = 6280 kcal/kg
    // Macros: 15g protein (60 kcal), 17g carbs (68 kcal), 61g fat (549 kcal) = ~677 kcal
    // Percentages: protein 9%, carbs 10%, fat 81%
    kcalPerKg: 6280,
    vitamins: ['E', 'B', 'magnesium'],
    protein: 9,
    carbs: 10,
    goodFat: 74,
    badFat: 7
  },
  'Honey': {
    // Honey: 304 kcal/100g = 3040 kcal/kg
    // Macros: 0.3g protein (1.2 kcal), 82g carbs (328 kcal), 0g fat = ~329 kcal
    // Percentages: protein 0%, carbs 100%, fat 0%
    kcalPerKg: 3040,
    vitamins: [],
    protein: 0,
    carbs: 100,
    goodFat: 0,
    badFat: 0
  },
  'Wild Herbs': {
    // Dandelion greens/lamb's quarters: 40 kcal/100g = 400 kcal/kg
    // Macros: 2.7g protein (11 kcal), 9g carbs (36 kcal), 0.7g fat (6 kcal) = ~53 kcal
    // Percentages: protein 21%, carbs 68%, fat 11%
    kcalPerKg: 400,
    vitamins: ['A', 'C', 'K', 'calcium', 'iron'],
    protein: 21,
    carbs: 68,
    goodFat: 9,
    badFat: 2
  },

  // SEEDS & NUTS - NEW USDA data
  'Sunflower Seeds': {
    // Dried sunflower seeds: 584 kcal/100g = 5840 kcal/kg
    // Macros: 20.78g protein (83 kcal), 20g carbs (80 kcal), 51.46g fat (463 kcal) = ~626 kcal
    // Percentages: protein 13%, carbs 13%, fat 74%
    kcalPerKg: 5840,
    vitamins: ['B', 'E', 'iron', 'magnesium'],
    protein: 13,
    carbs: 13,
    goodFat: 67,
    badFat: 7
  },
  'Pumpkin Seeds': {
    // Dried pumpkin seeds: 541 kcal/100g = 5410 kcal/kg
    // Macros: 30g protein (120 kcal), 18g carbs (72 kcal), 46g fat (414 kcal) = ~606 kcal
    // Percentages: protein 20%, carbs 12%, fat 68%
    kcalPerKg: 5410,
    vitamins: ['E', 'magnesium', 'zinc', 'iron'],
    protein: 20,
    carbs: 12,
    goodFat: 61,
    badFat: 7
  },
  'Almond': {
    // Almonds: 579 kcal/100g = 5790 kcal/kg
    // Macros: 21.15g protein (85 kcal), 22g carbs (88 kcal), 50g fat (450 kcal) = ~623 kcal
    // Percentages: protein 14%, carbs 14%, fat 72%
    kcalPerKg: 5790,
    vitamins: ['E', 'B', 'calcium', 'magnesium', 'fiber'],
    protein: 14,
    carbs: 14,
    goodFat: 65,
    badFat: 7
  },
  'Peanut': {
    // Raw peanuts: 567 kcal/100g = 5670 kcal/kg
    // Macros: 25.8g protein (103 kcal), 21g carbs (84 kcal), 50g fat (450 kcal) = ~637 kcal
    // Percentages: protein 16%, carbs 13%, fat 71%
    kcalPerKg: 5670,
    vitamins: ['B', 'E', 'magnesium', 'phosphorus'],
    protein: 16,
    carbs: 13,
    goodFat: 64,
    badFat: 7
  },
  'Pine Nut': {
    // Dried pine nuts: 673 kcal/100g = 6730 kcal/kg
    // Macros: 13.69g protein (55 kcal), 13g carbs (52 kcal), 68g fat (612 kcal) = ~719 kcal
    // Percentages: protein 8%, carbs 7%, fat 85%
    kcalPerKg: 6730,
    vitamins: ['E', 'magnesium', 'zinc', 'iron'],
    protein: 8,
    carbs: 7,
    goodFat: 78,
    badFat: 7
  },
  'Flax Seeds': {
    // Flaxseed: 534 kcal/100g = 5340 kcal/kg
    // Macros: 18.29g protein (73 kcal), 29g carbs (116 kcal), 42g fat (378 kcal) = ~567 kcal
    // Percentages: protein 13%, carbs 20%, fat 67%
    kcalPerKg: 5340,
    vitamins: ['B', 'E', 'fiber', 'magnesium'],
    protein: 13,
    carbs: 20,
    goodFat: 62,
    badFat: 5
  }
};

async function updateFoodNutrition() {
  console.log('=== Food Nutrition Update Script ===\n');

  // Validate Firebase configuration
  if (!firebaseConfig.apiKey) {
    console.error('Error: Firebase configuration is missing.');
    console.error('Please ensure VITE_FIREBASE_* environment variables are set in .env file.');
    process.exit(1);
  }

  console.log('Connecting to Firebase...');
  console.log(`Project ID: ${firebaseConfig.projectId}`);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // Read current definitions from Firestore
    console.log('\nReading definitions from Firestore...');
    const docRef = doc(db, 'definitions', 'global');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error('Error: definitions/global document does not exist in Firestore.');
      console.log('You may need to save definitions from the game editor first.');
      process.exit(1);
    }

    const data = docSnap.data();
    const resources: ResourceDefinition[] = data.resources || [];

    console.log(`Found ${resources.length} total resources.`);

    // Filter food items
    const foodResources = resources.filter(r => r.category === 'food');
    console.log(`Found ${foodResources.length} food resources.\n`);

    // Track which foods need research
    const foodsNeedingResearch: string[] = [];
    let updatedCount = 0;

    // Update each food resource with nutritional data
    const updatedResources = resources.map(resource => {
      if (resource.category !== 'food') {
        return resource;
      }

      const nutritionInfo = nutritionData[resource.name];

      if (nutritionInfo) {
        console.log(`Updating: ${resource.name}`);
        console.log(`  kcal/kg: ${nutritionInfo.kcalPerKg}`);
        console.log(`  Vitamins: ${nutritionInfo.vitamins.join(', ')}`);
        console.log(`  Protein: ${nutritionInfo.protein}%, Carbs: ${nutritionInfo.carbs}%`);
        console.log(`  Good Fat: ${nutritionInfo.goodFat}%, Bad Fat: ${nutritionInfo.badFat}%`);
        console.log('');
        updatedCount++;
        return {
          ...resource,
          nutrition: nutritionInfo
        };
      } else {
        foodsNeedingResearch.push(resource.name);
        console.log(`No nutrition data for: ${resource.name} (keeping existing values)`);
        return resource;
      }
    });

    // Update Firestore with the new data
    console.log('\nUpdating Firestore...');
    await updateDoc(docRef, {
      resources: updatedResources
    });

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Updated ${updatedCount} food resources with nutritional data.`);

    if (foodsNeedingResearch.length > 0) {
      console.log(`\n${foodsNeedingResearch.length} food item(s) need nutritional research:`);
      foodsNeedingResearch.forEach(name => {
        console.log(`  - ${name}`);
      });
    } else {
      console.log('All food items have nutritional data.');
    }

    console.log('\nDone!');
    process.exit(0);

  } catch (error) {
    console.error('Error updating nutrition data:', error);
    process.exit(1);
  }
}

// Run the script
updateFoodNutrition();
