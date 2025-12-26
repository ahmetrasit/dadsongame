import { VERSION } from '@/version';

export function VersionBadge() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: '4px',
        color: '#888',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {VERSION}
    </div>
  );
}
