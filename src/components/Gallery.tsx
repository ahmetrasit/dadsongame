import { useEffect, useState, useRef } from 'react';
import { useGalleryStore } from '@/stores/galleryStore';
import type { GalleryItem } from '@/services/GalleryService';

interface GalleryProps {
  onClose: () => void;
  onEditSprite: (pixels: string[][]) => void;
}

const PIXEL_SIZE = 4; // Display size for gallery thumbnails

export function Gallery({ onClose, onEditSprite }: GalleryProps) {
  const { items, isLoading, loadGallery, renameSprite, deleteSprite, syncLocalToFirebase, getLocalStorageCount } = useGalleryStore();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
    setLocalCount(getLocalStorageCount());
  }, [loadGallery, getLocalStorageCount]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Syncing...');
    try {
      const result = await syncLocalToFirebase();
      if (result.synced > 0) {
        setSyncMessage(`Synced ${result.synced} sprite(s) to Firebase!`);
        setLocalCount(getLocalStorageCount());
      } else if (result.failed > 0) {
        setSyncMessage(`Failed to sync: ${result.errors[0]}`);
      } else {
        setSyncMessage('No sprites to sync');
      }
    } catch (error) {
      setSyncMessage('Sync failed');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const handleSpriteClick = (item: GalleryItem) => {
    const now = Date.now();
    const lastClick = lastClickRef.current;

    // Check for double-click (within 300ms on same item)
    if (lastClick && lastClick.id === item.id && now - lastClick.time < 300) {
      // Double-click - open in editor
      onEditSprite(item.pixels);
      lastClickRef.current = null;
    } else {
      // Single click - record for potential double-click
      lastClickRef.current = { id: item.id, time: now };
    }
  };

  const handleNameClick = (e: React.MouseEvent, item: GalleryItem) => {
    e.stopPropagation();
    setEditingName(item.id);
    setNewName(item.name);
  };

  const handleNameSave = async (id: string) => {
    if (newName.trim()) {
      await renameSprite(id, newName.trim());
    }
    setEditingName(null);
    setNewName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleNameSave(id);
    } else if (e.key === 'Escape') {
      setEditingName(null);
      setNewName('');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this sprite?')) {
      await deleteSprite(id);
    }
  };

  // Render sprite preview at actual tile size
  const renderSpritePreview = (item: GalleryItem) => {
    const { rows, cols } = item.tilesUsed;
    const width = cols * 16 * PIXEL_SIZE;
    const height = rows * 16 * PIXEL_SIZE;

    return (
      <div
        style={{
          width,
          height,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols * 16}, ${PIXEL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows * 16}, ${PIXEL_SIZE}px)`,
          background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: rows * 16 }).map((_, row) =>
          Array.from({ length: cols * 16 }).map((_, col) => {
            const color = item.pixels[row]?.[col];
            if (!color || color === 'transparent') return null;
            return (
              <div
                key={`${row}-${col}`}
                style={{
                  gridRow: row + 1,
                  gridColumn: col + 1,
                  backgroundColor: color,
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#FFF1E5',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0D0D0D', margin: 0 }}>
          Sprite Gallery
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {syncMessage && (
            <span style={{ fontSize: '13px', color: syncMessage.includes('failed') || syncMessage.includes('Failed') ? '#ef4444' : '#22c55e' }}>
              {syncMessage}
            </span>
          )}
          {localCount > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 'bold',
                background: isSyncing ? '#ccc' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: isSyncing ? 'wait' : 'pointer',
              }}
            >
              {isSyncing ? 'Syncing...' : `Sync ${localCount} local`}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              background: '#E8DDD1',
              border: 'none',
              borderRadius: '6px',
              color: '#333',
              cursor: 'pointer',
            }}
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Gallery Content */}
      <div
        style={{
          flex: 1,
          padding: '30px 40px',
          overflowY: 'auto',
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '16px', marginTop: '60px' }}>
            Loading gallery...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '16px', marginTop: '60px' }}>
            <p>No sprites saved yet.</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Create sprites in the Sprite Editor and click "Save to Gallery" to add them here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSpriteClick(item)}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '120px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* Sprite Preview */}
                <div style={{ marginBottom: '12px' }}>
                  {renderSpritePreview(item)}
                </div>

                {/* Name */}
                {editingName === item.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleNameSave(item.id)}
                    onKeyDown={(e) => handleNameKeyDown(e, item.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #3b82f6',
                      borderRadius: '4px',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    onClick={(e) => handleNameClick(e, item)}
                    style={{
                      fontSize: '12px',
                      color: '#333',
                      textAlign: 'center',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'text',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {item.name}
                  </div>
                )}

                {/* Size info */}
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                  {item.tilesUsed.cols}x{item.tilesUsed.rows} tiles
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    background: 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    color: '#888',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '16px 40px',
          borderTop: '1px solid #ddd',
          background: '#fff',
          fontSize: '13px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        Double-click a sprite to edit it. Click the name to rename.
      </div>
    </div>
  );
}
