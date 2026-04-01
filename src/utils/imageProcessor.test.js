import { describe, expect, it } from 'vitest'
import { getUsedColors } from './imageProcessor'

describe('getUsedColors', () => {
  it('counts color usage and sorts by count desc', () => {
    const pixels = ['red', 'blue', 'red', null, 'blue', 'red']
    const result = getUsedColors(pixels)

    expect(result).toHaveLength(2)
    expect(result[0].color.id).toBe('red')
    expect(result[0].count).toBe(3)
    expect(result[1].color.id).toBe('blue')
    expect(result[1].count).toBe(2)
  })

  it('returns empty list when all pixels are transparent', () => {
    const result = getUsedColors([null, null, null])
    expect(result).toEqual([])
  })
})
