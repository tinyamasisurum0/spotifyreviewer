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
 * Preprocess image to improve OCR accuracy
 * For AOTY-style images, crops to the right column where text is located
 */
export function preprocessImage(file: File, focusOnRightColumn: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        // If focusing on right column, crop to right 30-40% of image
        // This is where text typically appears in AOTY-style grid images
        if (focusOnRightColumn) {
          sourceX = Math.floor(img.width * 0.65); // Start at 65% from left
          sourceWidth = Math.floor(img.width * 0.35); // Take right 35%
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
