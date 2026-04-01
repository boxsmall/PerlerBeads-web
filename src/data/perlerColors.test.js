import { describe, expect, it } from 'vitest'
import { findClosestColor } from './perlerColors'

describe('findClosestColor', () => {
  it('returns the same color for an exact palette hex', () => {
    const result = findClosestColor('#1E90FF')
    expect(result.id).toBe('blue')
  })

  it('maps a near-red hex to red family', () => {
    const result = findClosestColor('#E70010')
    expect(['red', 'dark-red', 'cherry-red', 'orange-red']).toContain(result.id)
  })
})
