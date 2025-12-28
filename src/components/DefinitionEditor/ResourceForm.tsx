import { useMemo } from 'react';
import { useDefinitionsStore } from '@/stores/definitionsStore';
import { Card, FieldRow, CompactInput, CompactSelect } from './FormComponents';
import { FaTrashAlt } from 'react-icons/fa';
import { generateResourcePreview } from '@/utils/generatePreviewImage';

interface ResourceFormProps {
  item: any;
  isDraft?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

export function ResourceForm({ item, isDraft, onSave, onCancel }: ResourceFormProps) {
  const { updateResource, updateDraftResource, deleteResource, resources } = useDefinitionsStore();

  const handleChange = (field: string, value: any) => {
    if (isDraft) {
      updateDraftResource({ [field]: value });
    } else {
      updateResource(item.id, { [field]: value });
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    const autoSpoilageCategories = ['metal', 'rock', 'wood', 'organics'];
    if (autoSpoilageCategories.includes(newCategory)) {
      if (isDraft) {
        updateDraftResource({ category: newCategory as 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics', spoilageRate: 'never' });
      } else {
        updateResource(item.id, { category: newCategory as 'food' | 'water' | 'metal' | 'rock' | 'wood' | 'organics', spoilageRate: 'never' });
      }
    } else {
      handleChange('category', newCategory);
    }
  };

  const isSpoilageDisabled = ['metal', 'rock', 'wood', 'organics'].includes(item.category);

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
          {/* Image preview and upload */}
          <div
            onClick={() => document.getElementById(`resource-image-upload-${item.id}`)?.click()}
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
            title={item.imageUrl ? "Click to change image" : "Click to upload custom image (default preview shown)"}
          >
          </div>
          <input
            id={`resource-image-upload-${item.id}`}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  handleChange('imageUrl', reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
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
              { value: 'water', label: 'Water' },
              { value: 'metal', label: 'Metal' },
              { value: 'rock', label: 'Rock' },
              { value: 'wood', label: 'Wood' },
              { value: 'organics', label: 'Organics' },
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
    </div>
  );
}
