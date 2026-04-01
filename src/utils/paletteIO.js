function normalizeHex(hex) {
  const raw = hex.trim()
  const value = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null
  return value.toUpperCase()
}

export function parsePaletteText(text) {
  const lines = text.split(/\r?\n/)
  const colors = []
  const seen = new Set()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    const parts = trimmed.split(',')
    const maybeHex = normalizeHex(parts[0] || '')
    if (!maybeHex) continue
    if (seen.has(maybeHex)) continue

    const name = (parts[1] || `Custom ${colors.length + 1}`).trim() || `Custom ${colors.length + 1}`
    colors.push({
      id: `custom-${colors.length + 1}`,
      name,
      hex: maybeHex
    })
    seen.add(maybeHex)
  }

  return colors
}

export function serializePalette(colors) {
  return colors.map(color => `${color.hex},${color.name}`).join('\n')
}
