import { describe, expect, it } from 'vitest'
import {
  SEASON_DAY_OF_YEAR,
  SOUTH_BAY_LATITUDE_DEG,
  sunPosition,
  sunPositionAt,
  TIME_OF_DAY_HOUR,
} from './sun'

// S0 feasibility spike — validate the hand-rolled solar math against KNOWN San
// Jose (~37.3°N) values before anything downstream trusts it. Tolerances of a
// degree or two are the spec's stated bar; we assert bands, not exact degrees.
//
// Reference solar-noon altitude at latitude φ: 90 − |φ − δ|.
//   summer solstice δ = +23.44 → 90 − (37.3 − 23.44) ≈ 76.1°
//   winter solstice δ = −23.44 → 90 − (37.3 + 23.44) ≈ 29.3°
//   equinox        δ ≈ 0       → 90 − 37.3            ≈ 52.7°

describe('sunPosition — solar-noon altitude at San Jose (S0 accuracy spike)', () => {
  it('summer solstice noon ≈ 76°', () => {
    const { altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.summer, 12)
    expect(altitudeDeg).toBeGreaterThan(74)
    expect(altitudeDeg).toBeLessThan(78)
  })

  it('winter solstice noon ≈ 29°', () => {
    const { altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.winter, 12)
    expect(altitudeDeg).toBeGreaterThan(27)
    expect(altitudeDeg).toBeLessThan(31)
  })

  it('spring equinox noon ≈ 53°', () => {
    const { altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.spring, 12)
    expect(altitudeDeg).toBeGreaterThan(51)
    expect(altitudeDeg).toBeLessThan(55)
  })

  it('fall equinox noon ≈ 53°', () => {
    const { altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.fall, 12)
    expect(altitudeDeg).toBeGreaterThan(50)
    expect(altitudeDeg).toBeLessThan(55)
  })

  it('places the noon sun due south (azimuth ≈ 180°)', () => {
    // Northern-hemisphere summer noon: sun is due south here.
    const { azimuthDeg } = sunPosition(SEASON_DAY_OF_YEAR.summer, 12)
    expect(Math.abs(azimuthDeg - 180)).toBeLessThan(3)
  })
})

describe('sunPosition — sunrise azimuth bands (S0 accuracy spike)', () => {
  it('summer sunrise is in the NE quadrant (azimuth < 90°)', () => {
    // Near summer sunrise (~5am solar). Sun rises north of due east.
    const { azimuthDeg, altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.summer, 5.5)
    expect(altitudeDeg).toBeGreaterThan(0) // sun is up
    expect(azimuthDeg).toBeGreaterThan(45)
    expect(azimuthDeg).toBeLessThan(90) // north of east ⇒ NE
  })

  it('winter sunrise is in the SE quadrant (azimuth > 90°)', () => {
    // Near winter sunrise (~7am solar). Sun rises south of due east.
    const { azimuthDeg, altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.winter, 7.5)
    expect(altitudeDeg).toBeGreaterThan(0)
    expect(azimuthDeg).toBeGreaterThan(90) // south of east ⇒ SE
    expect(azimuthDeg).toBeLessThan(135)
  })

  it('morning sun sits in the east (azimuth < 180°), afternoon in the west (> 180°)', () => {
    const morning = sunPosition(SEASON_DAY_OF_YEAR.spring, 9)
    const afternoon = sunPosition(SEASON_DAY_OF_YEAR.spring, 15)
    expect(morning.azimuthDeg).toBeLessThan(180)
    expect(afternoon.azimuthDeg).toBeGreaterThan(180)
  })
})

describe('sunPosition — the sun is below the horizon at night', () => {
  it('midnight altitude is negative', () => {
    expect(sunPosition(SEASON_DAY_OF_YEAR.summer, 0).altitudeDeg).toBeLessThan(0)
  })

  it('winter afternoon (3pm) sun is low but up', () => {
    const { altitudeDeg } = sunPosition(SEASON_DAY_OF_YEAR.winter, 15)
    expect(altitudeDeg).toBeGreaterThan(0)
    expect(altitudeDeg).toBeLessThan(20) // low winter afternoon sun
  })
})

describe('sunPositionAt — season/time bucket wiring', () => {
  it('matches sunPosition at the bucket day + hour', () => {
    const viaBucket = sunPositionAt('summer', 'midday')
    const direct = sunPosition(SEASON_DAY_OF_YEAR.summer, TIME_OF_DAY_HOUR.midday)
    expect(viaBucket.altitudeDeg).toBeCloseTo(direct.altitudeDeg, 10)
    expect(viaBucket.azimuthDeg).toBeCloseTo(direct.azimuthDeg, 10)
  })

  it('defaults to the fixed South Bay latitude (privacy contract)', () => {
    const bucketDefault = sunPositionAt('summer', 'midday')
    const explicit = sunPositionAt('summer', 'midday', SOUTH_BAY_LATITUDE_DEG)
    expect(bucketDefault.altitudeDeg).toBeCloseTo(explicit.altitudeDeg, 10)
  })
})
