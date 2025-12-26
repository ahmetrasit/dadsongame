import { useEffect, useState } from 'react';
import { useDefinitionsStore, Season, SoilType, AnimalCapability, DeadYield, AliveYield, PlantSubCategory, AnimalSubCategory } from '@/stores/definitionsStore';

interface DefinitionEditorProps {
  initialTab?: 'plants' | 'animals' | 'resources';
  onClose?: () => void;
}

export function DefinitionEditor({ initialTab, onClose }: DefinitionEditorProps = {}) {
  const {
    isEditorOpen,
    activeTab,
    selectedId,
    definitions,
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
    ? definitions.plants
    : activeTab === 'animals'
    ? definitions.animals
    : definitions.resources;

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
              items={definitions.resources}
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
              items={definitions.plants}
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
              items={definitions.animals}
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

// Tree Sidebar Component
interface TreeSidebarProps {
  categories: string[];
  items: any[];
  getCategory: (item: any) => string;
  expandedCategories: Set<string>;
  toggleCategory: (category: string) => void;
  selectedId: string | null;
  selectItem: (id: string) => void;
}

function TreeSidebar({
  categories,
  items,
  getCategory,
  expandedCategories,
  toggleCategory,
  selectedId,
  selectItem,
}: TreeSidebarProps) {
  // Group items by category
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category] = items.filter((item) => getCategory(item) === category);
    return acc;
  }, {} as Record<string, any[]>);

  // Capitalize first letter
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {categories.map((category) => {
        const categoryItems = itemsByCategory[category] || [];
        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category}>
            {/* Category header */}
            <div
              onClick={() => toggleCategory(category)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                color: '#0D0D0D',
                fontWeight: 'bold',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <span style={{ width: '12px', color: '#666' }}>{isExpanded ? '▼' : '▶'}</span>
              <span>
                {capitalize(category)}
              </span>
              <span style={{
                background: '#E8DDD1',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#666',
                fontWeight: 'normal'
              }}>
                {categoryItems.length}
              </span>
            </div>

            {/* Category items */}
            {isExpanded && categoryItems.length > 0 && (
              <div style={{ paddingLeft: '12px', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: selectedId === item.id ? '#0D0D0D' : '#FFFFFF',
                      color: selectedId === item.id ? '#FFF1E5' : '#333',
                      borderRadius: '16px',
                      fontSize: '12px',
                      border: selectedId === item.id ? 'none' : '1px solid #D4C4B0',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedId !== item.id) {
                        e.currentTarget.style.background = '#E8DDD1';
                        e.currentTarget.style.borderColor = '#D4C4B0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedId !== item.id) {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#D4C4B0';
                      }
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Design System Components
const TwoColumnRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
    {children}
  </div>
);

const Card = ({ title, children, style }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #D4C4B0',
    ...style,
  }}>
    {title && (
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #E8DDD1',
      }}>
        {title}
      </div>
    )}
    {children}
  </div>
);

const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
    {children}
  </div>
);

const CompactInput = ({ label, type, value, onChange, width = '80px' }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
    <input
      type={type}
      value={value}
      onChange={onChange}
      style={{
        width,
        padding: '6px 10px',
        background: '#FFFFFF',
        border: '1px solid #D4C4B0',
        borderRadius: '4px',
        color: '#333',
        fontSize: '13px',
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = '#0D7680'}
      onBlur={(e) => e.currentTarget.style.borderColor = '#D4C4B0'}
    />
  </div>
);

const CompactSelect = ({ label, value, onChange, options, width = '120px' }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
    <select
      value={value}
      onChange={onChange}
      style={{
        width,
        padding: '6px 10px',
        background: '#FFFFFF',
        border: '1px solid #D4C4B0',
        borderRadius: '4px',
        color: '#333',
        fontSize: '13px',
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = '#0D7680'}
      onBlur={(e) => e.currentTarget.style.borderColor = '#D4C4B0'}
    >
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const SliderField = ({ label, value, onChange, min = 0, max = 100 }: any) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#333', fontSize: '13px' }}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      style={{ width: '100%', accentColor: '#0D7680' }}
    />
  </div>
);

const CheckboxGroup = ({ label, options, selected, onChange }: any) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ color: '#666', fontSize: '13px', marginBottom: '6px' }}>{label}</div>
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {options.map((opt: string) => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
            style={{ accentColor: '#0D7680' }}
          />
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </label>
      ))}
    </div>
  </div>
);

// Plant Form Component
function PlantForm({ item, isDraft, onSave, onCancel }: { item: any; isDraft?: boolean; onSave?: () => void; onCancel?: () => void }) {
  const { updatePlant, updateDraftPlant, deletePlant, definitions } = useDefinitionsStore();
  const [draftDeadYield, setDraftDeadYield] = useState<DeadYield | null>(null);

  const handleChange = (field: string, value: any) => {
    if (isDraft) {
      updateDraftPlant({ [field]: value });
    } else {
      updatePlant(item.id, { [field]: value });
    }
  };

  const handleSeasonToggle = (season: Season) => {
    const seasons = item.seasons.includes(season)
      ? item.seasons.filter((s: Season) => s !== season)
      : [...item.seasons, season];
    handleChange('seasons', seasons);
  };

  const handleSoilToggle = (soil: SoilType) => {
    const soils = item.suitableSoils.includes(soil)
      ? item.suitableSoils.filter((s: SoilType) => s !== soil)
      : [...item.suitableSoils, soil];
    handleChange('suitableSoils', soils);
  };

  const handleAddAliveYield = () => {
    handleChange('aliveYields', [...item.aliveYields, { resourceId: '', amount: 1, interval: 7, seasons: ['spring', 'summer', 'autumn', 'winter'], requiresFed: false }]);
  };

  const handleRemoveAliveYield = (index: number) => {
    handleChange('aliveYields', item.aliveYields.filter((_: any, i: number) => i !== index));
  };

  const handleAliveYieldChange = (index: number, updated: AliveYield) => {
    const newYields = item.aliveYields.map((ay: AliveYield, i: number) =>
      i === index ? updated : ay
    );
    handleChange('aliveYields', newYields);
  };

  const handleAddDeadYield = () => {
    setDraftDeadYield({ resourceId: '', quantity: 1 });
  };

  const handleSaveDraftDeadYield = () => {
    if (draftDeadYield && draftDeadYield.resourceId) {
      handleChange('deadYields', [...item.deadYields, draftDeadYield]);
      setDraftDeadYield(null);
    }
  };

  const handleCancelDraftDeadYield = () => {
    setDraftDeadYield(null);
  };

  const handleRemoveDeadYield = (index: number) => {
    handleChange('deadYields', item.deadYields.filter((_: any, i: number) => i !== index));
  };

  const handleDeadYieldChange = (index: number, field: keyof DeadYield, value: any) => {
    const updated = item.deadYields.map((dy: DeadYield, i: number) =>
      i === index ? { ...dy, [field]: value } : dy
    );
    handleChange('deadYields', updated);
  };

  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const soils: SoilType[] = ['grass', 'fertile', 'sand', 'rock', 'swamp'];
  const subCategories: PlantSubCategory[] = ['tree', 'crop', 'flower', 'bush'];

  // Check for duplicate name
  const isDuplicateName = definitions.plants.some(p => p.name.toLowerCase() === item.name.toLowerCase() && p.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Card */}
      <Card>
        <input
          type="text"
          value={item.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter plant name..."
          style={{
            width: '100%',
            padding: '10px',
            background: '#FFFFFF',
            border: `1px solid ${isDuplicateName ? '#990F3D' : '#D4C4B0'}`,
            borderRadius: '4px',
            color: '#333',
            fontSize: '18px',
            marginBottom: isDuplicateName ? '4px' : '12px',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#0D7680'}
          onBlur={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#D4C4B0'}
        />
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '12px' }}>
            A plant with this name already exists
          </div>
        )}
        <FieldRow>
          <CompactSelect
            label="Category"
            value={item.subCategory}
            onChange={(e: any) => handleChange('subCategory', e.target.value)}
            width="150px"
            options={subCategories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))}
          />
          <div style={{ flex: 1 }}></div>
          {isDraft ? (
            <>
              <button
                onClick={onCancel}
                style={{
                  padding: '6px 16px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginRight: '8px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!canSave}
                style={{
                  padding: '6px 16px',
                  background: canSave ? '#0D7680' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (confirm(`Delete ${item.name}?`)) {
                  deletePlant(item.id);
                }
              }}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid #990F3D',
                borderRadius: '4px',
                color: '#990F3D',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Delete
            </button>
          )}
        </FieldRow>
      </Card>

      {/* Growth and Needs in two columns */}
      <TwoColumnRow>
        <Card title="Growth" style={{ flex: 1 }}>
          <FieldRow>
            <CompactInput
              label="Growth Time"
              type="number"
              value={item.growthTime}
              onChange={(e: any) => handleChange('growthTime', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>days</span>
          </FieldRow>
          <FieldRow>
            <CompactInput
              label="Harvest Window"
              type="number"
              value={item.harvestWindow}
              onChange={(e: any) => handleChange('harvestWindow', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>days</span>
          </FieldRow>
          <CheckboxGroup
            label="Seasons"
            options={seasons}
            selected={item.seasons}
            onChange={handleSeasonToggle}
          />
          <CheckboxGroup
            label="Soils"
            options={soils}
            selected={item.suitableSoils}
            onChange={handleSoilToggle}
          />
        </Card>

        <Card title="Needs" style={{ flex: 1 }}>
          <SliderField
            label="Water"
            value={item.waterNeed}
            onChange={(e: any) => handleChange('waterNeed', Number(e.target.value))}
          />
          <SliderField
            label="Sun"
            value={item.sunNeed}
            onChange={(e: any) => handleChange('sunNeed', Number(e.target.value))}
          />
        </Card>
      </TwoColumnRow>

      {/* Alive Yields and Dead Yields in two columns */}
      <TwoColumnRow>
        <Card title="Alive Yields" style={{ flex: 1 }}>
          {item.aliveYields.map((ay: AliveYield, i: number) => (
            <div
              key={i}
              style={{
                background: '#FFF8F0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid #E8DDD1',
              }}
            >
              <FieldRow>
                <CompactSelect
                  label=""
                  value={ay.resourceId}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, resourceId: e.target.value })}
                  width="150px"
                  options={[
                    { value: '', label: '-- Select --' },
                    ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                  ]}
                />
                <CompactInput
                  label="Quantity"
                  type="number"
                  value={ay.amount}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, amount: Number(e.target.value) })}
                  width="60px"
                />
              </FieldRow>
              <FieldRow>
                <CompactInput
                  label="Every"
                  type="number"
                  value={ay.interval}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, interval: Number(e.target.value) })}
                  width="60px"
                />
                <span style={{ color: '#888', fontSize: '13px' }}>days</span>
                <div style={{ flex: 1 }}></div>
                <button
                  onClick={() => handleRemoveAliveYield(i)}
                  style={{
                    padding: '4px 8px',
                    background: '#E8DDD1',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </FieldRow>
              <CheckboxGroup
                label="Seasons"
                options={seasons}
                selected={ay.seasons}
                onChange={(season: Season) => {
                  const newSeasons = ay.seasons.includes(season)
                    ? ay.seasons.filter(s => s !== season)
                    : [...ay.seasons, season];
                  handleAliveYieldChange(i, { ...ay, seasons: newSeasons });
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                <input
                  type="checkbox"
                  checked={ay.requiresFed}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, requiresFed: e.target.checked })}
                  style={{ accentColor: '#0D7680' }}
                />
                Fed
              </label>
            </div>
          ))}
          <button
            onClick={handleAddAliveYield}
            style={{
              padding: '8px',
              background: '#0D7680',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              width: '100%',
            }}
          >
            + Add Yield
          </button>
        </Card>

        <Card title="Dead Yields" style={{ flex: 1 }}>
          {draftDeadYield && (
            <FieldRow>
              <CompactSelect
                label=""
                value={draftDeadYield.resourceId}
                onChange={(e: any) => setDraftDeadYield({ ...draftDeadYield, resourceId: e.target.value })}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <CompactInput
                label="Quantity"
                type="number"
                value={draftDeadYield.quantity}
                onChange={(e: any) => setDraftDeadYield({ ...draftDeadYield, quantity: Number(e.target.value) })}
                width="60px"
              />
              <div style={{ flex: 1 }}></div>
              <button
                onClick={handleCancelDraftDeadYield}
                style={{
                  padding: '4px 8px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '8px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraftDeadYield}
                disabled={!draftDeadYield.resourceId}
                style={{
                  padding: '4px 8px',
                  background: draftDeadYield.resourceId ? '#0D7680' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: draftDeadYield.resourceId ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                }}
              >
                Save
              </button>
            </FieldRow>
          )}
          {item.deadYields.map((dy: DeadYield, i: number) => (
            <FieldRow key={i}>
              <CompactSelect
                label=""
                value={dy.resourceId}
                onChange={(e: any) => handleDeadYieldChange(i, 'resourceId', e.target.value)}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <CompactInput
                label="Quantity"
                type="number"
                value={dy.quantity}
                onChange={(e: any) => handleDeadYieldChange(i, 'quantity', Number(e.target.value))}
                width="60px"
              />
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => handleRemoveDeadYield(i)}
                style={{
                  padding: '4px 8px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            </FieldRow>
          ))}
          {!draftDeadYield && (
            <button
              onClick={handleAddDeadYield}
              style={{
                padding: '8px',
                background: '#0D7680',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                width: '100%',
              }}
            >
              + Add Yield
            </button>
          )}
        </Card>
      </TwoColumnRow>
    </div>
  );
}

// Animal Form Component
function AnimalForm({ item, isDraft, onSave, onCancel }: { item: any; isDraft?: boolean; onSave?: () => void; onCancel?: () => void }) {
  const { updateAnimal, updateDraftAnimal, deleteAnimal, definitions } = useDefinitionsStore();
  const [draftDeadYield, setDraftDeadYield] = useState<DeadYield | null>(null);

  const handleChange = (field: string, value: any) => {
    if (isDraft) {
      updateDraftAnimal({ [field]: value });
    } else {
      updateAnimal(item.id, { [field]: value });
    }
  };

  const handleCapabilityToggle = (capability: AnimalCapability) => {
    const capabilities = item.capabilities.includes(capability)
      ? item.capabilities.filter((c: AnimalCapability) => c !== capability)
      : [...item.capabilities, capability];
    handleChange('capabilities', capabilities);
  };

  const handleAddAliveYield = () => {
    handleChange('aliveYields', [...item.aliveYields, { resourceId: '', amount: 1, interval: 7, seasons: ['spring', 'summer', 'autumn', 'winter'], requiresFed: false }]);
  };

  const handleRemoveAliveYield = (index: number) => {
    handleChange('aliveYields', item.aliveYields.filter((_: any, i: number) => i !== index));
  };

  const handleAliveYieldChange = (index: number, updated: AliveYield) => {
    const newYields = item.aliveYields.map((ay: AliveYield, i: number) =>
      i === index ? updated : ay
    );
    handleChange('aliveYields', newYields);
  };

  const handleAddDeadYield = () => {
    setDraftDeadYield({ resourceId: '', quantity: 1 });
  };

  const handleSaveDraftDeadYield = () => {
    if (draftDeadYield && draftDeadYield.resourceId) {
      handleChange('deadYields', [...item.deadYields, draftDeadYield]);
      setDraftDeadYield(null);
    }
  };

  const handleCancelDraftDeadYield = () => {
    setDraftDeadYield(null);
  };

  const handleRemoveDeadYield = (index: number) => {
    handleChange('deadYields', item.deadYields.filter((_: any, i: number) => i !== index));
  };

  const handleDeadYieldChange = (index: number, field: keyof DeadYield, value: any) => {
    const updated = item.deadYields.map((dy: DeadYield, i: number) =>
      i === index ? { ...dy, [field]: value } : dy
    );
    handleChange('deadYields', updated);
  };

  const capabilities: AnimalCapability[] = ['eat', 'carry', 'transport', 'produce'];
  const subCategories: AnimalSubCategory[] = ['livestock', 'poultry', 'wild', 'pet'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  // Check for duplicate name
  const isDuplicateName = definitions.animals.some(a => a.name.toLowerCase() === item.name.toLowerCase() && a.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Card */}
      <Card>
        <input
          type="text"
          value={item.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter animal name..."
          style={{
            width: '100%',
            padding: '10px',
            background: '#FFFFFF',
            border: `1px solid ${isDuplicateName ? '#990F3D' : '#D4C4B0'}`,
            borderRadius: '4px',
            color: '#333',
            fontSize: '18px',
            marginBottom: isDuplicateName ? '4px' : '12px',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#0D7680'}
          onBlur={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#D4C4B0'}
        />
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '12px' }}>
            An animal with this name already exists
          </div>
        )}
        <FieldRow>
          <CompactSelect
            label="Type"
            value={item.subCategory}
            onChange={(e: any) => handleChange('subCategory', e.target.value)}
            width="150px"
            options={subCategories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))}
          />
          <div style={{ flex: 1 }}></div>
          {isDraft ? (
            <>
              <button
                onClick={onCancel}
                style={{
                  padding: '6px 16px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginRight: '8px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!canSave}
                style={{
                  padding: '6px 16px',
                  background: canSave ? '#0D7680' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (confirm(`Delete ${item.name}?`)) {
                  deleteAnimal(item.id);
                }
              }}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid #990F3D',
                borderRadius: '4px',
                color: '#990F3D',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Delete
            </button>
          )}
        </FieldRow>
      </Card>

      {/* Stats and Capabilities in two columns */}
      <TwoColumnRow>
        <Card title="Stats" style={{ flex: 1 }}>
          <SliderField
            label="Speed"
            value={item.baseSpeed}
            onChange={(e: any) => handleChange('baseSpeed', Number(e.target.value))}
          />
          <SliderField
            label="Intelligence"
            value={item.baseIntelligence}
            onChange={(e: any) => handleChange('baseIntelligence', Number(e.target.value))}
          />
          <SliderField
            label="Max Energy"
            value={item.maxEnergy}
            onChange={(e: any) => handleChange('maxEnergy', Number(e.target.value))}
            max={200}
          />
        </Card>

        <Card title="Capabilities" style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {capabilities.map((capability) => (
              <label key={capability} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                <input
                  type="checkbox"
                  checked={item.capabilities.includes(capability)}
                  onChange={() => handleCapabilityToggle(capability)}
                  style={{ accentColor: '#0D7680' }}
                />
                {capability.charAt(0).toUpperCase() + capability.slice(1)}
              </label>
            ))}
          </div>
          <SliderField
            label={`Taming ${item.tamingDifficulty}/10`}
            value={item.tamingDifficulty}
            onChange={(e: any) => handleChange('tamingDifficulty', Number(e.target.value))}
            min={1}
            max={10}
          />
        </Card>
      </TwoColumnRow>

      {/* Alive Yields and Dead Yields in two columns */}
      <TwoColumnRow>
        <Card title="Alive Yields" style={{ flex: 1 }}>
          {item.aliveYields.map((ay: AliveYield, i: number) => (
            <div
              key={i}
              style={{
                background: '#FFF8F0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '12px',
                border: '1px solid #E8DDD1',
              }}
            >
              <FieldRow>
                <CompactSelect
                  label=""
                  value={ay.resourceId}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, resourceId: e.target.value })}
                  width="150px"
                  options={[
                    { value: '', label: '-- Select --' },
                    ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                  ]}
                />
                <CompactInput
                  label="Quantity"
                  type="number"
                  value={ay.amount}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, amount: Number(e.target.value) })}
                  width="60px"
                />
              </FieldRow>
              <FieldRow>
                <CompactInput
                  label="Every"
                  type="number"
                  value={ay.interval}
                  onChange={(e: any) => handleAliveYieldChange(i, { ...ay, interval: Number(e.target.value) })}
                  width="60px"
                />
                <span style={{ color: '#888', fontSize: '13px' }}>days</span>
                <div style={{ flex: 1 }}></div>
                <button
                  onClick={() => handleRemoveAliveYield(i)}
                  style={{
                    padding: '4px 8px',
                    background: '#E8DDD1',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Remove
                </button>
              </FieldRow>
              <CheckboxGroup
                label="Seasons"
                options={seasons}
                selected={ay.seasons}
                onChange={(season: Season) => {
                  const newSeasons = ay.seasons.includes(season)
                    ? ay.seasons.filter(s => s !== season)
                    : [...ay.seasons, season];
                  handleAliveYieldChange(i, { ...ay, seasons: newSeasons });
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                <input
                  type="checkbox"
                  checked={ay.requiresFed}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, requiresFed: e.target.checked })}
                  style={{ accentColor: '#0D7680' }}
                />
                Fed
              </label>
            </div>
          ))}
          <button
            onClick={handleAddAliveYield}
            style={{
              padding: '8px',
              background: '#0D7680',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              width: '100%',
            }}
          >
            + Add Yield
          </button>
        </Card>

        <Card title="Dead Yields" style={{ flex: 1 }}>
          {draftDeadYield && (
            <FieldRow>
              <CompactSelect
                label=""
                value={draftDeadYield.resourceId}
                onChange={(e: any) => setDraftDeadYield({ ...draftDeadYield, resourceId: e.target.value })}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <CompactInput
                label="Quantity"
                type="number"
                value={draftDeadYield.quantity}
                onChange={(e: any) => setDraftDeadYield({ ...draftDeadYield, quantity: Number(e.target.value) })}
                width="60px"
              />
              <div style={{ flex: 1 }}></div>
              <button
                onClick={handleCancelDraftDeadYield}
                style={{
                  padding: '4px 8px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '8px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraftDeadYield}
                disabled={!draftDeadYield.resourceId}
                style={{
                  padding: '4px 8px',
                  background: draftDeadYield.resourceId ? '#0D7680' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: draftDeadYield.resourceId ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                }}
              >
                Save
              </button>
            </FieldRow>
          )}
          {item.deadYields.map((dy: DeadYield, i: number) => (
            <FieldRow key={i}>
              <CompactSelect
                label=""
                value={dy.resourceId}
                onChange={(e: any) => handleDeadYieldChange(i, 'resourceId', e.target.value)}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...definitions.resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <CompactInput
                label="Quantity"
                type="number"
                value={dy.quantity}
                onChange={(e: any) => handleDeadYieldChange(i, 'quantity', Number(e.target.value))}
                width="60px"
              />
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => handleRemoveDeadYield(i)}
                style={{
                  padding: '4px 8px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            </FieldRow>
          ))}
          {!draftDeadYield && (
            <button
              onClick={handleAddDeadYield}
              style={{
                padding: '8px',
                background: '#0D7680',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                width: '100%',
              }}
            >
              + Add Yield
            </button>
          )}
        </Card>
      </TwoColumnRow>
    </div>
  );
}

// Resource Form Component
function ResourceForm({ item, isDraft, onSave, onCancel }: { item: any; isDraft?: boolean; onSave?: () => void; onCancel?: () => void }) {
  const { updateResource, updateDraftResource, deleteResource, definitions } = useDefinitionsStore();

  const handleChange = (field: string, value: any) => {
    if (isDraft) {
      updateDraftResource({ [field]: value });
    } else {
      updateResource(item.id, { [field]: value });
    }
  };

  // Check for duplicate name
  const isDuplicateName = definitions.resources.some(r => r.name.toLowerCase() === item.name.toLowerCase() && r.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Header Card */}
      <Card>
        <input
          type="text"
          value={item.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter material name..."
          style={{
            width: '100%',
            padding: '10px',
            background: '#FFFFFF',
            border: `1px solid ${isDuplicateName ? '#990F3D' : '#D4C4B0'}`,
            borderRadius: '4px',
            color: '#333',
            fontSize: '18px',
            marginBottom: isDuplicateName ? '4px' : '12px',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#0D7680'}
          onBlur={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#D4C4B0'}
        />
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '12px' }}>
            A material with this name already exists
          </div>
        )}
        <FieldRow>
          <div style={{ flex: 1 }}></div>
          {isDraft ? (
            <>
              <button
                onClick={onCancel}
                style={{
                  padding: '6px 16px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginRight: '8px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!canSave}
                style={{
                  padding: '6px 16px',
                  background: canSave ? '#0D7680' : '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (confirm(`Delete ${item.name}?`)) {
                  deleteResource(item.id);
                }
              }}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                border: '1px solid #990F3D',
                borderRadius: '4px',
                color: '#990F3D',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Delete
            </button>
          )}
        </FieldRow>
      </Card>

      {/* Properties Card */}
      <Card title="Properties">
        <FieldRow>
          <CompactSelect
            label="Category"
            value={item.category}
            onChange={(e: any) => handleChange('category', e.target.value)}
            width="120px"
            options={[
              { value: 'food', label: 'Food' },
              { value: 'water', label: 'Water' },
              { value: 'metal', label: 'Metal' },
              { value: 'rock', label: 'Rock' },
              { value: 'wood', label: 'Wood' },
              { value: 'organics', label: 'Organics' },
            ]}
          />
          <CompactSelect
            label="Spoilage"
            value={item.spoilageRate}
            onChange={(e: any) => handleChange('spoilageRate', e.target.value)}
            width="120px"
            options={[
              { value: 'fast', label: 'Fast' },
              { value: 'medium', label: 'Medium' },
              { value: 'slow', label: 'Slow' },
              { value: 'never', label: 'Never' },
            ]}
          />
          <CompactInput
            label="Weight"
            type="number"
            value={item.weight}
            onChange={(e: any) => handleChange('weight', Number(e.target.value))}
            width="80px"
          />
        </FieldRow>
      </Card>
    </div>
  );
}
