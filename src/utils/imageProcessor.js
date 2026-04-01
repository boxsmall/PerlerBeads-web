import { colorMap, findClosestColor } from '../data/perlerColors'

/**
 * 图像处理工具 - 将图片转换为拼豆图案
 */

// 创建隐藏的Canvas用于图像处理
function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * 将图像数据调整为指定尺寸
 * @param {string} imageUrl - 图片URL
 * @param {number} targetWidth - 目标宽度（珠子数量）
 * @param {number} targetHeight - 目标高度（珠子数量）
 * @param {Object} transform - 图片变换参数 { x, y, scale, mode, containerWidth, containerHeight }
 * @param {string} transform.mode - 处理模式: 'pixel'像素模式, 'edge'轮廓模式
 * @returns {Promise<{pixels: Array, width: number, height: number}>}
 */
export async function resizeImageToPattern(imageUrl, targetWidth, targetHeight, transform = {}) {
  const { x = 0, y = 0, scale = 1, mode = 'pixel', containerWidth = 400, containerHeight = 400 } = transform

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = createOffscreenCanvas(targetWidth, targetHeight)
      const ctx = canvas.getContext('2d')

      // 使用高质量插值绘制
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 原始图片尺寸
      const origWidth = img.width
      const origHeight = img.height

      // 与预览一致：先 contain 适配，再围绕容器中心进行缩放和偏移
      const fitScale = Math.min(containerWidth / origWidth, containerHeight / origHeight)
      const baseWidth = origWidth * fitScale
      const baseHeight = origHeight * fitScale
      const previewWidth = baseWidth * scale
      const previewHeight = baseHeight * scale

      // 预览中的图像左上角
      const actualX = containerWidth / 2 + x - previewWidth / 2
      const actualY = containerHeight / 2 + y - previewHeight / 2

      // 将预览区域的位置转换为目标画布的比例
      const ratioX = targetWidth / containerWidth
      const ratioY = targetHeight / containerHeight

      // 计算在目标画布上的绘制参数
      const drawWidth = previewWidth * ratioX
      const drawHeight = previewHeight * ratioY
      const drawX = actualX * ratioX
      const drawY = actualY * ratioY

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
      let pixels = []

      if (mode === 'edge') {
        // 轮廓模式：使用边缘检测简化
        pixels = processEdgeMode(imageData, targetWidth, targetHeight)
      } else {
        // 像素模式：直接映射颜色
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i]
          const g = imageData.data[i + 1]
          const b = imageData.data[i + 2]
          const a = imageData.data[i + 3]

          // 跳过透明像素
          if (a < 128) {
            pixels.push(null)
          } else {
            // 转换为hex并找到最接近的Perler颜色
            const hex = rgbToHex(r, g, b)
            const closestColor = findClosestColor(hex)
            pixels.push(closestColor.id)
          }
        }
      }

      resolve({
        pixels,
        width: targetWidth,
        height: targetHeight
      })
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = imageUrl
  })
}

/**
 * 轮廓模式处理：使用边缘检测和颜色简化
 */
function processEdgeMode(imageData, width, height) {
  const data = imageData.data
  const pixels = []

  // 首先转换为灰度并进行边缘检测
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }

  // Sobel 边缘检测
  const edges = new Uint8Array(width * height)

  // 初始化边界为 0（非边缘）
  edges.fill(0)

  // 计算内部像素的边缘值
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x

      // Sobel kernels
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)]

      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)]

      edges[idx] = Math.min(255, Math.sqrt(gx * gx + gy * gy))
    }
  }

  // 根据边缘和颜色创建图案
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a < 128) {
      pixels.push(null)
      continue
    }

    // 判断是否为边缘
    const isEdge = edges[idx] > 50

    if (isEdge) {
      // 边缘用深色表示
      const hex = rgbToHex(
        Math.max(0, r - 50),
        Math.max(0, g - 50),
        Math.max(0, b - 50)
      )
      const closestColor = findClosestColor(hex)
      pixels.push(closestColor.id)
    } else {
      // 非边缘区域使用较少的颜色（简化）
      // 将颜色映射到较少的几种基础色
      const simplifiedColor = simplifyColor(r, g, b)
      pixels.push(simplifiedColor.id)
    }
  }

  return pixels
}

/**
 * 简化颜色：将任意颜色映射到较少的基础色
 */
function simplifyColor(r, g, b) {
  // 基础色板（减少后的颜色数量）
  const basicColors = [
    { id: 'white', r: 255, g: 255, b: 255 },
    { id: 'black', r: 0, g: 0, b: 0 },
    { id: 'red', r: 230, g: 0, b: 18 },
    { id: 'blue', r: 30, g: 144, b: 255 },
    { id: 'green', r: 34, g: 139, b: 34 },
    { id: 'yellow', r: 255, g: 215, b: 0 },
    { id: 'orange', r: 255, g: 140, b: 0 },
    { id: 'purple', r: 128, g: 0, b: 128 },
    { id: 'pink', r: 255, g: 105, b: 180 },
    { id: 'brown', r: 139, g: 69, b: 19 },
    { id: 'gray', r: 128, g: 128, b: 128 },
    { id: 'light-blue', r: 173, g: 216, b: 230 },
  ]

  let minDistance = Infinity
  let closest = basicColors[0]

  for (const color of basicColors) {
    const distance = Math.sqrt(
      Math.pow(r - color.r, 2) +
      Math.pow(g - color.g, 2) +
      Math.pow(b - color.b, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
      closest = color
    }
  }

  return { id: closest.id }
}

/**
 * 将RGBA转换为HEX
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * 使用中位切分算法进行颜色量化
 * @param {string} imageUrl - 图片URL
 * @param {number} maxColors - 最大颜色数量
 * @returns {Promise<{palette: Array, pixels: Array}>}
 */
export async function quantizeImage(imageUrl, maxColors = 16) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = createOffscreenCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const pixels = []

      // 收集所有不透明像素
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        const a = imageData.data[i + 3]

        if (a >= 128) {
          pixels.push([r, g, b])
        }
      }

      // 中位切分算法
      const palette = medianCut(pixels, maxColors)

      // 将每个像素映射到调色板中最接近的颜色
      const quantizedPixels = []
      for (const pixel of pixels) {
        const closest = findClosestInPalette(pixel, palette)
        quantizedPixels.push(closest)
      }

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

/**
 * 中位切分颜色量化算法
 */
function medianCut(pixels, maxColors) {
  if (pixels.length === 0) return []

  let buckets = [pixels]

  while (buckets.length < maxColors) {
    // 找到范围最大的bucket
    let maxRange = -1
    let maxIndex = 0
    let maxChannel = 0

    buckets.forEach((bucket, index) => {
      if (bucket.length === 0) return

      // 计算每个通道的范围
      const ranges = [0, 1, 2].map(channel => {
        const values = bucket.map(p => p[channel])
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

    // 按最大范围通道排序并分割
    const bucket = buckets[maxIndex]
    bucket.sort((a, b) => a[maxChannel] - b[maxChannel])

    const mid = Math.floor(bucket.length / 2)
    buckets.splice(maxIndex, 1, bucket.slice(0, mid), bucket.slice(mid))
  }

  // 计算每个bucket的平均颜色
  return buckets
    .filter(b => b.length > 0)
    .map(bucket => {
      const sum = bucket.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
      return {
        r: Math.round(sum[0] / bucket.length),
        g: Math.round(sum[1] / bucket.length),
        b: Math.round(sum[2] / bucket.length)
      }
    })
}

/**
 * 从调色板中找到最接近的颜色
 */
function findClosestInPalette(pixel, palette) {
  let minDistance = Infinity
  let closest = palette[0]

  for (const color of palette) {
    const distance = Math.sqrt(
      Math.pow(pixel[0] - color.r, 2) +
      Math.pow(pixel[1] - color.g, 2) +
      Math.pow(pixel[2] - color.b, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closest = color
    }
  }

  // 将RGB转换为Perler颜色ID
  const hex = rgbToHex(closest.r, closest.g, closest.b)
  return findClosestColor(hex).id
}

/**
 * 创建用于显示的Canvas数据
 * @param {Array} pixels - 像素颜色ID数组
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} cellSize - 每个格子的显示大小
 * @returns {string} Canvas的dataURL
 */
export function renderPatternToCanvas(pixels, width, height, cellSize = 20) {
  const canvas = createOffscreenCanvas(width * cellSize, height * cellSize)
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const colorId = pixels[index]

      if (colorId) {
        const color = colorMap.get(colorId)
        if (color) {
          ctx.fillStyle = color.hex
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      } else {
        // 透明格子
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
  }

  // 绘制格子边框
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

/**
 * 导出为高分辨率图片
 */
export function exportAsImage(pixels, width, height, scale = 10) {
  const canvas = createOffscreenCanvas(width * scale, height * scale)
  const ctx = canvas.getContext('2d')

  // 绘制圆形珠子
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const colorId = pixels[index]

      if (colorId) {
        const color = colorMap.get(colorId)
        if (color) {
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
    }
  }

  return canvas.toDataURL('image/png')
}

/**
 * 获取使用的颜色统计
 */
export function getUsedColors(pixels) {
  const colorCounts = new Map()

  for (const colorId of pixels) {
    if (colorId) {
      colorCounts.set(colorId, (colorCounts.get(colorId) || 0) + 1)
    }
  }

  return Array.from(colorCounts.entries())
    .map(([id, count]) => ({
      color: colorMap.get(id),
      count
    }))
    .sort((a, b) => b.count - a.count)
}
