import { FaTrashAlt } from 'react-icons/fa';
import { FieldRow, CompactInput, CompactSelect } from './FormComponents';
import type {
  MaterialTransformation,
  TransformationAction,
  TransformationProperty,
  TransformationRequirement,
  ResourceDefinition
} from '@/stores/definitions/resourcesStore';

const TRANSFORMATION_ACTIONS: TransformationAction[] = [
  'chop', 'cook', 'dry', 'soak', 'grind', 'portion', 'mold', 'smelt', 'tan', 'weave', 'twist'
];

const TRANSFORMATION_PROPERTIES: TransformationProperty[] = [
  'cutting', 'shaping', 'piercing', 'digging', 'grinding', 'scooping', 'heat', 'dry', 'soak'
];

interface TransformationsEditorProps {
  transformations: MaterialTransformation[];
  resources: ResourceDefinition[];
  onChange: (transformations: MaterialTransformation[]) => void;
  excludeResourceId?: string;  // Optional: exclude this resource from result dropdown
  compact?: boolean;  // Use smaller styling for nested use
}

export function TransformationsEditor({
  transformations,
  resources,
  onChange,
  excludeResourceId,
  compact = false
}: TransformationsEditorProps) {
  const handleAddTransformation = () => {
    const newTransformation: MaterialTransformation = {
      action: 'chop',
      resultMaterialId: '',
      resultQuantity: 1,
      requirements: []
    };
    onChange([...transformations, newTransformation]);
  };

  const handleUpdateTransformation = (index: number, updates: Partial<MaterialTransformation>) => {
    const updated = [...transformations];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeleteTransformation = (index: number) => {
    onChange(transformations.filter((_, i) => i !== index));
  };

  const handleAddRequirement = (transformIndex: number) => {
    const updated = [...transformations];
    const newReq: TransformationRequirement = { property: 'cutting', min: 1 };
    updated[transformIndex] = {
      ...updated[transformIndex],
      requirements: [...updated[transformIndex].requirements, newReq]
    };
    onChange(updated);
  };

  const handleUpdateRequirement = (
    transformIndex: number,
    reqIndex: number,
    updates: Partial<TransformationRequirement>
  ) => {
    const updated = [...transformations];
    const requirements = [...updated[transformIndex].requirements];
    requirements[reqIndex] = { ...requirements[reqIndex], ...updates };
    updated[transformIndex] = { ...updated[transformIndex], requirements };
    onChange(updated);
  };

  const handleDeleteRequirement = (transformIndex: number, reqIndex: number) => {
    const updated = [...transformations];
    updated[transformIndex] = {
      ...updated[transformIndex],
      requirements: updated[transformIndex].requirements.filter((_, i) => i !== reqIndex)
    };
    onChange(updated);
  };

  const availableResources = excludeResourceId
    ? resources.filter(r => r.id !== excludeResourceId)
    : resources;

  return (
    <div>
      {transformations.map((transform, tIndex) => (
        <div key={tIndex} style={{
          background: compact ? '#e8e8e8' : '#f5f5f5',
          padding: compact ? '8px' : '12px',
          borderRadius: '8px',
          marginBottom: compact ? '8px' : '12px'
        }}>
          <FieldRow style={{ marginBottom: '8px' }}>
            <CompactSelect
              label="Action"
              value={transform.action}
              onChange={(e) => handleUpdateTransformation(tIndex, { action: e.target.value as TransformationAction })}
              width={compact ? '100px' : '120px'}
              options={TRANSFORMATION_ACTIONS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
            />
            <span style={{ margin: '0 8px', alignSelf: 'center' }}>→</span>
            <CompactSelect
              label="Result"
              value={transform.resultMaterialId}
              onChange={(e) => handleUpdateTransformation(tIndex, { resultMaterialId: e.target.value })}
              width={compact ? '140px' : '180px'}
              options={[
                { value: '', label: 'Select material...' },
                ...availableResources.map(r => ({ value: r.id, label: r.name }))
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
          {transform.requirements.map((req, rIndex) => (
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
          padding: compact ? '6px 12px' : '8px 16px',
          background: '#22c55e',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: compact ? '12px' : '14px'
        }}
      >
        + Add Transformation
      </button>
    </div>
  );
}
