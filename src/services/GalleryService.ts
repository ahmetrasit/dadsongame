import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from './FirebaseMultiplayerService';

export interface GalleryItem {
  id: string;
  name: string;
  pixels: string[][]; // 48x48 grid of colors
  tilesUsed: { rows: number; cols: number }; // How many tiles the sprite uses
  createdAt: string;
  updatedAt: string;
}

/**
 * Gallery Service
 * Handles saving and loading sprites to/from Firebase Firestore
 */
class GalleryService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private initialized = false;

  /**
   * Initialize Firebase if not already done
   */
  private initializeFirebase(): boolean {
    if (this.initialized && this.db) return true;

    if (!firebaseConfig.apiKey) {
      console.warn('[GalleryService] Firebase not configured, using localStorage only');
      return false;
    }

    try {
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApp();
      }
      this.db = getFirestore(this.app);
      this.initialized = true;
      console.log('[GalleryService] Firebase initialized');
      return true;
    } catch (error) {
      console.error('[GalleryService] Firebase initialization failed:', error);
      return false;
    }
  }

  /**
   * Load all gallery items from Firestore
   */
  async loadGallery(): Promise<GalleryItem[]> {
    if (!this.initializeFirebase() || !this.db) {
      // Fallback to localStorage
      return this.loadFromLocalStorage();
    }

    try {
      const galleryRef = collection(this.db, 'gallery');
      const snapshot = await getDocs(galleryRef);

      const items: GalleryItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<GalleryItem, 'id'>;
        items.push({
          id: doc.id,
          ...data,
        });
      });

      // Sort by updatedAt descending (newest first)
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      console.log(`[GalleryService] Loaded ${items.length} items from Firebase`);
      return items;
    } catch (error) {
      console.error('[GalleryService] Error loading gallery:', error);
      return this.loadFromLocalStorage();
    }
  }

  /**
   * Save a sprite to the gallery
   */
  async saveSprite(item: Omit<GalleryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<GalleryItem> {
    const now = new Date().toISOString();
    const id = item.id || `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const galleryItem: GalleryItem = {
      id,
      name: item.name,
      pixels: item.pixels,
      tilesUsed: item.tilesUsed,
      createdAt: item.id ? (await this.getItem(item.id))?.createdAt || now : now,
      updatedAt: now,
    };

    if (!this.initializeFirebase() || !this.db) {
      // Fallback to localStorage
      this.saveToLocalStorage(galleryItem);
      return galleryItem;
    }

    try {
      const docRef = doc(this.db, 'gallery', id);
      await setDoc(docRef, {
        name: galleryItem.name,
        pixels: galleryItem.pixels,
        tilesUsed: galleryItem.tilesUsed,
        createdAt: galleryItem.createdAt,
        updatedAt: galleryItem.updatedAt,
      });

      console.log(`[GalleryService] Saved sprite "${galleryItem.name}" to Firebase`);

      // Also save to localStorage as backup
      this.saveToLocalStorage(galleryItem);

      return galleryItem;
    } catch (error) {
      console.error('[GalleryService] Error saving sprite:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(galleryItem);
      return galleryItem;
    }
  }

  /**
   * Get a single item by ID
   */
  async getItem(id: string): Promise<GalleryItem | null> {
    if (!this.initializeFirebase() || !this.db) {
      const items = this.loadFromLocalStorage();
      return items.find(item => item.id === id) || null;
    }

    try {
      const docRef = doc(this.db, 'gallery', id);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as Omit<GalleryItem, 'id'>;
        return { id: snapshot.id, ...data };
      }
      return null;
    } catch (error) {
      console.error('[GalleryService] Error getting item:', error);
      return null;
    }
  }

  /**
   * Delete a sprite from the gallery
   */
  async deleteSprite(id: string): Promise<boolean> {
    if (!this.initializeFirebase() || !this.db) {
      this.deleteFromLocalStorage(id);
      return true;
    }

    try {
      const docRef = doc(this.db, 'gallery', id);
      await deleteDoc(docRef);

      // Also remove from localStorage
      this.deleteFromLocalStorage(id);

      console.log(`[GalleryService] Deleted sprite ${id}`);
      return true;
    } catch (error) {
      console.error('[GalleryService] Error deleting sprite:', error);
      return false;
    }
  }

  /**
   * Rename a sprite
   */
  async renameSprite(id: string, newName: string): Promise<boolean> {
    const item = await this.getItem(id);
    if (!item) return false;

    await this.saveSprite({ ...item, name: newName });
    return true;
  }

  // LocalStorage fallback methods
  private loadFromLocalStorage(): GalleryItem[] {
    try {
      const data = localStorage.getItem('sprite_gallery');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[GalleryService] Error loading from localStorage:', error);
    }
    return [];
  }

  private saveToLocalStorage(item: GalleryItem): void {
    try {
      const items = this.loadFromLocalStorage();
      const existingIndex = items.findIndex(i => i.id === item.id);

      if (existingIndex >= 0) {
        items[existingIndex] = item;
      } else {
        items.unshift(item); // Add to beginning
      }

      localStorage.setItem('sprite_gallery', JSON.stringify(items));
    } catch (error) {
      console.error('[GalleryService] Error saving to localStorage:', error);
    }
  }

  private deleteFromLocalStorage(id: string): void {
    try {
      const items = this.loadFromLocalStorage();
      const filtered = items.filter(i => i.id !== id);
      localStorage.setItem('sprite_gallery', JSON.stringify(filtered));
    } catch (error) {
      console.error('[GalleryService] Error deleting from localStorage:', error);
    }
  }

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return this.initializeFirebase();
  }
}

// Singleton instance
export const galleryService = new GalleryService();
