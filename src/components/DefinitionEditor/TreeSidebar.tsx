// Tree Sidebar Component

export interface TreeSidebarProps {
  categories: string[];
  items: any[];
  getCategory: (item: any) => string;
  expandedCategories: Set<string>;
  toggleCategory: (category: string) => void;
  selectedId: string | null;
  selectItem: (id: string) => void;
}

export function TreeSidebar({
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
        // Sort items alphabetically by name within each category (case-insensitive)
        const categoryItems = (itemsByCategory[category] || [])
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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
