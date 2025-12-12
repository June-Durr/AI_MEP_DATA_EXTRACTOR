import React, { useState } from 'react';

const ImageDropZone = ({ onImagesAdded, existingImages = [] }) => {
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
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
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
          <p style={{ marginBottom: '10px', fontWeight: '500' }}>
            {existingImages.length} image{existingImages.length !== 1 ? 's' : ''} selected
          </p>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDropZone;
