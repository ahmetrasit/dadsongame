import { useMemo } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { Card, FieldRow, CompactInput, CompactSelect, TwoColumnRow } from './FormComponents';
import { FaTrashAlt } from 'react-icons/fa';
import type {
  Tier,
  RawMaterial,
  ComponentRef,
  VerbCapacity,
  CategorySatisfaction,
  Purity,
  MaterialState,
  Verb,
  FunctionalCategory,
  Subcategory,
} from '@/types/ontology';

interface ProductFormProps {
  item: any;
  isDraft?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

// Available options for dropdowns
const TIERS: Tier[] = [1, 2, 3, 4, 5];
const PURITIES: Purity[] = ['low', 'med', 'high'];
const MATERIAL_STATES: MaterialState[] = ['raw', 'processed', 'refined'];
const VERBS: Verb[] = [
  'pick', 'dig', 'chop', 'collect', 'catch', 'pull', 'break', 'hunt', 'mine',
  'heat', 'cool', 'mix', 'shape', 'cut', 'grind', 'press', 'dry',
  'soak', 'cook', 'clean', 'join', 'melt', 'pour', 'scrape',
  'spin', 'weave', 'sew', 'stuff', 'tie',
  'build', 'place', 'stack', 'fix', 'remove', 'assemble',
  'teach', 'learn', 'trade', 'give', 'ask', 'lead',
  'carry', 'load', 'send', 'store',
  'plant', 'harvest', 'grow', 'breed',
  'feed', 'water', 'rest', 'heal',
];
const FUNCTIONAL_CATEGORIES: FunctionalCategory[] = [
  'Nourishment', 'Recovery', 'Mobility', 'Hauling', 'Crafting', 'Signaling',
];
const SUBCATEGORIES: Record<FunctionalCategory, Subcategory[]> = {
  Nourishment: ['cooking', 'preservation'],
  Recovery: ['resting', 'healing'],
  Mobility: ['land', 'water', 'sled'],
  Hauling: ['carried', 'stationary'],
  Crafting: ['cutting', 'shaping', 'heating', 'joining'],
  Signaling: ['audible', 'visual', 'recorded'],
};

export function ProductForm({ item, isDraft, onSave, onCancel }: ProductFormProps) {
  const { updateProduct, updateDraftProduct, deleteProduct, products, resources } = useDefinitionsStore();

  const handleChange = (field: string, value: any) => {
    if (isDraft) {
      updateDraftProduct({ [field]: value });
    } else {
      updateProduct(item.id, { [field]: value });
    }
  };

  // Sort resources alphabetically for dropdowns
  const sortedResources = useMemo(() =>
    [...resources].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [resources]
  );

  // Sort products alphabetically for component dropdowns (excluding current product)
  const sortedProducts = useMemo(() =>
    [...products]
      .filter(p => p.id !== item.id)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [products, item.id]
  );

  // === Raw Materials handlers ===
  const handleAddRaw = () => {
    const newRaw: RawMaterial = { materialId: '', amount: 1, purity: 'med', state: 'raw' };
    handleChange('madeOf', { ...item.madeOf, raw: [...item.madeOf.raw, newRaw] });
  };

  const handleRemoveRaw = (index: number) => {
    handleChange('madeOf', { ...item.madeOf, raw: item.madeOf.raw.filter((_: any, i: number) => i !== index) });
  };

  const handleRawChange = (index: number, field: keyof RawMaterial, value: any) => {
    const updated = item.madeOf.raw.map((r: RawMaterial, i: number) =>
      i === index ? { ...r, [field]: value } : r
    );
    handleChange('madeOf', { ...item.madeOf, raw: updated });
  };

  // === Components handlers ===
  const handleAddComponent = () => {
    const newComp: ComponentRef = { componentId: '', count: 1 };
    handleChange('madeOf', { ...item.madeOf, components: [...item.madeOf.components, newComp] });
  };

  const handleRemoveComponent = (index: number) => {
    handleChange('madeOf', { ...item.madeOf, components: item.madeOf.components.filter((_: any, i: number) => i !== index) });
  };

  const handleComponentChange = (index: number, field: keyof ComponentRef, value: any) => {
    const updated = item.madeOf.components.map((c: ComponentRef, i: number) =>
      i === index ? { ...c, [field]: value } : c
    );
    handleChange('madeOf', { ...item.madeOf, components: updated });
  };

  // === CanDo (VerbCapacity) handlers ===
  const handleAddCanDo = () => {
    const newVerb: VerbCapacity = { verb: 'cut', capacity: 10, unit: 'power' };
    handleChange('canDo', [...item.canDo, newVerb]);
  };

  const handleRemoveCanDo = (index: number) => {
    handleChange('canDo', item.canDo.filter((_: any, i: number) => i !== index));
  };

  const handleCanDoChange = (index: number, field: keyof VerbCapacity, value: any) => {
    const updated = item.canDo.map((v: VerbCapacity, i: number) =>
      i === index ? { ...v, [field]: value } : v
    );
    handleChange('canDo', updated);
  };

  // === CanBeUsedFor (CategorySatisfaction) handlers ===
  const handleAddCanBeUsedFor = () => {
    const newCat: CategorySatisfaction = { category: 'Crafting', subcategory: 'cutting' };
    handleChange('canBeUsedFor', [...item.canBeUsedFor, newCat]);
  };

  const handleRemoveCanBeUsedFor = (index: number) => {
    handleChange('canBeUsedFor', item.canBeUsedFor.filter((_: any, i: number) => i !== index));
  };

  const handleCanBeUsedForChange = (index: number, field: keyof CategorySatisfaction, value: any) => {
    const updated = item.canBeUsedFor.map((c: CategorySatisfaction, i: number) => {
      if (i !== index) return c;
      if (field === 'category') {
        // Reset subcategory when category changes
        const newSubcats = SUBCATEGORIES[value as FunctionalCategory];
        return { ...c, category: value, subcategory: newSubcats[0] };
      }
      return { ...c, [field]: value };
    });
    handleChange('canBeUsedFor', updated);
  };

  // Check for duplicate name
  const isDuplicateName = products.some(p => p.name.toLowerCase() === item.name.toLowerCase() && p.id !== item.id);
  const canSave = item.name.trim() !== '' && !isDuplicateName;

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header Card */}
      <Card>
        {isDuplicateName && (
          <div style={{ color: '#990F3D', fontSize: '12px', marginBottom: '8px' }}>
            A product with this name already exists
          </div>
        )}
        <FieldRow>
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter product name..."
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
            label="Tier"
            value={String(item.tier)}
            onChange={(e) => handleChange('tier', Number(e.target.value) as Tier)}
            width="80px"
            options={TIERS.map(t => ({ value: String(t), label: `T${t}` }))}
          />
          <CompactInput
            label="Weight"
            type="number"
            value={item.weight ?? 0}
            onChange={(e) => handleChange('weight', Number(e.target.value))}
            width="70px"
          />
          <CompactInput
            label="Durability"
            type="number"
            value={item.durability ?? 0}
            onChange={(e) => handleChange('durability', Number(e.target.value))}
            width="70px"
          />
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
                  deleteProduct(item.id);
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
        <FieldRow style={{ marginBottom: 0 }}>
          <input
            type="text"
            value={item.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter description..."
            style={{
              flex: 1,
              padding: '8px',
              background: '#FFFFFF',
              border: '1px solid #D4C4B0',
              borderRadius: '4px',
              color: '#333',
              fontSize: '14px',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#0D7680'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#D4C4B0'}
          />
          <CompactInput
            label="Sprite Key"
            type="text"
            value={item.spriteKey}
            onChange={(e) => handleChange('spriteKey', e.target.value)}
            width="120px"
          />
        </FieldRow>
      </Card>

      {/* Made Of - Raw Materials and Components */}
      <TwoColumnRow>
        <Card title="Raw Materials" style={{ flex: 1 }}>
          {item.madeOf.raw.map((r: RawMaterial, i: number) => (
            <FieldRow key={i} style={{ marginBottom: '8px' }}>
              <CompactSelect
                label=""
                value={r.materialId}
                onChange={(e) => handleRawChange(i, 'materialId', e.target.value)}
                width="140px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...sortedResources.map(res => ({ value: res.id, label: res.name }))
                ]}
              />
              <CompactInput
                label="x"
                type="number"
                value={r.amount}
                onChange={(e) => handleRawChange(i, 'amount', Number(e.target.value))}
                width="50px"
              />
              <CompactSelect
                label=""
                value={r.purity}
                onChange={(e) => handleRawChange(i, 'purity', e.target.value as Purity)}
                width="70px"
                options={PURITIES.map(p => ({ value: p, label: p }))}
              />
              <CompactSelect
                label=""
                value={r.state}
                onChange={(e) => handleRawChange(i, 'state', e.target.value as MaterialState)}
                width="90px"
                options={MATERIAL_STATES.map(s => ({ value: s, label: s }))}
              />
              <button
                onClick={() => handleRemoveRaw(i)}
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
          ))}
          <button
            onClick={handleAddRaw}
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
            + Add Raw Material
          </button>
        </Card>

        <Card title="Components" style={{ flex: 1 }}>
          {item.madeOf.components.map((c: ComponentRef, i: number) => (
            <FieldRow key={i} style={{ marginBottom: '8px' }}>
              <CompactSelect
                label=""
                value={c.componentId}
                onChange={(e) => handleComponentChange(i, 'componentId', e.target.value)}
                width="180px"
                options={[
                  { value: '', label: '-- Select --' },
                  ...sortedProducts.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <CompactInput
                label="x"
                type="number"
                value={c.count}
                onChange={(e) => handleComponentChange(i, 'count', Number(e.target.value))}
                width="50px"
              />
              <button
                onClick={() => handleRemoveComponent(i)}
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
          ))}
          <button
            onClick={handleAddComponent}
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
            + Add Component
          </button>
        </Card>
      </TwoColumnRow>

      {/* Can Do - Verb Capacities */}
      <Card title="Can Do (Verbs)">
        {item.canDo.map((v: VerbCapacity, i: number) => (
          <FieldRow key={i} style={{ marginBottom: '8px' }}>
            <CompactSelect
              label=""
              value={v.verb}
              onChange={(e) => handleCanDoChange(i, 'verb', e.target.value as Verb)}
              width="120px"
              options={VERBS.map(verb => ({ value: verb, label: verb }))}
            />
            <CompactInput
              label="Capacity"
              type="number"
              value={v.capacity}
              onChange={(e) => handleCanDoChange(i, 'capacity', Number(e.target.value))}
              width="70px"
            />
            <CompactInput
              label="Unit"
              type="text"
              value={v.unit}
              onChange={(e) => handleCanDoChange(i, 'unit', e.target.value)}
              width="80px"
            />
            <button
              onClick={() => handleRemoveCanDo(i)}
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
        ))}
        <button
          onClick={handleAddCanDo}
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
          + Add Verb
        </button>
      </Card>

      {/* Can Be Used For - Category Satisfactions */}
      <Card title="Can Be Used For (Categories)">
        {item.canBeUsedFor.map((c: CategorySatisfaction, i: number) => (
          <FieldRow key={i} style={{ marginBottom: '8px' }}>
            <CompactSelect
              label=""
              value={c.category}
              onChange={(e) => handleCanBeUsedForChange(i, 'category', e.target.value as FunctionalCategory)}
              width="130px"
              options={FUNCTIONAL_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
            />
            <CompactSelect
              label=""
              value={c.subcategory}
              onChange={(e) => handleCanBeUsedForChange(i, 'subcategory', e.target.value as Subcategory)}
              width="120px"
              options={SUBCATEGORIES[c.category as FunctionalCategory].map(sub => ({ value: sub, label: sub }))}
            />
            <button
              onClick={() => handleRemoveCanBeUsedFor(i)}
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
        ))}
        <button
          onClick={handleAddCanBeUsedFor}
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
          + Add Category
        </button>
      </Card>
    </div>
  );
}
