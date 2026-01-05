import { useState, useMemo } from 'react';
import { useDefinitionsStore, Season, DeadYield, AliveYield, AnimalSubCategory, AnimalYieldInteraction, AnimalNeedInteraction, MaterialTransformation } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { Card, FieldRow, CompactInput, CompactSelect, TwoColumnRow, SliderField, CheckboxGroup } from './FormComponents';
import { TransformationsEditor } from './TransformationsEditor';
import { FaTrashAlt } from 'react-icons/fa';
import { generateAnimalPreview } from '@/utils/generatePreviewImage';
import type { AnimalDefinition } from '@/stores/definitions/animalsStore';

interface AnimalFormProps {
  item: AnimalDefinition;
  isDraft?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export function AnimalForm({ item, isDraft, onSave, onCancel }: AnimalFormProps) {
  const { updateAnimal, updateDraftAnimal, deleteAnimal, animals, resources } = useDefinitionsStore();
  const { openSpriteEditor } = useGameStateStore();
  const [draftDeadYield, setDraftDeadYield] = useState<DeadYield | null>(null);

  const handleChange = (field: string, value: unknown) => {
    if (isDraft) {
      updateDraftAnimal({ [field]: value });
    } else {
      updateAnimal(item.id, { [field]: value });
    }
  };

  const handleAddAliveYield = () => {
    handleChange('aliveYields', [...item.aliveYields, { resourceId: '', amount: 1, interval: 7, seasons: ['spring', 'summer', 'autumn', 'winter'], shedding: true, interactionType: 'collect' }]);
  };

  const handleRemoveAliveYield = (index: number) => {
    handleChange('aliveYields', item.aliveYields.filter((_: AliveYield, i: number) => i !== index));
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
    handleChange('deadYields', item.deadYields.filter((_: DeadYield, i: number) => i !== index));
  };

  const handleDeadYieldChange = (index: number, field: keyof DeadYield, value: unknown) => {
    const updated = item.deadYields.map((dy: DeadYield, i: number) =>
      i === index ? { ...dy, [field]: value } : dy
    );
    handleChange('deadYields', updated);
  };

  const subCategories: AnimalSubCategory[] = ['livestock', 'poultry', 'wild', 'pet'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const animalYieldInteractions: AnimalYieldInteraction[] = ['milk', 'shear', 'gather', 'collect'];
  const animalNeedInteractions: AnimalNeedInteraction[] = ['feed', 'water', 'pet', 'lead', 'tame'];

  const handleNeedInteractionToggle = (interaction: AnimalNeedInteraction) => {
    const interactions = (item.needInteractions || []).includes(interaction)
      ? item.needInteractions.filter((i: AnimalNeedInteraction) => i !== interaction)
      : [...(item.needInteractions || []), interaction];
    handleChange('needInteractions', interactions);
  };

  // Sort resources alphabetically for dropdowns
  const sortedResources = useMemo(() =>
    [...resources].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [resources]
  );

  // Check for duplicate name
  const isDuplicateName = animals.some(a => a.name.toLowerCase() === item.name.toLowerCase() && a.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  // Generate preview image if no custom image is uploaded
  const previewImage = useMemo(() => {
    return item.imageUrl || generateAnimalPreview(item.subCategory, item.name);
  }, [item.imageUrl, item.subCategory, item.name]);

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Card */}
      <Card>
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '8px' }}>
            An animal with this name already exists
          </div>
        )}
        <FieldRow>
          {/* Image preview - opens Sprite Editor */}
          <div
            onClick={() => openSpriteEditor('animal', item.id)}
            style={{
              width: '60px',
              height: '60px',
              border: '2px dashed #D4C4B0',
              borderRadius: '8px',
              marginRight: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: `url(${previewImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
            }}
            title="Click to open Sprite Editor"
          >
          </div>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter animal name..."
            style={{
              flex: 1,
              padding: '10px',
              background: '#FFFFFF',
              border: `1px solid ${isDuplicateName ? '#990F3D' : '#D4C4B0'}`,
              borderRadius: '4px',
              color: '#333',
              fontSize: '18px',
              marginRight: '12px',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#0D7680'}
            onBlur={(e) => e.currentTarget.style.borderColor = isDuplicateName ? '#990F3D' : '#D4C4B0'}
          />
          <CompactSelect
            label=""
            value={item.subCategory}
            onChange={(e) => handleChange('subCategory', e.target.value)}
            width="150px"
            options={subCategories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333', marginLeft: '12px' }}>
            <input
              type="checkbox"
              checked={item.canPull}
              onChange={(e) => handleChange('canPull', e.target.checked)}
              style={{ accentColor: '#0D7680' }}
            />
            Can Pull
          </label>
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
                  marginLeft: '8px',
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
                marginLeft: '8px',
              }}
            >
              <FaTrashAlt />
            </button>
          )}
        </FieldRow>
      </Card>

      {/* Stats and Animal Needs in two columns */}
      <TwoColumnRow>
        <Card title="Stats" style={{ flex: '0 0 55%' }}>
          <SliderField
            label="Speed"
            value={item.baseSpeed}
            onChange={(e) => handleChange('baseSpeed', Number(e.target.value))}
          />
          <SliderField
            label="Max Energy"
            value={item.maxEnergy}
            onChange={(e) => handleChange('maxEnergy', Number(e.target.value))}
            max={200}
          />
          <SliderField
            label={`Taming ${item.tamingDifficulty}/10`}
            value={item.tamingDifficulty}
            onChange={(e) => handleChange('tamingDifficulty', Number(e.target.value))}
            min={1}
            max={10}
          />
        </Card>

        <Card title="Needs" style={{ flex: '0 0 calc(45% - 16px)' }}>
          <FieldRow>
            <CompactInput
              label="Food"
              type="number"
              value={item.foodNeeds}
              onChange={(e) => handleChange('foodNeeds', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>per day</span>
          </FieldRow>
          <FieldRow>
            <CompactInput
              label="Water"
              type="number"
              value={item.waterNeeds}
              onChange={(e) => handleChange('waterNeeds', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>per day</span>
          </FieldRow>
          <CheckboxGroup
            label="Interactions"
            options={animalNeedInteractions}
            selected={item.needInteractions || []}
            onChange={(interaction: string) => handleNeedInteractionToggle(interaction as AnimalNeedInteraction)}
          />
        </Card>
      </TwoColumnRow>

      {/* Alive Yields and Dead Yields in two columns */}
      <TwoColumnRow>
        <Card title="Alive Yields" style={{ flex: '0 0 55%' }}>
          {item.aliveYields.map((ay: AliveYield, i: number) => (
            <div
              key={i}
              style={{
                background: '#FFF8F0',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #E8DDD1',
              }}
            >
              <FieldRow style={{ marginBottom: '4px' }}>
                <CompactSelect
                  label=""
                  value={ay.interactionType || 'collect'}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, interactionType: e.target.value as AnimalYieldInteraction })}
                  width="80px"
                  options={animalYieldInteractions.map(int => ({ value: int, label: int.charAt(0).toUpperCase() + int.slice(1) }))}
                />
                <CompactInput
                  label=""
                  type="number"
                  value={ay.amount}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, amount: Number(e.target.value) })}
                  width="50px"
                />
                <CompactSelect
                  label=""
                  value={ay.resourceId}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, resourceId: e.target.value })}
                  width="130px"
                  options={[
                    { value: '', label: '-- Select --' },
                    ...sortedResources.map(res => ({ value: res.id, label: res.name }))
                  ]}
                />
                <span style={{ color: '#888', fontSize: '13px', marginLeft: '4px' }}>Every</span>
                <CompactInput
                  label=""
                  type="number"
                  value={ay.interval}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, interval: Number(e.target.value) })}
                  width="50px"
                />
                <span style={{ color: '#888', fontSize: '13px' }}>days</span>
              </FieldRow>
              <FieldRow style={{ marginBottom: '0' }}>
                <CheckboxGroup
                  label=""
                  options={seasons}
                  selected={ay.seasons}
                  onChange={(season: string) => {
                    const newSeasons = ay.seasons.includes(season as Season)
                      ? ay.seasons.filter(s => s !== season)
                      : [...ay.seasons, season as Season];
                    handleAliveYieldChange(i, { ...ay, seasons: newSeasons });
                  }}
                />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#666',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ay.shedding ?? true}
                    onChange={(e) => handleAliveYieldChange(i, { ...ay, shedding: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Shed
                </label>
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
                    fontSize: '16px',
                    lineHeight: 1,
                  }}
                >
                  <FaTrashAlt />
                </button>
              </FieldRow>
              {/* Transformations for this yield */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #D4C4B0' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Transformations:</div>
                <TransformationsEditor
                  transformations={ay.transformations || []}
                  resources={resources}
                  onChange={(transformations: MaterialTransformation[]) => handleAliveYieldChange(i, { ...ay, transformations })}
                  compact={true}
                />
              </div>
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

        <Card title="Dead Yields" style={{ flex: '0 0 calc(45% - 16px)' }}>
          {draftDeadYield && (
            <FieldRow style={{ marginBottom: '12px' }}>
              <CompactInput
                label=""
                type="number"
                value={draftDeadYield.quantity}
                onChange={(e) => setDraftDeadYield({ ...draftDeadYield, quantity: Number(e.target.value) })}
                width="60px"
              />
              <CompactSelect
                label=""
                value={draftDeadYield.resourceId}
                onChange={(e) => setDraftDeadYield({ ...draftDeadYield, resourceId: e.target.value })}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
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
                  marginLeft: '8px',
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
            <FieldRow key={i} style={{ marginBottom: '8px' }}>
              <CompactInput
                label=""
                type="number"
                value={dy.quantity}
                onChange={(e) => handleDeadYieldChange(i, 'quantity', Number(e.target.value))}
                width="60px"
              />
              <CompactSelect
                label=""
                value={dy.resourceId}
                onChange={(e) => handleDeadYieldChange(i, 'resourceId', e.target.value)}
                width="150px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...resources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <button
                onClick={() => handleRemoveDeadYield(i)}
                style={{
                  padding: '4px 8px',
                  background: '#E8DDD1',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  marginLeft: '8px',
                }}
              >
                <FaTrashAlt />
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
