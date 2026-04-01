import { colorMap, findClosestColor, findClosestColorFromRgb, getPaletteColors } from '../data/perlerColors'

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function buildPaletteMap(paletteColors = null) {
  if (!paletteColors || paletteColors.length === 0) return colorMap
  return new Map(paletteColors.map(c => [c.id, c]))
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function extractOpaquePixels(imageData) {
  const pixels = []
  for (let i = 0; i < imageData.data.length; i += 4) {
    const a = imageData.data[i + 3]
    if (a >= 128) {
      pixels.push({
        r: imageData.data[i],
        g: imageData.data[i + 1],
        b: imageData.data[i + 2]
      })
    }
  }
  return pixels
}

function medianCut(pixels, maxColors) {
  if (pixels.length === 0) return []
  let buckets = [pixels]

  while (buckets.length < maxColors) {
    let maxRange = -1
    let maxIndex = 0
    let maxChannel = 0

    buckets.forEach((bucket, index) => {
      if (bucket.length === 0) return

      const ranges = [0, 1, 2].map(channel => {
        const values = bucket.map(p => [p.r, p.g, p.b][channel])
        return Math.max(...values) - Math.min(...values)
      })
      const range = Math.max(...ranges)
      if (range > maxRange) {
        maxRange = range
        maxIndex = index
        maxChannel = ranges.indexOf(range)
      }
    })

    if (maxRange <= 0) break

    const bucket = buckets[maxIndex]
    bucket.sort((a, b) => [a.r, a.g, a.b][maxChannel] - [b.r, b.g, b.b][maxChannel])
    const mid = Math.floor(bucket.length / 2)
    buckets.splice(maxIndex, 1, bucket.slice(0, mid), bucket.slice(mid))
  }

  return buckets
    .filter(b => b.length > 0)
    .map(bucket => {
      const sum = bucket.reduce((acc, p) => ({
        r: acc.r + p.r,
        g: acc.g + p.g,
        b: acc.b + p.b
      }), { r: 0, g: 0, b: 0 })
      return {
        r: Math.round(sum.r / bucket.length),
        g: Math.round(sum.g / bucket.length),
        b: Math.round(sum.b / bucket.length)
      }
    })
}

function kMeans(pixels, maxColors, iterations = 8) {
  if (pixels.length === 0) return []
  const target = Math.max(1, Math.min(maxColors, pixels.length))
  const centroids = []
  const step = pixels.length / target
  for (let i = 0; i < target; i++) {
    centroids.push({ ...pixels[Math.floor(i * step)] })
  }

  for (let iter = 0; iter < iterations; iter++) {
    const groups = Array.from({ length: centroids.length }, () => [])

    for (const p of pixels) {
      let best = 0
      let minDist = Infinity
      centroids.forEach((c, idx) => {
        const dr = p.r - c.r
        const dg = p.g - c.g
        const db = p.b - c.b
        const dist = dr * dr + dg * dg + db * db
        if (dist < minDist) {
          minDist = dist
          best = idx
        }
      })
      groups[best].push(p)
    }

    groups.forEach((group, idx) => {
      if (group.length === 0) return
      const sum = group.reduce((acc, p) => ({
        r: acc.r + p.r,
        g: acc.g + p.g,
        b: acc.b + p.b
      }), { r: 0, g: 0, b: 0 })
      centroids[idx] = {
        r: Math.round(sum.r / group.length),
        g: Math.round(sum.g / group.length),
        b: Math.round(sum.b / group.length)
      }
    })
  }

  return centroids
}

function buildQuantizationPalette(opaquePixels, algorithm, maxColors) {
  if (algorithm === 'none' || maxColors <= 0) return null
  if (algorithm === 'kmeans') return kMeans(opaquePixels, maxColors)
  return medianCut(opaquePixels, maxColors)
}

function findClosestRgb(target, palette) {
  let min = Infinity
  let closest = palette[0]
  for (const c of palette) {
    const dr = target.r - c.r
    const dg = target.g - c.g
    const db = target.b - c.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < min) {
      min = dist
      closest = c
    }
  }
  return closest
}

function processPixelMode(imageData, width, height, options) {
  const { paletteColors, distanceMethod, maxColors } = options

  const opaquePixels = extractOpaquePixels(imageData)
  const finalMaxColors = Math.max(1, Math.min(maxColors || paletteColors.length, paletteColors.length))
  const quantPalette = buildQuantizationPalette(opaquePixels, 'median-cut', finalMaxColors)
  const data = imageData.data
  const pixels = new Array(width * height).fill(null)

  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4
    const a = data[i + 3]
    if (a < 128) {
      pixels[idx] = null
      continue
    }

    const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] }

    const quantized = quantPalette ? findClosestRgb(rgb, quantPalette) : rgb
    const closestColor = findClosestColorFromRgb(quantized, paletteColors, distanceMethod)
    pixels[idx] = closestColor.id
  }
  return pixels
}

export async function resizeImageToPattern(imageUrl, targetWidth, targetHeight, transform = {}) {
  const {
    x = 0,
    y = 0,
    scale = 1,
    containerWidth = 400,
    containerHeight = 400,
    paletteBrand = 'perler',
    maxColors = 24
  } = transform

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = createOffscreenCanvas(targetWidth, targetHeight)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const fitScale = Math.min(containerWidth / img.width, containerHeight / img.height)
      const baseWidth = img.width * fitScale
      const baseHeight = img.height * fitScale
      const previewWidth = baseWidth * scale
      const previewHeight = baseHeight * scale
      const actualX = containerWidth / 2 + x - previewWidth / 2
      const actualY = containerHeight / 2 + y - previewHeight / 2

      const ratioX = targetWidth / containerWidth
      const ratioY = targetHeight / containerHeight
      const drawWidth = previewWidth * ratioX
      const drawHeight = previewHeight * ratioY
      const drawX = actualX * ratioX
      const drawY = actualY * ratioY
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
      const paletteColors = getPaletteColors(paletteBrand)
      const pixels = processPixelMode(imageData, targetWidth, targetHeight, {
        paletteColors,
        distanceMethod: 'euclidean',
        maxColors
      })

      resolve({
        pixels,
        width: targetWidth,
        height: targetHeight,
        paletteColors
      })
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = imageUrl
  })
}

export async function quantizeImage(imageUrl, maxColors = 16) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = createOffscreenCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const pixels = extractOpaquePixels(imageData)
      const palette = medianCut(pixels, maxColors)
      const quantizedPixels = pixels.map(pixel => {
        const closest = findClosestRgb(pixel, palette)
        const hex = rgbToHex(closest.r, closest.g, closest.b)
        return findClosestColor(hex).id
      })

      resolve({
        palette,
        pixels: quantizedPixels,
        width: img.width,
        height: img.height
      })
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = imageUrl
  })
}

export function renderPatternToCanvas(pixels, width, height, cellSize = 20, paletteColors = null) {
  const paletteMap = buildPaletteMap(paletteColors)
  const canvas = createOffscreenCanvas(width * cellSize, height * cellSize)
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const colorId = pixels[index]

      if (colorId) {
        const color = paletteMap.get(colorId)
        if (color) {
          ctx.fillStyle = color.hex
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      } else {
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
  }

  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  for (let x = 0; x <= width; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cellSize, 0)
    ctx.lineTo(x * cellSize, height * cellSize)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cellSize)
    ctx.lineTo(width * cellSize, y * cellSize)
    ctx.stroke()
  }

  return canvas.toDataURL()
}

export function exportAsImage(pixels, width, height, scale = 10, paletteColors = null) {
  const paletteMap = buildPaletteMap(paletteColors)
  const canvas = createOffscreenCanvas(width * scale, height * scale)
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const colorId = pixels[index]
      if (!colorId) continue

      const color = paletteMap.get(colorId)
      if (!color) continue

      ctx.fillStyle = color.hex
      ctx.beginPath()
      ctx.arc(
        x * scale + scale / 2,
        y * scale + scale / 2,
        scale / 2 - 1,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }

  return canvas.toDataURL('image/png')
}

export function getUsedColors(pixels, paletteColors = null) {
  const paletteMap = buildPaletteMap(paletteColors)
  const colorCounts = new Map()

  for (const colorId of pixels) {
    if (colorId) {
      colorCounts.set(colorId, (colorCounts.get(colorId) || 0) + 1)
    }
  }

  return Array.from(colorCounts.entries())
    .map(([id, count]) => ({
      color: paletteMap.get(id),
      count
    }))
    .filter(item => Boolean(item.color))
    .sort((a, b) => b.count - a.count)
}
