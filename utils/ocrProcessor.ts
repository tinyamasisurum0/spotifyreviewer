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
 * Album covers are colorful (high saturation), text area is mostly grayscale (low saturation)
 */
function detectTextColumnStart(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const sampleHeight = Math.min(height, 500);
  const stripWidth = 10;
  const colorfulness: number[] = [];

  // Calculate "colorfulness" for each vertical strip
  // Album covers have high color saturation, text on black bg has low saturation
  for (let x = 0; x < width; x += stripWidth) {
    const imageData = ctx.getImageData(x, 0, stripWidth, sampleHeight);
    const data = imageData.data;

    let totalSaturation = 0;
    let coloredPixels = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate saturation (difference from grayscale)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Also check if pixel is "colorful" (not too dark, not grayscale)
      const brightness = (r + g + b) / 3;
      if (brightness > 30 && saturation > 0.1) {
        coloredPixels++;
        totalSaturation += saturation;
      }
    }

    // Colorfulness score = percentage of colored pixels * average saturation
    const colorScore = (coloredPixels / pixelCount) * (totalSaturation / Math.max(coloredPixels, 1));
    colorfulness.push(colorScore);
  }

  // Find where colorful album area ends (scanning left to right)
  // Look for sustained drop in colorfulness
  const maxColor = Math.max(...colorfulness);
  const threshold = maxColor * 0.08; // Text area should have very low color

  let lastColorfulStrip = 0;
  for (let i = 0; i < colorfulness.length; i++) {
    if (colorfulness[i] > threshold) {
      lastColorfulStrip = i;
    }
  }

  // Text starts after last colorful strip, with padding
  let textStartX = (lastColorfulStrip + 1) * stripWidth;

  // Sanity check: text area should be between 50% and 75% from left typically
  // If detection seems off, use a safe default
  const minTextStart = width * 0.45;
  const maxTextStart = width * 0.70;

  if (textStartX < minTextStart || textStartX > maxTextStart) {
    console.log('Detection outside expected range, using fallback. Detected:', textStartX);
    textStartX = width * 0.58; // Safe default for AOTY-style layouts
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
