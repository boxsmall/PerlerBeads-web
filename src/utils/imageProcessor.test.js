import { describe, expect, it } from 'vitest'
import { getUsedColors } from './imageProcessor'

describe('getUsedColors', () => {
  it('counts color usage and sorts by count desc', () => {
    const pixels = ['perler-red', 'perler-light-blue', 'perler-red', null, 'perler-light-blue', 'perler-red']
    const result = getUsedColors(pixels)

    expect(result).toHaveLength(2)
    expect(result[0].color.id).toBe('perler-red')
    expect(result[0].count).toBe(3)
    expect(result[1].color.id).toBe('perler-light-blue')
    expect(result[1].count).toBe(2)
  })

  it('returns empty list when all pixels are transparent', () => {
    const result = getUsedColors([null, null, null])
    expect(result).toEqual([])
  })
})
