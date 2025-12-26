import { useState } from 'react';
import { useDefinitionsStore, Season, SoilType, DeadYield, AliveYield, PlantSubCategory } from '@/stores/definitionsStore';
import { Card, FieldRow, CompactInput, CompactSelect, TwoColumnRow, SliderField, CheckboxGroup } from './FormComponents';

interface PlantFormProps {
  item: any;
  isDraft?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export function PlantForm({ item, isDraft, onSave, onCancel }: PlantFormProps) {
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
    handleChange('aliveYields', [...item.aliveYields, { resourceId: '', amount: 1, interval: 7, seasons: ['spring', 'summer', 'autumn', 'winter'] }]);
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
            onChange={(e) => handleChange('subCategory', e.target.value)}
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
              onChange={(e) => handleChange('growthTime', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>days</span>
          </FieldRow>
          <FieldRow>
            <CompactInput
              label="Harvest Window"
              type="number"
              value={item.harvestWindow}
              onChange={(e) => handleChange('harvestWindow', Number(e.target.value))}
              width="60px"
            />
            <span style={{ color: '#888', fontSize: '13px' }}>days</span>
          </FieldRow>
          <CheckboxGroup
            label="Seasons"
            options={seasons}
            selected={item.seasons}
            onChange={(season: string) => handleSeasonToggle(season as Season)}
          />
          <CheckboxGroup
            label="Soils"
            options={soils}
            selected={item.suitableSoils}
            onChange={(soil: string) => handleSoilToggle(soil as SoilType)}
          />
        </Card>

        <Card title="Needs" style={{ flex: 1 }}>
          <SliderField
            label="Water"
            value={item.waterNeed}
            onChange={(e) => handleChange('waterNeed', Number(e.target.value))}
          />
          <SliderField
            label="Sun"
            value={item.sunNeed}
            onChange={(e) => handleChange('sunNeed', Number(e.target.value))}
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
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, resourceId: e.target.value })}
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
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, amount: Number(e.target.value) })}
                  width="60px"
                />
              </FieldRow>
              <FieldRow>
                <CompactInput
                  label="Every"
                  type="number"
                  value={ay.interval}
                  onChange={(e) => handleAliveYieldChange(i, { ...ay, interval: Number(e.target.value) })}
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
                onChange={(season: string) => {
                  const newSeasons = ay.seasons.includes(season as Season)
                    ? ay.seasons.filter(s => s !== season)
                    : [...ay.seasons, season as Season];
                  handleAliveYieldChange(i, { ...ay, seasons: newSeasons });
                }}
              />
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
                onChange={(e) => setDraftDeadYield({ ...draftDeadYield, resourceId: e.target.value })}
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
                onChange={(e) => setDraftDeadYield({ ...draftDeadYield, quantity: Number(e.target.value) })}
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
                onChange={(e) => handleDeadYieldChange(i, 'resourceId', e.target.value)}
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
                onChange={(e) => handleDeadYieldChange(i, 'quantity', Number(e.target.value))}
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
