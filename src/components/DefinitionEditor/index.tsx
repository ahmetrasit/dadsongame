import { useEffect, useState } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { TreeSidebar } from './TreeSidebar';
import { PlantForm } from './PlantForm';
import { AnimalForm } from './AnimalForm';
import { ResourceForm } from './ResourceForm';

interface DefinitionEditorProps {
  initialTab?: 'plants' | 'animals' | 'resources';
  onClose?: () => void;
}

export function DefinitionEditor({ initialTab, onClose }: DefinitionEditorProps = {}) {
  const {
    isEditorOpen,
    activeTab,
    selectedId,
    plants,
    animals,
    resources,
    draftPlant,
    draftAnimal,
    draftResource,
    closeEditor,
    setActiveTab,
    selectItem,
    addPlant,
    addAnimal,
    addResource,
    savePlant,
    saveAnimal,
    saveResource,
    cancelPlant,
    cancelAnimal,
    cancelResource,
    exportDefinitions,
    importDefinitions,
  } = useDefinitionsStore();

  // Set initial tab if provided
  useEffect(() => {
    if (initialTab && isEditorOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isEditorOpen, setActiveTab]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorOpen) {
        if (onClose) {
          onClose();
        } else {
          closeEditor();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isEditorOpen, closeEditor, onClose]);

  if (!isEditorOpen) return null;

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportDefinitions();
    try {
      await navigator.clipboard.writeText(json);
      alert('Definitions copied to clipboard!');
    } catch {
      prompt('Copy definitions:', json);
    }
  };

  const handleImport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = prompt('Paste definitions JSON:');
    if (json) {
      importDefinitions(json);
      alert('Definitions imported!');
    }
  };

  // Tree state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['food', 'tree', 'crop', 'livestock', 'poultry'])
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get current items based on active tab
  const currentItems = activeTab === 'plants'
    ? plants
    : activeTab === 'animals'
    ? animals
    : resources;

  const selectedItem = currentItems.find((item) => item.id === selectedId);

  // Handlers for Add New
  const handleAddNew = () => {
    if (activeTab === 'plants') addPlant();
    else if (activeTab === 'animals') addAnimal();
    else addResource();
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
        zIndex: 1000,
        color: '#333',
        fontFamily: '"Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '14px',
      }}
      onClick={stopProp}
      onMouseDown={stopProp}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Header with tabs */}
      <div style={{ padding: '20px', borderBottom: '1px solid #D4C4B0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0D0D0D' }}>
            Definition Editor (Shift+D to toggle)
          </div>
          <button
            onClick={() => onClose ? onClose() : closeEditor()}
            style={{
              padding: '8px 16px',
              background: '#990F3D',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Close (ESC)
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['plants', 'animals', 'resources'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? '#0D0D0D' : '#E8DDD1',
                border: 'none',
                borderRadius: '4px',
                color: activeTab === tab ? '#FFF1E5' : '#333',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'resources' ? 'Materials' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div
          style={{
            width: '250px',
            borderRight: '1px solid #D4C4B0',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          {/* Tree structure */}
          {activeTab === 'resources' && (
            <TreeSidebar
              categories={['food', 'water', 'metal', 'rock', 'wood', 'organics']}
              items={resources}
              getCategory={(item: any) => item.category}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              selectedId={selectedId}
              selectItem={selectItem}
            />
          )}
          {activeTab === 'plants' && (
            <TreeSidebar
              categories={['tree', 'crop', 'flower', 'bush']}
              items={plants}
              getCategory={(item: any) => item.subCategory}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              selectedId={selectedId}
              selectItem={selectItem}
            />
          )}
          {activeTab === 'animals' && (
            <TreeSidebar
              categories={['livestock', 'poultry', 'wild', 'pet']}
              items={animals}
              getCategory={(item: any) => item.subCategory}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              selectedId={selectedId}
              selectItem={selectItem}
            />
          )}

          {/* Add New button at bottom */}
          <button
            onClick={handleAddNew}
            style={{
              width: '100%',
              padding: '10px',
              background: '#0D7680',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '15px',
              fontWeight: 'bold',
            }}
          >
            + Add New
          </button>
        </div>

        {/* Right panel - editor form */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {/* Show draft forms with Save/Cancel */}
          {activeTab === 'plants' && draftPlant && (
            <PlantForm item={draftPlant} isDraft onSave={savePlant} onCancel={cancelPlant} />
          )}
          {activeTab === 'animals' && draftAnimal && (
            <AnimalForm item={draftAnimal} isDraft onSave={saveAnimal} onCancel={cancelAnimal} />
          )}
          {activeTab === 'resources' && draftResource && (
            <ResourceForm item={draftResource} isDraft onSave={saveResource} onCancel={cancelResource} />
          )}

          {/* Show existing item forms */}
          {!draftPlant && !draftAnimal && !draftResource && !selectedItem && (
            <div style={{ color: '#666', fontSize: '16px' }}>
              Select an item to edit or create a new one
            </div>
          )}

          {!draftPlant && selectedItem && activeTab === 'plants' && <PlantForm item={selectedItem} />}
          {!draftAnimal && selectedItem && activeTab === 'animals' && <AnimalForm item={selectedItem} />}
          {!draftResource && selectedItem && activeTab === 'resources' && <ResourceForm item={selectedItem} />}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          borderTop: '1px solid #D4C4B0',
          display: 'flex',
          gap: '10px',
          background: '#FFF1E5',
        }}
      >
        <button
          onClick={handleExport}
          style={{
            padding: '10px 20px',
            background: '#0D7680',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Export
        </button>
        <button
          onClick={handleImport}
          style={{
            padding: '10px 20px',
            background: '#0D0D0D',
            border: 'none',
            borderRadius: '4px',
            color: '#FFF1E5',
            cursor: 'pointer',
          }}
        >
          Import
        </button>
      </div>
    </div>
  );
}
