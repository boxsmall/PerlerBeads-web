import { describe, expect, it } from 'vitest'
import { findClosestColor } from './perlerColors'

describe('findClosestColor', () => {
  it('returns the same color for an exact palette hex', () => {
    const result = findClosestColor('#F8F8F8')
    expect(result.id).toBe('perler-white')
  })

  it('maps a near-red hex to red family', () => {
    const result = findClosestColor('#E70010')
    expect(['perler-red', 'perler-fruit-punch', 'perler-hot-coral', 'perler-tomato']).toContain(result.id)
  })
})
