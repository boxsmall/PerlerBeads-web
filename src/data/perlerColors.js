// Perler 珠子标准颜色数据
// 包含常见的 40+ 种 Perler 颜色

export const perlerColors = [
  // 白色系
  { id: 'white', name: '白色', hex: '#FFFFFF' },
  { id: 'cream', name: '奶油白', hex: '#FFFDD0' },

  // 黑色系
  { id: 'black', name: '黑色', hex: '#1A1A1A' },
  { id: 'charcoal', name: '炭灰', hex: '#36454F' },

  // 红色系
  { id: 'red', name: '红色', hex: '#E60012' },
  { id: 'dark-red', name: '深红', hex: '#8B0000' },
  { id: 'cherry-red', name: '樱桃红', hex: '#DE3163' },
  { id: 'orange-red', name: '橙红', hex: '#FF4500' },

  // 橙色系
  { id: 'orange', name: '橙色', hex: '#FF6600' },
  { id: 'dark-orange', name: '深橙', hex: '#FF8C00' },
  { id: 'peach', name: '桃子色', hex: '#FFCBA4' },

  // 黄色系
  { id: 'yellow', name: '黄色', hex: '#FFD700' },
  { id: 'lemon-yellow', name: '柠檬黄', hex: '#FFF44F' },
  { id: 'mustard', name: '芥末黄', hex: '#FFDB58' },

  // 绿色系
  { id: 'green', name: '绿色', hex: '#228B22' },
  { id: 'lime-green', name: '酸橙绿', hex: '#32CD32' },
  { id: 'dark-green', name: '深绿', hex: '#006400' },
  { id: 'olive', name: '橄榄绿', hex: '#808000' },
  { id: 'mint', name: '薄荷绿', hex: '#98FF98' },

  // 蓝色系
  { id: 'blue', name: '蓝色', hex: '#1E90FF' },
  { id: 'dark-blue', name: '深蓝', hex: '#00008B' },
  { id: 'light-blue', name: '浅蓝', hex: '#ADD8E6' },
  { id: 'sky-blue', name: '天蓝', hex: '#87CEEB' },
  { id: 'teal', name: '蓝绿', hex: '#008080' },
  { id: 'turquoise', name: '绿松石', hex: '#40E0D0' },

  // 紫色系
  { id: 'purple', name: '紫色', hex: '#800080' },
  { id: 'dark-purple', name: '深紫', hex: '#4B0082' },
  { id: 'lavender', name: '薰衣草', hex: '#E6E6FA' },
  { id: 'violet', name: '紫罗兰', hex: '#EE82EE' },

  // 粉色系
  { id: 'pink', name: '粉色', hex: '#FF69B4' },
  { id: 'hot-pink', name: '热粉', hex: '#FF1493' },
  { id: 'light-pink', name: '浅粉', hex: '#FFB6C1' },

  // 棕色系
  { id: 'brown', name: '棕色', hex: '#8B4513' },
  { id: 'dark-brown', name: '深棕', hex: '#5D4037' },
  { id: 'tan', name: '棕褐色', hex: '#D2B48C' },

  // 灰色系
  { id: 'gray', name: '灰色', hex: '#808080' },
  { id: 'light-gray', name: '浅灰', hex: '#D3D3D3' },
  { id: 'dark-gray', name: '深灰', hex: '#404040' },

  // 特殊色
  { id: 'silver', name: '银色', hex: '#C0C0C0' },
  { id: 'gold', name: '金色', hex: '#FFD700' },
  { id: 'beige', name: '米色', hex: '#F5F5DC' },
  { id: 'ivory', name: '象牙白', hex: '#FFFFF0' },
  { id: 'coral', name: '珊瑚色', hex: '#FF7F50' },
  { id: 'navy', name: '海军蓝', hex: '#000080' },
]

// 将颜色转换为查找Map
export const colorMap = new Map(perlerColors.map(c => [c.id, c]))

const paletteBrandIds = {
  perler: perlerColors.map(c => c.id),
  hama: [
    'white', 'black', 'red', 'dark-red', 'orange', 'yellow', 'green', 'dark-green',
    'blue', 'dark-blue', 'purple', 'pink', 'brown', 'gray', 'light-gray', 'beige'
  ],
  artkal: [
    'white', 'cream', 'black', 'charcoal', 'red', 'cherry-red', 'orange-red', 'orange',
    'dark-orange', 'yellow', 'lemon-yellow', 'green', 'lime-green', 'mint', 'blue',
    'light-blue', 'sky-blue', 'teal', 'turquoise', 'purple', 'lavender', 'pink',
    'hot-pink', 'brown', 'tan', 'gray', 'light-gray', 'dark-gray', 'ivory', 'coral', 'navy'
  ],
  nabbi: [
    'white', 'black', 'red', 'orange', 'yellow', 'green', 'blue', 'purple',
    'pink', 'brown', 'gray', 'light-gray', 'dark-blue', 'light-blue', 'tan', 'beige'
  ]
}

export const paletteBrands = [
  { id: 'perler', name: 'Perler' },
  { id: 'hama', name: 'Hama' },
  { id: 'artkal', name: 'Artkal' },
  { id: 'nabbi', name: 'Nabbi' }
]

export function getPaletteColors(brand = 'perler') {
  const ids = paletteBrandIds[brand] || paletteBrandIds.perler
  const colors = ids.map(id => colorMap.get(id)).filter(Boolean)
  return colors.length > 0 ? colors : perlerColors
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function euclideanDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

function manhattanDistance(c1, c2) {
  return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b)
}

function weightedDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) * 0.3 +
    Math.pow(c1.g - c2.g, 2) * 0.59 +
    Math.pow(c1.b - c2.b, 2) * 0.11
  )
}

export function calculateColorDistance(c1, c2, method = 'euclidean') {
  if (method === 'manhattan') return manhattanDistance(c1, c2)
  if (method === 'weighted') return weightedDistance(c1, c2)
  return euclideanDistance(c1, c2)
}

export function findClosestColorFromRgb(targetRgb, palette = perlerColors, distanceMethod = 'euclidean') {
  let minDistance = Infinity
  let closestColor = palette[0] || perlerColors[0]

  for (const color of palette) {
    const rgb = hexToRgb(color.hex)
    const distance = calculateColorDistance(targetRgb, rgb, distanceMethod)
    if (distance < minDistance) {
      minDistance = distance
      closestColor = color
    }
  }

  return closestColor
}

// 根据hex值查找最接近的颜色
export function findClosestColor(targetHex, palette = perlerColors, distanceMethod = 'euclidean') {
  return findClosestColorFromRgb(hexToRgb(targetHex), palette, distanceMethod)
}

export default perlerColors
