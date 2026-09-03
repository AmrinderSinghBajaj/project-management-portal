import { API_BASE, SERVER_BASE } from '../config';

/**
 * Checks if a given file or mime type is a video
 */
export function isVideoFile(file) {
  if (!file) return false;
  const type = file.type || '';
  if (type.startsWith('video/')) return true;
  const name = file.name || '';
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v', '.3gp', '.mpg', '.mpeg'];
  return videoExtensions.some(ext => name.toLowerCase().endsWith(ext));
}

/**
 * Checks if a given file is an image
 */
export function isImageFile(file) {
  if (!file) return false;
  const type = file.type || '';
  if (type.startsWith('image/')) return true;
  const name = file.name || '';
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif', '.ico'];
  return imageExtensions.some(ext => name.toLowerCase().endsWith(ext));
}

/**
 * Formats bytes to human-readable size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Compresses an image client-side if it exceeds 2MB, reducing it down to <= 1MB
 */
export async function compressImageFile(file, maxTargetBytes = 1024 * 1024) {
  // If file is SVG or GIF (animated), do not canvas-compress to preserve vector/animation
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // If already under 2MB, return as-is
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Progressively compress quality until target size is reached
        let quality = 0.82;
        const tryExport = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // fallback to original
                return;
              }
              if (blob.size > maxTargetBytes && q > 0.4) {
                tryExport(q - 0.15);
              } else {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            q
          );
        };

        tryExport(quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Uploads an array of image files to the server
 */
export async function uploadImagesToServer(files) {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const res = await fetch(`${API_BASE}/upload-images`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload images');
  }

  const data = await res.json();
  return data.images || [];
}

/**
 * Resolves full URL for an image path
 */
export function getFullImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SERVER_BASE}${path}`;
}
