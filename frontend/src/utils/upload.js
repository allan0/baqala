// frontend/src/utils/upload.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const uploadFile = async (file, bucket) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]; // Remove "data:image/..." prefix

      try {
        const response = await fetch(`${API_URL}/api/upload/${bucket}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: `${Date.now()}-${file.name}`,
            fileBase64: base64,
            contentType: file.type || 'image/jpeg'
          })
        });

        const result = await response.json();
        if (result.success) {
          resolve(result.publicUrl);
        } else {
          reject(result.error || 'Upload failed');
        }
      } catch (err) {
        reject(err.message || 'Upload error');
      }
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};
