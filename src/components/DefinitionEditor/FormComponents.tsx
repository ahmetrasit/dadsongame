import React from 'react';

// Design System Components

export const TwoColumnRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
    {children}
  </div>
);

export const Card = ({ title, children, style }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
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

export const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
    {children}
  </div>
);

interface CompactInputProps {
  label: string;
  type: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  width?: string;
}

export const CompactInput = ({ label, type, value, onChange, width = '80px' }: CompactInputProps) => (
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

interface SelectOption {
  value: string;
  label: string;
}

interface CompactSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  width?: string;
}

export const CompactSelect = ({ label, value, onChange, options, width = '120px' }: CompactSelectProps) => (
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
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}

export const SliderField = ({ label, value, onChange, min = 0, max = 100 }: SliderFieldProps) => (
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

interface CheckboxGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (option: string) => void;
}

export const CheckboxGroup = ({ label, options, selected, onChange }: CheckboxGroupProps) => (
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
