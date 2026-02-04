// Compress image to be under target size (100KB default)
export async function compressImage(file: File, maxSizeKB = 100): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
  
      img.onload = () => {
        // Start with original dimensions
        let width = img.width
        let height = img.height
  
        // Max dimension for avatars (keeps quality reasonable while reducing size)
        const maxDimension = 512
  
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }
  
        canvas.width = width
        canvas.height = height
  
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
  
        ctx.drawImage(img, 0, 0, width, height)
  
        // Try to compress to target size with decreasing quality
        const tryCompress = (quality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
  
              // If under target size or quality is too low, use this result
              if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                // Try again with lower quality
                tryCompress(quality - 0.1)
              }
            },
            'image/jpeg',
            quality
          )
        }
  
        tryCompress(0.9)
      }
  
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load image'))
      }
  
      img.src = URL.createObjectURL(file)
    })
  }
  