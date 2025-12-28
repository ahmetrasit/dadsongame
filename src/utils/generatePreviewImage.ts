// Generate realistic preview images for objects in the editor
// Creates detailed sprites matching or improving upon Phaser textures

export function generatePlantPreview(subCategory: string, name?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const scale = 60 / 32;
  ctx.scale(scale, scale);

  // Check for specific plants by name first
  if (name?.toLowerCase().includes('apple')) {
    return generateAppleTree(ctx);
  } else if (name?.toLowerCase().includes('wheat')) {
    return generateWheat(ctx);
  }

  // Fall back to generic category-based sprites
  if (subCategory === 'tree') {
    return generateGenericTree(ctx);
  } else if (subCategory === 'crop') {
    return generateGenericCrop(ctx);
  } else if (subCategory === 'flower') {
    return generateGenericFlower(ctx);
  } else if (subCategory === 'bush') {
    return generateGenericBush(ctx);
  }

  return canvas.toDataURL();
}

function generateAppleTree(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(15, 76, 42, 0.3)';
  ctx.beginPath();
  ctx.arc(18, 20, 13, 0, Math.PI * 2);
  ctx.fill();

  // Tree canopy - dark base
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(16, 16, 13, 0, Math.PI * 2);
  ctx.fill();

  // Mid-tone foliage
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(16, 15, 11, 0, Math.PI * 2);
  ctx.fill();

  // Light foliage clusters
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(11, 11, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 13, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, 19, 4, 0, Math.PI * 2);
  ctx.fill();

  // Apples (red dots)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(13, 14, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 16, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15, 18, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Apple highlights
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(13.5, 13.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18.5, 15.5, 0.5, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateWheat(ctx: CanvasRenderingContext2D): string {
  // Soil/ground
  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, 24, 32, 8);

  // Wheat stalks
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 7; i++) {
    const x = 4 + i * 4;
    const h = 18 + Math.random() * 4;

    // Stalk
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, 24 - h);
    ctx.stroke();

    // Wheat head
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(x, 24 - h - 2, 1.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add some depth with darker stalks
  ctx.strokeStyle = '#a16207';
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 8;
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, 10);
    ctx.stroke();
  }

  return ctx.canvas.toDataURL();
}

function generateGenericTree(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(18, 20, 12, 0, Math.PI * 2);
  ctx.fill();

  // Canopy
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(12, 12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 14, 5, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateGenericCrop(ctx: CanvasRenderingContext2D): string {
  // Soil
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 22, 32, 10);

  // Crop rows
  ctx.fillStyle = '#65a30d';
  for (let i = 0; i < 8; i++) {
    const x = 2 + i * 4;
    ctx.fillRect(x, 14, 2, 8);
  }

  // Highlights
  ctx.fillStyle = '#84cc16';
  for (let i = 0; i < 8; i++) {
    const x = 2 + i * 4;
    ctx.fillRect(x, 14, 1, 4);
  }

  return ctx.canvas.toDataURL();
}

function generateGenericFlower(ctx: CanvasRenderingContext2D): string {
  // Grass base
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 20, 32, 12);

  // Flowers
  const colors = ['#ec4899', '#f472b6', '#fbbf24', '#f59e0b'];
  for (let i = 0; i < 8; i++) {
    const x = 4 + (i % 4) * 8;
    const y = 12 + Math.floor(i / 4) * 8;

    // Stem
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(x, y, 1, 8);

    // Petals
    ctx.fillStyle = colors[i % colors.length];
    for (let p = 0; p < 4; p++) {
      const angle = (p * Math.PI) / 2;
      const px = x + Math.cos(angle) * 2;
      const py = y + Math.sin(angle) * 2;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  return ctx.canvas.toDataURL();
}

function generateGenericBush(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 22, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bush clusters
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(12, 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, 14, 7, 0, Math.PI * 2);
  ctx.fill();

  // Highlights
  ctx.fillStyle = '#84cc16';
  ctx.beginPath();
  ctx.arc(14, 15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 16, 2, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

export function generateAnimalPreview(subCategory: string, name?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const scale = 60 / 32;
  ctx.scale(scale, scale);

  // Check for specific animals by name
  if (name?.toLowerCase().includes('cow')) {
    return generateCow(ctx);
  } else if (name?.toLowerCase().includes('chicken')) {
    return generateChicken(ctx);
  }

  // Fall back to generic category-based sprites
  if (subCategory === 'livestock') {
    return generateGenericLivestock(ctx);
  } else if (subCategory === 'poultry') {
    return generateGenericPoultry(ctx);
  } else if (subCategory === 'wild') {
    return generateGenericWild(ctx);
  } else if (subCategory === 'pet') {
    return generateGenericPet(ctx);
  }

  return canvas.toDataURL();
}

function generateCow(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 24, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.ellipse(16, 16, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Spots
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(12, 15, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, 17, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.arc(16, 11, 4, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#fca5a5';
  ctx.beginPath();
  ctx.ellipse(13, 9, 1.5, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(19, 9, 1.5, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(14, 11, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 11, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(11, 20, 2, 4);
  ctx.fillRect(19, 20, 2, 4);

  return ctx.canvas.toDataURL();
}

function generateChicken(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(16, 26, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(16, 18, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing detail
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(20, 18, 2, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(16, 12, 3, 0, Math.PI * 2);
  ctx.fill();

  // Comb
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(14, 10);
  ctx.lineTo(15, 8);
  ctx.lineTo(16, 9);
  ctx.lineTo(17, 8);
  ctx.lineTo(18, 10);
  ctx.lineTo(16, 11);
  ctx.closePath();
  ctx.fill();

  // Beak
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(16, 13);
  ctx.lineTo(19, 12);
  ctx.lineTo(16, 14);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(17, 11, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(14, 23);
  ctx.lineTo(14, 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18, 23);
  ctx.lineTo(18, 26);
  ctx.stroke();

  return ctx.canvas.toDataURL();
}

function generateGenericLivestock(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 24, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.ellipse(16, 16, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(16, 11, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(14, 11, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 11, 0.7, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateGenericPoultry(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(16, 26, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(16, 18, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(16, 13, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(17, 12, 0.5, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateGenericWild(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 24, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.ellipse(16, 16, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.arc(16, 11, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (alert)
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(14, 10, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 10, 1, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(14, 10, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 10, 0.4, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateGenericPet(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(16, 24, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#ec4899';
  ctx.beginPath();
  ctx.ellipse(16, 17, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(16, 12, 3, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#ec4899';
  ctx.beginPath();
  ctx.moveTo(13, 10);
  ctx.lineTo(12, 7);
  ctx.lineTo(14, 11);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(19, 10);
  ctx.lineTo(20, 7);
  ctx.lineTo(18, 11);
  ctx.closePath();
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(14, 12, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, 12, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(14.5, 11.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18.5, 11.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

export function generateResourcePreview(category: string, name?: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const scale = 60 / 32;
  ctx.scale(scale, scale);

  // Check for specific resources by name
  if (name?.toLowerCase().includes('apple')) {
    return generateApple(ctx);
  } else if (name?.toLowerCase().includes('wood')) {
    return generateWood(ctx);
  } else if (name?.toLowerCase().includes('wheat')) {
    return generateWheatItem(ctx);
  } else if (name?.toLowerCase().includes('milk')) {
    return generateMilk(ctx);
  } else if (name?.toLowerCase().includes('meat')) {
    return generateMeat(ctx);
  } else if (name?.toLowerCase().includes('leather')) {
    return generateLeather(ctx);
  } else if (name?.toLowerCase().includes('egg')) {
    return generateEgg(ctx);
  }

  // Fall back to generic category-based sprites
  return generateGenericResource(ctx, category);
}

function generateApple(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 22, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Apple body
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(16, 16, 8, 0, Math.PI * 2);
  ctx.fill();

  // Top indentation
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.ellipse(16, 11, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.fillStyle = '#78350f';
  ctx.fillRect(15, 8, 2, 4);

  // Leaf
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.ellipse(18, 9, 2, 1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(12, 13, 3, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateWood(ctx: CanvasRenderingContext2D): string {
  // Log shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(6, 21, 20, 3);

  // Log side
  ctx.fillStyle = '#92400e';
  ctx.fillRect(6, 12, 20, 9);

  // Log top
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(16, 12, 10, 4, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 12, 10, 4, 0, 0, Math.PI);
  ctx.fill();

  // Wood rings
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 0.8;
  for (let r = 2; r <= 8; r += 2) {
    ctx.beginPath();
    ctx.ellipse(16, 12, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(16, 12, 1.5, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateWheatItem(ctx: CanvasRenderingContext2D): string {
  // Bundle of wheat stalks
  ctx.fillStyle = '#eab308';
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 3;
    ctx.fillRect(x, 8, 2, 16);
  }

  // Wheat heads
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 3;
    ctx.beginPath();
    ctx.ellipse(x + 1, 7, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tie/rope
  ctx.fillStyle = '#78350f';
  ctx.fillRect(8, 18, 16, 2);

  return ctx.canvas.toDataURL();
}

function generateMilk(ctx: CanvasRenderingContext2D): string {
  // Bottle shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(10, 24, 12, 2);

  // Bottle
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(11, 10, 10, 14);
  ctx.fillRect(13, 8, 6, 2);

  // Bottle outline
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(11, 10, 10, 14);

  // Cap
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(13, 6, 6, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(13, 6, 6, 1);

  // Label
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(12, 14, 8, 4);

  // Milk level
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 11, 8, 12);

  return ctx.canvas.toDataURL();
}

function generateMeat(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(16, 22, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Meat piece
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.quadraticCurveTo(8, 16, 10, 20);
  ctx.lineTo(22, 20);
  ctx.quadraticCurveTo(24, 16, 22, 12);
  ctx.closePath();
  ctx.fill();

  // Darker meat tone
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(12, 14);
  ctx.quadraticCurveTo(11, 17, 13, 19);
  ctx.lineTo(19, 19);
  ctx.quadraticCurveTo(21, 17, 20, 14);
  ctx.closePath();
  ctx.fill();

  // Fat marbling
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(14, 15, 1.5, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, 17, 1, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateLeather(ctx: CanvasRenderingContext2D): string {
  // Leather hide
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.moveTo(8, 10);
  ctx.quadraticCurveTo(6, 16, 8, 22);
  ctx.lineTo(24, 22);
  ctx.quadraticCurveTo(26, 16, 24, 10);
  ctx.closePath();
  ctx.fill();

  // Texture
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 10; i++) {
    const x = 10 + Math.random() * 12;
    const y = 12 + Math.random() * 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 1);
    ctx.stroke();
  }

  // Darker edges
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(8, 10, 16, 1);
  ctx.fillRect(8, 21, 16, 1);

  return ctx.canvas.toDataURL();
}

function generateEgg(ctx: CanvasRenderingContext2D): string {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(16, 24, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Egg
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(16, 16, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Egg texture/spots
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(13, 14, 1, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, 16, 0.8, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(15, 19, 0.7, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(12, 13, 2, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  return ctx.canvas.toDataURL();
}

function generateGenericResource(ctx: CanvasRenderingContext2D, category: string): string {
  const colorMap: Record<string, string> = {
    food: '#ef4444',
    water: '#3b82f6',
    metal: '#78716c',
    rock: '#6b7280',
    wood: '#d97706',
    organics: '#84cc16',
  };

  ctx.fillStyle = colorMap[category] || '#6b7280';
  ctx.beginPath();
  ctx.roundRect(6, 6, 20, 20, 3);
  ctx.fill();

  // Add some shading
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(6, 22, 20, 4);

  return ctx.canvas.toDataURL();
}
