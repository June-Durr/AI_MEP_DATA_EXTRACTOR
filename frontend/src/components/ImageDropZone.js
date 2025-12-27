import React, { useState } from 'react';

const ImageDropZone = ({ onImagesAdded, existingImages = [], onImageDelete }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    } else {
      console.warn('No valid image files detected in drop');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 1024px on longest side)
          const maxDimension = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with 70% quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFiles = (files) => {
    const compressionPromises = files.map(file => compressImage(file));

    Promise.all(compressionPromises).then(images => {
      onImagesAdded(images);
    });
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '3px dashed #28a745' : '2px dashed #ddd',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#e8f5e9' : '#f8f9fa',
          cursor: 'pointer',
          transition: 'all 0.3s',
          marginBottom: '15px',
        }}
        onClick={() => document.getElementById('file-input-dropzone').click()}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
          📁
        </div>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
          {isDragging ? 'Drop images here' : 'Drag & Drop Images'}
        </h3>
        <p style={{ margin: '0', color: '#666' }}>
          or click to browse your computer
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#999' }}>
          Supports: JPG, PNG, HEIC, WEBP
        </p>
      </div>

      <input
        id="file-input-dropzone"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {existingImages.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ margin: '0', fontWeight: '500' }}>
              {existingImages.length} image{existingImages.length !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById('file-input-dropzone').click();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              + Add More Images
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {existingImages.map((image, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  paddingBottom: '100%',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    backgroundColor: index === 0 ? 'rgba(33, 150, 243, 0.9)' : 'rgba(76, 175, 80, 0.9)',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {index === 0 ? '📋 Nameplate' : '⚡ Fuse Label'}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </div>
                {onImageDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageDelete(index);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      backgroundColor: 'rgba(220, 53, 69, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(200, 35, 51, 1)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Delete image"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDropZone;
