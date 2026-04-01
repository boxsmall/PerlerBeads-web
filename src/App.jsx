import { useState, useRef, useEffect } from 'react'
import { resizeImageToPattern, exportAsImage, getUsedColors } from './utils/imageProcessor'
import { colorMap, getPaletteColors, paletteBrands } from './data/perlerColors'
import { parsePaletteText, serializePalette } from './utils/paletteIO'
import './App.css'

function App() {
  const [originalImage, setOriginalImage] = useState(null)
  const [pattern, setPattern] = useState(null)
  const [size, setSize] = useState(20)
  const [isCustomSize, setIsCustomSize] = useState(false)
  const [customWidth, setCustomWidth] = useState(20)
  const [customHeight, setCustomHeight] = useState(20)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [selectedPixel, setSelectedPixel] = useState(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 模式选择：pixel-像素模式, edge-轮廓模式
  const [processMode, setProcessMode] = useState('pixel')
  const [paletteBrand, setPaletteBrand] = useState('perler')
  const [maxColors, setMaxColors] = useState(24)
  const [ditherAlgorithm, setDitherAlgorithm] = useState('none')
  const [distanceMethod, setDistanceMethod] = useState('euclidean')
  const [quantizationAlgorithm, setQuantizationAlgorithm] = useState('median-cut')
  const [lowFrequencyThreshold, setLowFrequencyThreshold] = useState(0)
  const [customPaletteColors, setCustomPaletteColors] = useState([])

  // 批量编辑相关状态
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [selectedPixels, setSelectedPixels] = useState([]) // 批量选中的像素

  // 图片拖动相关状态
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 })
  const [imageNaturalSize, setImageNaturalSize] = useState(null)
  const imageContainerRef = useRef(null)
  const paletteFileInputRef = useRef(null)

  // 处理图片上传
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setOriginalImage(event.target.result)
        setPattern(null)
        setError(null)
        // 重置图片位置
        setImagePos({ x: 0, y: 0 })
        setImageScale(1)
        setImageNaturalSize(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // 处理拖拽上传
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setOriginalImage(event.target.result)
        setPattern(null)
        setError(null)
        // 重置图片位置
        setImagePos({ x: 0, y: 0 })
        setImageScale(1)
        setImageNaturalSize(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // 全局鼠标事件处理 - 解决拖动超出容器的问题
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return
      setImagePos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragStart])

  // 同步预览容器尺寸，确保预览和生成使用同一坐标系
  useEffect(() => {
    if (!originalImage || !imageContainerRef.current) return

    const el = imageContainerRef.current
    const updateSize = () => {
      setContainerSize({
        width: el.clientWidth || 400,
        height: el.clientHeight || 400
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(el)

    return () => observer.disconnect()
  }, [originalImage])

  // 图片拖动处理
  const handleImageMouseDown = (e) => {
    if (!originalImage) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePos.x, y: e.clientY - imagePos.y })
  }

  // 滚轮缩放
  const handleImageWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.5, Math.min(3, imageScale + delta))
    setImageScale(newScale)
  }

  // 重置图片位置
  const resetImagePosition = () => {
    setImagePos({ x: 0, y: 0 })
    setImageScale(1)
  }

  // 生成图案
  const handleGenerate = async () => {
    if (!originalImage) return
    if (paletteBrand === 'custom' && customPaletteColors.length === 0) {
      setError('请先导入自定义调色板')
      return
    }

    setIsProcessing(true)
    setError(null)

    // 确定最终尺寸
    const finalWidth = isCustomSize ? customWidth : size
    const finalHeight = isCustomSize ? customHeight : size

    try {
      const result = await resizeImageToPattern(originalImage, finalWidth, finalHeight, {
        x: imagePos.x,
        y: imagePos.y,
        scale: imageScale,
        mode: processMode,
        paletteBrand,
        maxColors,
        ditherAlgorithm,
        distanceMethod,
        quantizationAlgorithm,
        lowFrequencyThreshold,
        customPalette: customPaletteColors,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height
      })
      setPattern(result)
      setHistory([result.pixels])
      setHistoryIndex(0)
    } catch (err) {
      setError('图片处理失败，请重试')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理格子点击
  const handlePixelClick = (index) => {
    if (!pattern) return

    // 如果有批量选择，则清除
    if (selectedPixels.length > 0) {
      setSelectedPixels([])
    }

    setSelectedPixel(index)
    setShowColorPicker(true)
  }

  // 处理框选开始
  const handleSelectionStart = (index) => {
    if (!pattern) return
    setIsSelecting(true)
    setSelectionStart(index)
    setSelectionEnd(index)
  }

  // 处理框选移动
  const handleSelectionMove = (index) => {
    if (!isSelecting || !pattern) return
    setSelectionEnd(index)
  }

  // 处理框选结束
  const handleSelectionEnd = () => {
    if (!isSelecting || !pattern || selectionStart === null || selectionEnd === null) {
      setIsSelecting(false)
      return
    }

    const startX = selectionStart % pattern.width
    const startY = Math.floor(selectionStart / pattern.width)
    const endX = selectionEnd % pattern.width
    const endY = Math.floor(selectionEnd / pattern.width)

    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)

    // 计算选中的像素范围
    const selected = []
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        selected.push(y * pattern.width + x)
      }
    }

    setSelectedPixels(selected)
    setIsSelecting(false)

    // 如果选中了多个像素，显示颜色选择器
    if (selected.length > 1) {
      setShowColorPicker(true)
    }
  }

  // 清除选择
  const clearSelection = () => {
    setSelectedPixels([])
    setSelectionStart(null)
    setSelectionEnd(null)
    setIsSelecting(false)
  }

  // 判断像素是否在选择范围内
  const isInRange = (index) => {
    if (selectionStart === null || selectionEnd === null || !pattern) return false
    const startX = selectionStart % pattern.width
    const startY = Math.floor(selectionStart / pattern.width)
    const endX = selectionEnd % pattern.width
    const endY = Math.floor(selectionEnd / pattern.width)

    const pixelX = index % pattern.width
    const pixelY = Math.floor(index / pattern.width)

    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)
    const minY = Math.min(startY, endY)
    const maxY = Math.max(startY, endY)

    return pixelX >= minX && pixelX <= maxX && pixelY >= minY && pixelY <= maxY
  }

  // 修改颜色（支持单点和批量）
  const handleColorChange = (colorId) => {
    if (!pattern) return

    const newPixels = [...pattern.pixels]

    // 如果有批量选中，先清除批量选择并修改批量像素
    if (selectedPixels.length > 0) {
      for (const idx of selectedPixels) {
        newPixels[idx] = colorId
      }
      setSelectedPixels([])
    } else if (selectedPixel !== null) {
      // 单个像素修改
      newPixels[selectedPixel] = colorId
      setSelectedPixel(null)
    } else {
      return
    }

    const newPattern = { ...pattern, pixels: newPixels }
    setPattern(newPattern)

    // 添加到历史记录
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newPixels)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    setShowColorPicker(false)
  }

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPattern({ ...pattern, pixels: [...history[historyIndex - 1]] })
    }
  }

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPattern({ ...pattern, pixels: [...history[historyIndex + 1]] })
    }
  }

  // 导出PNG
  const handleExportPNG = () => {
    if (!pattern) return

    const dataUrl = exportAsImage(pattern.pixels, pattern.width, pattern.height, 15, pattern.paletteColors)
    const link = document.createElement('a')
    link.download = `perler-pattern-${pattern.width}x${pattern.height}.png`
    link.href = dataUrl
    link.click()
  }

  // 导出PDF
  const handleExportPDF = async () => {
    if (!pattern) return

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    // 标题
    doc.setFontSize(20)
    doc.text('拼豆图案', 105, 20, { align: 'center' })

    // 尺寸信息
    doc.setFontSize(12)
    doc.text(`尺寸: ${pattern.width} x ${pattern.height}`, 105, 30, { align: 'center' })

    // 绘制图案（同时限制宽高，避免非正方形图案溢出页面）
    const startX = 15
    const startY = 40
    const maxPatternWidth = 180
    const maxPatternHeight = 180
    const cellSize = Math.min(maxPatternWidth / pattern.width, maxPatternHeight / pattern.height)
    const colors = getUsedColors(pattern.pixels, pattern.paletteColors)

    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const index = y * pattern.width + x
        const colorId = pattern.pixels[index]

        if (colorId) {
          const color = patternPaletteMap.get(colorId)
          if (color) {
            doc.setFillColor(color.hex)
            doc.setDrawColor(200, 200, 200)
            doc.rect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize, 'FD')
          }
        }
      }
    }

    // 颜色图例
    const pageHeight = doc.internal.pageSize.getHeight()
    const legendCols = 3
    const rowHeight = 10
    const colWidth = 60
    const legendStartX = 15
    let legendStartY = startY + pattern.height * cellSize + 15

    const drawLegendTitle = (y) => {
      doc.setFontSize(12)
      doc.text('颜色图例:', legendStartX, y)
    }

    if (legendStartY > pageHeight - 20) {
      doc.addPage()
      legendStartY = 20
    }
    drawLegendTitle(legendStartY)
    legendStartY += 8

    const getPageCapacity = (startY) => {
      const rows = Math.floor((pageHeight - startY - 15) / rowHeight)
      return Math.max(legendCols, rows * legendCols)
    }

    let itemsOnPage = 0
    let pageCapacity = getPageCapacity(legendStartY)

    colors.forEach((item) => {
      if (itemsOnPage >= pageCapacity) {
        doc.addPage()
        legendStartY = 20
        drawLegendTitle(legendStartY)
        legendStartY += 8
        itemsOnPage = 0
        pageCapacity = getPageCapacity(legendStartY)
      }

      const row = Math.floor(itemsOnPage / legendCols)
      const col = itemsOnPage % legendCols
      const xPos = legendStartX + col * colWidth
      const yPos = legendStartY + row * rowHeight

      doc.setFillColor(item.color.hex)
      doc.rect(xPos, yPos, 8, 8, 'F')
      doc.setFontSize(8)
      doc.text(`${item.color.name} (${item.count})`, xPos + 11, yPos + 6)
      itemsOnPage += 1
    })

    doc.save(`perler-pattern-${pattern.width}x${pattern.height}.pdf`)
  }

  // 返回重新选择图片
  const handleBack = () => {
    setPattern(null)
    setOriginalImage(null)
    setHistory([])
    setHistoryIndex(-1)
    setImageNaturalSize(null)
    setImagePos({ x: 0, y: 0 })
    setImageScale(1)
  }

  const handleImportPalette = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = String(event.target?.result || '')
      const parsed = parsePaletteText(text)
      if (parsed.length === 0) {
        setError('调色板格式无效，请使用 #HEX,名称 的每行格式')
        return
      }
      setCustomPaletteColors(parsed)
      setPaletteBrand('custom')
      setError(null)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const handleExportPalette = () => {
    const source = (paletteBrand === 'custom' && customPaletteColors.length > 0)
      ? customPaletteColors
      : getPaletteColors(paletteBrand)
    if (!source.length) return

    const content = serializePalette(source)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `palette-${paletteBrand}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const fitScale = imageNaturalSize
    ? Math.min(
      containerSize.width / imageNaturalSize.width,
      containerSize.height / imageNaturalSize.height
    )
    : 1
  const basePreviewWidth = imageNaturalSize ? imageNaturalSize.width * fitScale : containerSize.width
  const basePreviewHeight = imageNaturalSize ? imageNaturalSize.height * fitScale : containerSize.height
  const activePaletteColors = (paletteBrand === 'custom' && customPaletteColors.length > 0)
    ? customPaletteColors
    : getPaletteColors(paletteBrand)
  const patternPaletteMap = new Map([
    ...colorMap.entries(),
    ...((pattern?.paletteColors || []).map(c => [c.id, c]))
  ])

  return (
    <div className="app">
      <header className="header">
        <h1>拼豆图生成器</h1>
      </header>

      <main className="main">
        {!pattern ? (
          // 上传和配置界面
          <div className="upload-section">
            <div
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                id="image-upload"
                hidden
              />
              {originalImage ? (
                <div
                  className="image-preview-container"
                  ref={imageContainerRef}
                  onMouseDown={handleImageMouseDown}
                  onWheel={handleImageWheel}
                >
                  <img
                    src={originalImage}
                    alt="预览"
                    className="preview-image"
                    onLoad={(e) => {
                      setImageNaturalSize({
                        width: e.currentTarget.naturalWidth,
                        height: e.currentTarget.naturalHeight
                      })
                    }}
                    style={{
                      left: `calc(50% + ${imagePos.x}px)`,
                      top: `calc(50% + ${imagePos.y}px)`,
                      width: `${basePreviewWidth * imageScale}px`,
                      height: `${basePreviewHeight * imageScale}px`,
                      transform: 'translate(-50%, -50%)',
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    draggable={false}
                  />
                  <div className="image-hint">
                    拖动移动 / 滚轮缩放
                  </div>
                  <button className="reset-position-btn" onClick={resetImagePosition}>
                    重置
                  </button>
                </div>
              ) : (
                <label htmlFor="image-upload" className="upload-label">
                  <div className="upload-placeholder">
                    <span className="upload-icon">+</span>
                    <span>点击或拖拽上传图片</span>
                  </div>
                </label>
              )}
            </div>

            <div className="controls">
              <div className="size-control">
                <label>图案尺寸：</label>
                <select
                  value={isCustomSize ? 'custom' : size}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomSize(true)
                    } else {
                      setIsCustomSize(false)
                      setSize(Number(e.target.value))
                    }
                  }}
                >
                  <option value={11}>11 x 11 (入门)</option>
                  <option value={20}>20 x 20 (标准)</option>
                  <option value={29}>29 x 29 (适中)</option>
                  <option value={33}>33 x 33 (较大)</option>
                  <option value={40}>40 x 40 (大型)</option>
                  <option value={50}>50 x 50 (最大)</option>
                  <option value="custom">自定义尺寸</option>
                </select>
              </div>

              {isCustomSize && (
                <div className="custom-size-control">
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={customWidth}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') return
                      const num = Number(val)
                      if (!isNaN(num)) {
                        setCustomWidth(Math.max(5, Math.min(50, num)))
                      }
                    }}
                    placeholder="宽"
                  />
                  <span>x</span>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={customHeight}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') return
                      const num = Number(val)
                      if (!isNaN(num)) {
                        setCustomHeight(Math.max(5, Math.min(50, num)))
                      }
                    }}
                    placeholder="高"
                  />
                </div>
              )}

              <div className="mode-control">
                <label>处理模式：</label>
                <select value={processMode} onChange={(e) => setProcessMode(e.target.value)}>
                  <option value="pixel">像素模式（清晰）</option>
                  <option value="edge">轮廓模式（简化）</option>
                </select>
              </div>

              <div className="mode-control">
                <label>调色板品牌：</label>
                <select value={paletteBrand} onChange={(e) => setPaletteBrand(e.target.value)}>
                  {paletteBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="mode-control">
                <label>调色板文件：</label>
                <div className="palette-actions">
                  <button type="button" onClick={() => paletteFileInputRef.current?.click()}>
                    导入 txt/csv
                  </button>
                  <button type="button" onClick={handleExportPalette}>
                    导出当前调色板
                  </button>
                </div>
                <input
                  ref={paletteFileInputRef}
                  type="file"
                  accept=".txt,.csv,text/plain"
                  hidden
                  onChange={handleImportPalette}
                />
              </div>

              <div className="mode-control">
                <label>颜色数量：</label>
                <input
                  type="number"
                  min="2"
                  max="64"
                  value={maxColors}
                  onChange={(e) => setMaxColors(Math.max(2, Math.min(64, Number(e.target.value) || 2)))}
                />
              </div>

              <div className="mode-control">
                <label>量化算法：</label>
                <select value={quantizationAlgorithm} onChange={(e) => setQuantizationAlgorithm(e.target.value)}>
                  <option value="none">无</option>
                  <option value="median-cut">Median Cut</option>
                  <option value="kmeans">K-Means</option>
                </select>
              </div>

              <div className="mode-control">
                <label>抖动算法：</label>
                <select value={ditherAlgorithm} onChange={(e) => setDitherAlgorithm(e.target.value)}>
                  <option value="none">无</option>
                  <option value="floyd-steinberg">Floyd-Steinberg</option>
                  <option value="atkinson">Atkinson</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>

              <div className="mode-control">
                <label>颜色差异：</label>
                <select value={distanceMethod} onChange={(e) => setDistanceMethod(e.target.value)}>
                  <option value="euclidean">Euclidean</option>
                  <option value="manhattan">Manhattan</option>
                  <option value="weighted">Weighted RGB</option>
                </select>
              </div>

              <div className="mode-control">
                <label>低频色替换阈值（%）：</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={lowFrequencyThreshold}
                  onChange={(e) => setLowFrequencyThreshold(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={!originalImage || isProcessing}
              >
                {isProcessing ? '处理中...' : '生成图案'}
              </button>
            </div>
          </div>
        ) : (
          // 编辑界面
          <div className="editor-section">
            <div className="editor-header">
              <span className="pattern-size">{pattern.width} x {pattern.height}</span>
              <div className="editor-actions">
                <button onClick={handleUndo} disabled={historyIndex <= 0}>撤销</button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}>重做</button>
                <button onClick={clearSelection} disabled={selectedPixels.length === 0}>清除选择</button>
                <button onClick={handleBack}>重新选择图片</button>
              </div>
            </div>

            <div className="editor-content">
              <div className="canvas-wrapper">
                <div
                  className="pattern-canvas"
                  style={{
                    gridTemplateColumns: `repeat(${pattern.width}, 1fr)`
                  }}
                  onMouseDown={(e) => {
                    // 如果按住 Shift，则是单点选择；否则是框选开始
                    if (e.shiftKey) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = Math.floor((e.clientX - rect.left) / (rect.width / pattern.width))
                      const y = Math.floor((e.clientY - rect.top) / (rect.height / pattern.height))
                      const index = y * pattern.width + x
                      handlePixelClick(index)
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = Math.floor((e.clientX - rect.left) / (rect.width / pattern.width))
                      const y = Math.floor((e.clientY - rect.top) / (rect.height / pattern.height))
                      const index = y * pattern.width + x
                      handleSelectionStart(index)
                    }
                  }}
                  onMouseMove={(e) => {
                    if (!isSelecting) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = Math.floor((e.clientX - rect.left) / (rect.width / pattern.width))
                    const y = Math.floor((e.clientY - rect.top) / (rect.height / pattern.height))
                    // 限制在画布范围内
                    const clampedX = Math.max(0, Math.min(pattern.width - 1, x))
                    const clampedY = Math.max(0, Math.min(pattern.height - 1, y))
                    const index = clampedY * pattern.width + clampedX
                    handleSelectionMove(index)
                  }}
                  onMouseUp={handleSelectionEnd}
                  onMouseLeave={handleSelectionEnd}
                >
                  {pattern.pixels.map((colorId, index) => {
                    const color = colorId ? patternPaletteMap.get(colorId) : null
                    const isSelected = selectedPixel === index || selectedPixels.includes(index)
                    const isInSelectionRange = isSelecting && selectionStart !== null && selectionEnd !== null && isInRange(index)
                    return (
                      <div
                        key={index}
                        className={`pixel ${isSelected ? 'selected' : ''} ${isInSelectionRange ? 'selecting' : ''}`}
                        style={{
                          backgroundColor: color?.hex || '#f0f0f0'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="color-legend">
                <h3>使用的颜色</h3>
                <div className="color-list">
                  {getUsedColors(pattern.pixels, pattern.paletteColors).map((item) => (
                    <div key={item.color.id} className="color-item">
                      <div
                        className="color-swatch"
                        style={{ backgroundColor: item.color.hex }}
                      />
                      <span>{item.color.name} x {item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="export-buttons">
              <button className="export-btn" onClick={handleExportPNG}>
                导出 PNG
              </button>
              <button className="export-btn" onClick={handleExportPDF}>
                导出 PDF
              </button>
            </div>

            {/* 颜色选择器弹窗 */}
            {showColorPicker && (
              <div className="color-picker-overlay" onClick={() => setShowColorPicker(false)}>
                <div className="color-picker" onClick={(e) => e.stopPropagation()}>
                  <h3>选择颜色</h3>
                  <div className="color-grid">
                    {(pattern?.paletteColors || activePaletteColors).map((color) => (
                      <button
                        key={color.id}
                        className="color-option"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => handleColorChange(color.id)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
