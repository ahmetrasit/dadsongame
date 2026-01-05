import { useMemo, useCallback } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { Card, FieldRow, CompactInput, CompactSelect, CheckboxGroup } from './FormComponents';
import { FaTrashAlt } from 'react-icons/fa';
import { generateResourcePreview } from '@/utils/generatePreviewImage';
import type {
  VitaminType, FoodNutrition, ResourceInteractionType, MaterialCategory,
  MaterialTransformation, TransformationAction, TransformationProperty, TransformationRequirement, ResourceDefinition
} from '@/stores/definitions/resourcesStore';

interface ResourceFormProps {
  item: ResourceDefinition;
  isDraft?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

const TRANSFORMATION_ACTIONS: TransformationAction[] = [
  'chop', 'cook', 'dry', 'soak', 'grind', 'portion', 'mold', 'smelt', 'tan', 'weave', 'twist'
];

const TRANSFORMATION_PROPERTIES: TransformationProperty[] = [
  'cutting', 'shaping', 'piercing', 'digging', 'grinding', 'scooping', 'heat', 'dry', 'soak'
];

export function ResourceForm({ item, isDraft, onSave, onCancel }: ResourceFormProps) {
  const { updateResource, updateDraftResource, deleteResource, resources } = useDefinitionsStore();
  const { openSpriteEditor } = useGameStateStore();

  const handleChange = (field: string, value: unknown) => {
    if (isDraft) {
      updateDraftResource({ [field]: value });
    } else {
      updateResource(item.id, { [field]: value });
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    // Non-food categories auto-set spoilage to 'never'
    const autoSpoilageCategories = ['fiber', 'hide', 'wood', 'clay', 'ore', 'metal'];
    if (autoSpoilageCategories.includes(newCategory)) {
      if (isDraft) {
        updateDraftResource({ category: newCategory as MaterialCategory, spoilageRate: 'never' });
      } else {
        updateResource(item.id, { category: newCategory as MaterialCategory, spoilageRate: 'never' });
      }
    } else {
      handleChange('category', newCategory);
    }
  };

  const isSpoilageDisabled = ['fiber', 'hide', 'wood', 'clay', 'ore', 'metal'].includes(item.category);
  const isFood = item.category === 'food';
  const resourceInteractions: ResourceInteractionType[] = ['collect', 'eat', 'drink'];

  const handleInteractionToggle = (interaction: ResourceInteractionType) => {
    const interactions = item.interactionTypes.includes(interaction)
      ? item.interactionTypes.filter((i: ResourceInteractionType) => i !== interaction)
      : [...item.interactionTypes, interaction];
    handleChange('interactionTypes', interactions);
  };

  // Default nutrition values
  const defaultNutrition: FoodNutrition = {
    kcalPerKg: 100,
    vitamins: [],
    protein: 25,
    carbs: 25,
    goodFat: 25,
    badFat: 25,
  };

  const nutrition = item.nutrition || defaultNutrition;

  // Handle nutrition field changes
  const handleNutritionChange = useCallback((field: keyof FoodNutrition, value: unknown) => {
    const updatedNutrition = { ...nutrition, [field]: value };
    handleChange('nutrition', updatedNutrition);
  }, [nutrition, handleChange]);

  // Handle macro slider change - adjusts others to maintain 100% total
  const handleMacroChange = useCallback((field: 'protein' | 'carbs' | 'goodFat' | 'badFat', newValue: number) => {
    // Get the other fields
    const otherFields = (['protein', 'carbs', 'goodFat', 'badFat'] as const).filter(f => f !== field);
    const otherTotal = otherFields.reduce((sum, f) => sum + nutrition[f], 0);

    // Calculate new values for other fields proportionally
    const updatedNutrition = { ...nutrition, [field]: newValue };

    if (otherTotal > 0) {
      const remaining = 100 - newValue;
      otherFields.forEach(f => {
        updatedNutrition[f] = Math.round((nutrition[f] / otherTotal) * remaining);
      });
      // Fix rounding errors
      const newTotal = updatedNutrition.protein + updatedNutrition.carbs + updatedNutrition.goodFat + updatedNutrition.badFat;
      if (newTotal !== 100) {
        updatedNutrition[otherFields[0]] += 100 - newTotal;
      }
    }

    handleChange('nutrition', updatedNutrition);
  }, [nutrition, handleChange]);

  // Handle vitamin toggle
  const handleVitaminToggle = useCallback((vitamin: string) => {
    const vitamins = nutrition.vitamins || [];
    const newVitamins = vitamins.includes(vitamin as VitaminType)
      ? vitamins.filter((v: VitaminType) => v !== vitamin)
      : [...vitamins, vitamin as VitaminType];
    handleNutritionChange('vitamins', newVitamins);
  }, [nutrition.vitamins, handleNutritionChange]);

  const handleAddTransformation = () => {
    const newTransformation: MaterialTransformation = {
      action: 'chop',
      resultMaterialId: '',
      resultQuantity: 1,
      requirements: []
    };
    const transformations = [...(item.transformations || []), newTransformation];
    handleChange('transformations', transformations);
  };

  const handleUpdateTransformation = (index: number, updates: Partial<MaterialTransformation>) => {
    const transformations = [...(item.transformations || [])];
    transformations[index] = { ...transformations[index], ...updates };
    handleChange('transformations', transformations);
  };

  const handleDeleteTransformation = (index: number) => {
    const transformations = (item.transformations || []).filter((_: MaterialTransformation, i: number) => i !== index);
    handleChange('transformations', transformations);
  };

  const handleAddRequirement = (transformIndex: number) => {
    const transformations = [...(item.transformations || [])];
    const newReq: TransformationRequirement = { property: 'cutting', min: 1 };
    transformations[transformIndex] = {
      ...transformations[transformIndex],
      requirements: [...transformations[transformIndex].requirements, newReq]
    };
    handleChange('transformations', transformations);
  };

  const handleUpdateRequirement = (transformIndex: number, reqIndex: number, updates: Partial<TransformationRequirement>) => {
    const transformations = [...(item.transformations || [])];
    const requirements = [...transformations[transformIndex].requirements];
    requirements[reqIndex] = { ...requirements[reqIndex], ...updates };
    transformations[transformIndex] = { ...transformations[transformIndex], requirements };
    handleChange('transformations', transformations);
  };

  const handleDeleteRequirement = (transformIndex: number, reqIndex: number) => {
    const transformations = [...(item.transformations || [])];
    transformations[transformIndex] = {
      ...transformations[transformIndex],
      requirements: transformations[transformIndex].requirements.filter((_: TransformationRequirement, i: number) => i !== reqIndex)
    };
    handleChange('transformations', transformations);
  };

  // Check for duplicate name
  const isDuplicateName = resources.some(r => r.name.toLowerCase() === item.name.toLowerCase() && r.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  // Generate preview image if no custom image is uploaded
  const previewImage = useMemo(() => {
    return item.imageUrl || generateResourcePreview(item.category, item.name);
  }, [item.imageUrl, item.category, item.name]);

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Card */}
      <Card>
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '8px' }}>
            A material with this name already exists
          </div>
        )}
        <FieldRow>
          {/* Image preview - opens Sprite Editor */}
          <div
            onClick={() => openSpriteEditor('resource', item.id)}
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
            placeholder="Enter material name..."
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
            value={item.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            width="120px"
            options={[
              { value: 'food', label: 'Food' },
              { value: 'fiber', label: 'Fiber' },
              { value: 'hide', label: 'Hide' },
              { value: 'wood', label: 'Wood' },
              { value: 'clay', label: 'Clay' },
              { value: 'ore', label: 'Ore' },
              { value: 'metal', label: 'Metal' },
            ]}
          />
          <CompactSelect
            label=""
            value={item.spoilageRate}
            onChange={(e) => handleChange('spoilageRate', e.target.value)}
            width="120px"
            disabled={isSpoilageDisabled}
            options={[
              { value: 'fast', label: 'Fast' },
              { value: 'medium', label: 'Medium' },
              { value: 'slow', label: 'Slow' },
              { value: 'never', label: 'Never' },
            ]}
          />
          <CompactInput
            label=""
            type="number"
            value={item.weight}
            onChange={(e) => handleChange('weight', Number(e.target.value))}
            width="80px"
          />
          {/* Emoji picker - click to edit */}
          <div
            onClick={() => {
              const emoji = prompt('Enter an emoji for this resource:', item.emoji || '📦');
              if (emoji !== null) {
                handleChange('emoji', emoji.trim() || '📦');
              }
            }}
            style={{
              width: '40px',
              height: '36px',
              fontSize: '24px',
              textAlign: 'center',
              lineHeight: '36px',
              background: '#FFFFFF',
              border: '1px solid #D4C4B0',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px',
              userSelect: 'none',
            }}
            title="Click to change emoji"
          >
            {item.emoji || '📦'}
          </div>
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
                marginLeft: '8px',
              }}
            >
              <FaTrashAlt />
            </button>
          )}
        </FieldRow>
      </Card>

      {/* Interactions section */}
      <Card title="Interactions">
        <CheckboxGroup
          label=""
          options={resourceInteractions}
          selected={item.interactionTypes}
          onChange={(interaction: string) => handleInteractionToggle(interaction as ResourceInteractionType)}
        />
      </Card>

      {/* Nutrition section - only for food category */}
      {isFood && (
        <Card title="Nutrition">
          <FieldRow style={{ marginBottom: '12px' }}>
            <CompactInput
              label="kcal/kg"
              type="number"
              value={nutrition.kcalPerKg}
              onChange={(e) => handleNutritionChange('kcalPerKg', Number(e.target.value))}
              width="100px"
            />
            <div style={{ marginLeft: '24px' }}>
              <CheckboxGroup
                label=""
                options={['A', 'B', 'C', 'D', 'E', 'K', 'fiber', 'calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'phosphorus']}
                selected={nutrition.vitamins || []}
                onChange={handleVitaminToggle}
              />
            </div>
          </FieldRow>

          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            Macronutrients (must total 100%)
          </div>

          {/* Macro sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <span>Protein</span>
                <span>{nutrition.protein}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={nutrition.protein}
                onChange={(e) => handleMacroChange('protein', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#0D7680' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <span>Carbohydrates</span>
                <span>{nutrition.carbs}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={nutrition.carbs}
                onChange={(e) => handleMacroChange('carbs', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#0D7680' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <span>Good Fat</span>
                <span>{nutrition.goodFat}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={nutrition.goodFat}
                onChange={(e) => handleMacroChange('goodFat', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#22c55e' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                <span>Bad Fat</span>
                <span>{nutrition.badFat}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={nutrition.badFat}
                onChange={(e) => handleMacroChange('badFat', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />
            </div>
          </div>

          {/* Total indicator */}
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: nutrition.protein + nutrition.carbs + nutrition.goodFat + nutrition.badFat === 100 ? '#d1fae5' : '#fee2e2',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'center',
            color: nutrition.protein + nutrition.carbs + nutrition.goodFat + nutrition.badFat === 100 ? '#065f46' : '#991b1b',
          }}>
            Total: {nutrition.protein + nutrition.carbs + nutrition.goodFat + nutrition.badFat}%
            {nutrition.protein + nutrition.carbs + nutrition.goodFat + nutrition.badFat !== 100 && ' (must be 100%)'}
          </div>
        </Card>
      )}

      {/* Transformations section */}
      <Card title="Transformations">
        {(item.transformations || []).map((transform: MaterialTransformation, tIndex: number) => (
          <div key={tIndex} style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <FieldRow style={{ marginBottom: '8px' }}>
              <CompactSelect
                label="Action"
                value={transform.action}
                onChange={(e) => handleUpdateTransformation(tIndex, { action: e.target.value as TransformationAction })}
                width="120px"
                options={TRANSFORMATION_ACTIONS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
              />
              <span style={{ margin: '0 8px', alignSelf: 'center' }}>→</span>
              <CompactSelect
                label="Result"
                value={transform.resultMaterialId}
                onChange={(e) => handleUpdateTransformation(tIndex, { resultMaterialId: e.target.value })}
                width="180px"
                options={[
                  { value: '', label: 'Select material...' },
                  ...resources.filter(r => r.id !== item.id).map(r => ({ value: r.id, label: r.name }))
                ]}
              />
              <CompactInput
                label="Qty"
                type="number"
                value={transform.resultQuantity}
                onChange={(e) => handleUpdateTransformation(tIndex, { resultQuantity: Number(e.target.value) })}
                width="60px"
              />
              <button
                onClick={() => handleDeleteTransformation(tIndex)}
                style={{
                  padding: '4px 8px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                <FaTrashAlt />
              </button>
            </FieldRow>

            {/* Requirements */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Requirements:</div>
            {transform.requirements.map((req: TransformationRequirement, rIndex: number) => (
              <FieldRow key={rIndex} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                <CompactSelect
                  label=""
                  value={req.property}
                  onChange={(e) => handleUpdateRequirement(tIndex, rIndex, { property: e.target.value as TransformationProperty })}
                  width="100px"
                  options={TRANSFORMATION_PROPERTIES.map(p => ({ value: p, label: p }))}
                />
                <CompactInput
                  label="min"
                  type="number"
                  value={req.min}
                  onChange={(e) => handleUpdateRequirement(tIndex, rIndex, { min: Number(e.target.value) })}
                  width="60px"
                />
                <CompactInput
                  label="max"
                  type="number"
                  value={req.max ?? ''}
                  onChange={(e) => handleUpdateRequirement(tIndex, rIndex, {
                    max: e.target.value === '' ? undefined : Number(e.target.value)
                  })}
                  width="60px"
                />
                <button
                  onClick={() => handleDeleteRequirement(tIndex, rIndex)}
                  style={{
                    padding: '2px 6px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  ×
                </button>
              </FieldRow>
            ))}
            <button
              onClick={() => handleAddRequirement(tIndex)}
              style={{
                padding: '4px 8px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: '16px',
                marginTop: '4px'
              }}
            >
              + Requirement
            </button>
          </div>
        ))}
        <button
          onClick={handleAddTransformation}
          style={{
            padding: '8px 16px',
            background: '#22c55e',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Add Transformation
        </button>
      </Card>
    </div>
  );
}
