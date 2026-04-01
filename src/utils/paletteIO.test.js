import { describe, expect, it } from 'vitest'
import { parsePaletteText, serializePalette } from './paletteIO'

describe('paletteIO', () => {
  it('parses valid palette lines and deduplicates by hex', () => {
    const text = '#ff0000,Red\n#00ff00,Green\nff0000,Duplicated'
    const result = parsePaletteText(text)

    expect(result).toHaveLength(2)
    expect(result[0].hex).toBe('#FF0000')
    expect(result[0].name).toBe('Red')
    expect(result[1].hex).toBe('#00FF00')
  })

  it('serializes palette to csv-like lines', () => {
    const output = serializePalette([
      { id: 'custom-1', hex: '#112233', name: 'A' },
      { id: 'custom-2', hex: '#445566', name: 'B' }
    ])

    expect(output).toBe('#112233,A\n#445566,B')
  })
})
