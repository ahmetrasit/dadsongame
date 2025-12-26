import { useMapEditorStore, EditorTool } from '@/stores/mapEditorStore';

const tools: { id: EditorTool; label: string; key: string }[] = [
  { id: 'tree', label: 'Tree', key: '1' },
  { id: 'river', label: 'River', key: '2' },
  { id: 'spawn', label: 'Spawn', key: '3' },
  { id: 'eraser', label: 'Eraser', key: '4' },
];

export function EditorToolbar() {
  const { isEditing, currentTool, setTool, activeRiver, closeRiver, cancelRiver, exportMap, clearMap } = useMapEditorStore();

  if (!isEditing) return null;

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportMap();
    console.log('Map data:', json);
    try {
      await navigator.clipboard.writeText(json);
      alert('Map copied to clipboard!');
    } catch {
      // Fallback: show in prompt for manual copy
      prompt('Copy map data:', json);
    }
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Map Editor (E to toggle)
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            style={{
              padding: '6px 10px',
              background: currentTool === tool.id ? '#3b82f6' : '#444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {tool.label} ({tool.key})
          </button>
        ))}
      </div>

      {currentTool === 'river' && activeRiver.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <span>Points: {activeRiver.length} </span>
          <button
            onClick={closeRiver}
            disabled={activeRiver.length < 3}
            style={{
              padding: '4px 8px',
              background: activeRiver.length >= 3 ? '#22c55e' : '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: activeRiver.length >= 3 ? 'pointer' : 'not-allowed',
              marginRight: '4px',
            }}
          >
            Close (Enter)
          </button>
          <button
            onClick={cancelRiver}
            style={{
              padding: '4px 8px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleExport}
          style={{
            padding: '6px 10px',
            background: '#22c55e',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Export
        </button>
        <button
          onClick={clearMap}
          style={{
            padding: '6px 10px',
            background: '#ef4444',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
        Click to place | Right-click to cancel
      </div>
    </div>
  );
}
