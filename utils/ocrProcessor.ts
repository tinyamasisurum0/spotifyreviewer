import Tesseract from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Process an image file and extract text using Tesseract OCR
 */
export async function processImageWithOCR(
  imageFile: File | string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: m.progress || 0,
          });
        }
      },
    });

    const result = await worker.recognize(imageFile);
    await worker.terminate();

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error('Failed to extract text from image. Please try a clearer image.');
  }
}

/**
 * Detect where text column starts by analyzing color saturation and variance
 * Samples multiple vertical sections of the image for accuracy
 */
function detectTextColumnStart(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const stripWidth = 10;

  // Sample multiple horizontal bands across the full image height
  const numBands = 5;
  const bandHeight = Math.floor(height / numBands);
  const allColorfulness: number[][] = [];

  for (let band = 0; band < numBands; band++) {
    const bandY = band * bandHeight;
    const colorfulness: number[] = [];

    for (let x = 0; x < width; x += stripWidth) {
      const imageData = ctx.getImageData(x, bandY, stripWidth, bandHeight);
      const data = imageData.data;

      let totalSaturation = 0;
      let coloredPixels = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const brightness = (r + g + b) / 3;

        if (brightness > 30 && saturation > 0.1) {
          coloredPixels++;
          totalSaturation += saturation;
        }
      }

      const colorScore = (coloredPixels / pixelCount) * (totalSaturation / Math.max(coloredPixels, 1));
      colorfulness.push(colorScore);
    }
    allColorfulness.push(colorfulness);
  }

  // Average colorfulness across all bands
  const avgColorfulness: number[] = [];
  for (let i = 0; i < allColorfulness[0].length; i++) {
    let sum = 0;
    for (let band = 0; band < numBands; band++) {
      sum += allColorfulness[band][i];
    }
    avgColorfulness.push(sum / numBands);
  }

  // Find where colorful album area ends
  const maxColor = Math.max(...avgColorfulness);
  const threshold = maxColor * 0.08;

  let lastColorfulStrip = 0;
  for (let i = 0; i < avgColorfulness.length; i++) {
    if (avgColorfulness[i] > threshold) {
      lastColorfulStrip = i;
    }
  }

  let textStartX = (lastColorfulStrip + 1) * stripWidth;

  // Sanity check
  const minTextStart = width * 0.40;
  const maxTextStart = width * 0.75;

  if (textStartX < minTextStart || textStartX > maxTextStart) {
    console.log('Detection outside expected range, using fallback. Detected:', textStartX);
    textStartX = width * 0.55;
  }

  console.log('Text column start at:', textStartX, 'px (', Math.round(textStartX / width * 100), '% from left)');

  return textStartX;
}

/**
 * Preprocess image to improve OCR accuracy
 * For AOTY-style images, automatically detects and crops to the text column
 */
export function preprocessImage(file: File, focusOnRightColumn: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // First, draw full image to analyze it
        const analysisCanvas = document.createElement('canvas');
        const analysisCtx = analysisCanvas.getContext('2d');

        if (!analysisCtx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        analysisCanvas.width = img.width;
        analysisCanvas.height = img.height;
        analysisCtx.drawImage(img, 0, 0);

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        // Dynamically detect where text column starts
        if (focusOnRightColumn) {
          sourceX = detectTextColumnStart(analysisCtx, img.width, img.height);
          sourceWidth = img.width - sourceX;
        }

        console.log('Image processing:', {
          originalSize: `${img.width}x${img.height}`,
          cropArea: `x:${sourceX}, y:${sourceY}, w:${sourceWidth}, h:${sourceHeight}`,
          focusOnRightColumn
        });

        // Create final canvas for OCR
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set canvas size to cropped area
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        // Draw the cropped portion
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        );

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

          // Increase contrast more aggressively for better text recognition
          const contrast = 2.0;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const adjusted = factor * (avg - 128) + 128;
          const clamped = Math.max(0, Math.min(255, adjusted));

          data[i] = clamped;
          data[i + 1] = clamped;
          data[i + 2] = clamped;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Handle image paste from clipboard
 */
export async function handleImagePaste(
  event: ClipboardEvent
): Promise<File | null> {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        return new File([blob], 'pasted-image.png', { type: blob.type });
      }
    }
  }

  return null;
}
