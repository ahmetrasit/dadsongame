import { create } from 'zustand';
import { galleryService, type GalleryItem } from '@/services/GalleryService';

interface GalleryStore {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGallery: () => Promise<void>;
  saveSprite: (name: string, pixels: string[][], tilesUsed: { rows: number; cols: number }) => Promise<GalleryItem>;
  updateSprite: (id: string, pixels: string[][], tilesUsed: { rows: number; cols: number }) => Promise<GalleryItem>;
  renameSprite: (id: string, newName: string) => Promise<void>;
  deleteSprite: (id: string) => Promise<void>;
  getSprite: (id: string) => GalleryItem | undefined;
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
      const item = await galleryService.saveSprite({ name, pixels, tilesUsed });
      set(state => ({
        items: [item, ...state.items.filter(i => i.id !== item.id)],
      }));
      return item;
    } catch (error) {
      console.error('Failed to save sprite:', error);
      throw error;
    }
  },

  updateSprite: async (id, pixels, tilesUsed) => {
    const existing = get().items.find(i => i.id === id);
    if (!existing) throw new Error('Sprite not found');

    try {
      const item = await galleryService.saveSprite({ id, name: existing.name, pixels, tilesUsed });
      set(state => ({
        items: state.items.map(i => i.id === id ? item : i),
      }));
      return item;
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
}));
