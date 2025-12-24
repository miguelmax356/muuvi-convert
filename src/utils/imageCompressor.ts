export const compressImage = async (
  file: File,
  targetSizeKB: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDimension = 2000;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const targetSizeBytes = targetSizeKB * 1024;
        let quality = 0.9;
        let blob: Blob | null = null;

        const tryCompress = (currentQuality: number) => {
          canvas.toBlob(
            (result) => {
              if (!result) {
                reject(new Error('Failed to compress image'));
                return;
              }

              blob = result;

              if (blob.size <= targetSizeBytes || currentQuality <= 0.1) {
                resolve(blob);
              } else {
                const ratio = targetSizeBytes / blob.size;
                let newQuality = currentQuality * ratio * 0.9;
                newQuality = Math.max(0.1, Math.min(newQuality, currentQuality - 0.05));

                tryCompress(newQuality);
              }
            },
            'image/jpeg',
            currentQuality
          );
        };

        tryCompress(quality);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
