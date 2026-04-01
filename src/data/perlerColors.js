import artkalPaletteText from './palettes/artkal.txt?raw'
import nabbiPaletteText from './palettes/nabbi.txt?raw'
import hamaPaletteText from './palettes/hama.txt?raw'
import perlerPaletteText from './palettes/perler.txt?raw'

function parseBuiltinPalette(text, brand) {
  const lines = text.split(/\r?\n/)
  const colors = []
  const seen = new Set()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const firstComma = trimmed.indexOf(',')
    if (firstComma <= 0) continue

    const hexRaw = trimmed.slice(0, firstComma).trim()
    const label = trimmed.slice(firstComma + 1).trim() || `${brand.toUpperCase()}-${colors.length + 1}`
    const codeMatch = label.match(/\b([A-Za-z]+\d+)\b/)
    const code = codeMatch ? codeMatch[1].toUpperCase() : null
    const name = label
    const hex = /^#[0-9a-fA-F]{6}$/.test(hexRaw) ? hexRaw.toUpperCase() : null
    if (!hex || seen.has(hex)) continue

    colors.push({
      id: `${brand}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      code,
      hex
    })
    seen.add(hex)
  }

  return colors
}

export const perlerColors = parseBuiltinPalette(perlerPaletteText, 'perler')
// 将颜色转换为查找Map
export const colorMap = new Map(perlerColors.map(c => [c.id, c]))

const hamaPalette = parseBuiltinPalette(hamaPaletteText, 'hama')
const artkalPalette = parseBuiltinPalette(artkalPaletteText, 'artkal')
const nabbiPalette = parseBuiltinPalette(nabbiPaletteText, 'nabbi')

const paletteBrandMap = {
  perler: perlerColors,
  hama: hamaPalette,
  artkal: artkalPalette,
  nabbi: nabbiPalette
}

export const paletteBrands = [
  { id: 'perler', name: 'Perler' },
  { id: 'hama', name: 'Hama' },
  { id: 'artkal', name: 'Artkal' },
  { id: 'nabbi', name: 'Nabbi' }
]

export function getPaletteColors(brand = 'perler') {
  return paletteBrandMap[brand] || perlerColors
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
