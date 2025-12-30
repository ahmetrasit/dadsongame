import { create } from 'zustand';
import { galleryService, type GalleryItem } from '@/services/GalleryService';

interface SaveSpriteResult {
  item: GalleryItem;
  savedToFirebase: boolean;
  error?: string;
}

interface GalleryStore {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGallery: () => Promise<void>;
  saveSprite: (name: string, pixels: string[][], tilesUsed: { rows: number; cols: number }) => Promise<SaveSpriteResult>;
  updateSprite: (id: string, pixels: string[][], tilesUsed: { rows: number; cols: number }) => Promise<SaveSpriteResult>;
  renameSprite: (id: string, newName: string) => Promise<void>;
  deleteSprite: (id: string) => Promise<void>;
  getSprite: (id: string) => GalleryItem | undefined;
  syncLocalToFirebase: () => Promise<{ synced: number; failed: number; errors: string[] }>;
  getLocalStorageCount: () => number;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadGallery: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await galleryService.loadGallery();
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load gallery:', error);
      set({ error: 'Failed to load gallery', isLoading: false });
    }
  },

  saveSprite: async (name, pixels, tilesUsed) => {
    try {
      const result = await galleryService.saveSprite({ name, pixels, tilesUsed });
      set(state => ({
        items: [result.item, ...state.items.filter(i => i.id !== result.item.id)],
      }));
      return result;
    } catch (error) {
      console.error('Failed to save sprite:', error);
      throw error;
    }
  },

  updateSprite: async (id, pixels, tilesUsed) => {
    const existing = get().items.find(i => i.id === id);
    if (!existing) throw new Error('Sprite not found');

    try {
      const result = await galleryService.saveSprite({ id, name: existing.name, pixels, tilesUsed });
      set(state => ({
        items: state.items.map(i => i.id === id ? result.item : i),
      }));
      return result;
    } catch (error) {
      console.error('Failed to update sprite:', error);
      throw error;
    }
  },

  renameSprite: async (id, newName) => {
    try {
      await galleryService.renameSprite(id, newName);
      set(state => ({
        items: state.items.map(i =>
          i.id === id ? { ...i, name: newName, updatedAt: new Date().toISOString() } : i
        ),
      }));
    } catch (error) {
      console.error('Failed to rename sprite:', error);
      throw error;
    }
  },

  deleteSprite: async (id) => {
    try {
      await galleryService.deleteSprite(id);
      set(state => ({
        items: state.items.filter(i => i.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete sprite:', error);
      throw error;
    }
  },

  getSprite: (id) => {
    return get().items.find(i => i.id === id);
  },

  syncLocalToFirebase: async () => {
    const result = await galleryService.syncLocalToFirebase();
    // Reload gallery after sync to get latest data
    if (result.synced > 0) {
      const items = await galleryService.loadGallery();
      set({ items });
    }
    return result;
  },

  getLocalStorageCount: () => {
    return galleryService.getLocalStorageCount();
  },
}));
