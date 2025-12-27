import React, { useState, useRef, useEffect } from 'react';
import './ImageMarkupTool.css';

/**
 * ImageMarkupTool - Interactive tool for marking up nameplate images
 * Allows users to draw bounding boxes around specific fields (Model, Serial, RLA, etc.)
 * and label them. This markup data is sent to Claude to improve OCR accuracy.
 */
const ImageMarkupTool = ({ image, onMarkupComplete, equipmentType = 'hvac' }) => {
  const canvasRef = useRef(null);
  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef(new Image());

  // Field labels based on equipment type
  const fieldLabels = {
    hvac: [
      'Manufacturer',
      'Model Number',
      'Serial Number',
      'Voltage',
      'Phase',
      'Compressor RLA',
      'Compressor LRA',
      'Fan Motor FLA',
      'MCA',
      'MOCP',
      'Refrigerant',
      'Tonnage/BTU',
      'Gas Input',
      'Other'
    ],
    electrical: [
      'Manufacturer',
      'Model Number',
      'Voltage',
      'Phase',
      'Bus Rating',
      'Main Breaker',
      'Pole Spaces',
      'Other'
    ],
    transformer: [
      'Manufacturer',
      'Model Number',
      'kVA Rating',
      'Primary Voltage',
      'Secondary Voltage',
      'Phase',
      'Serial Number',
      'Other'
    ]
  };

  const labels = fieldLabels[equipmentType] || fieldLabels.hvac;

  // Load and display image on canvas
  useEffect(() => {
    if (image && canvasRef.current) {
      const img = imageRef.current;
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Scale image to fit canvas while maintaining aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        setCanvasSize({ width, height });

        ctx.drawImage(img, 0, 0, width, height);
        setImageLoaded(true);
        redrawBoxes(ctx, width, height);
      };

      img.src = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
    }
  }, [image]);

  // Redraw all boxes on canvas
  const redrawBoxes = (ctx = null, width = canvasSize.width, height = canvasSize.height) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = ctx || canvas.getContext('2d');
    const img = imageRef.current;

    // Clear and redraw image
    context.clearRect(0, 0, width, height);
    if (img.complete) {
      context.drawImage(img, 0, 0, width, height);
    }

    // Draw all boxes
    boxes.forEach((box, index) => {
      context.strokeStyle = '#00ff00';
      context.lineWidth = 2;
      context.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label
      context.fillStyle = 'rgba(0, 255, 0, 0.7)';
      const labelHeight = 20;
      context.fillRect(box.x, box.y - labelHeight, box.width, labelHeight);

      context.fillStyle = '#000';
      context.font = '12px Arial';
      context.fillText(box.label, box.x + 5, box.y - 5);

      // Draw box number
      context.fillStyle = '#fff';
      context.fillText(`#${index + 1}`, box.x + box.width - 20, box.y - 5);
    });

    // Draw current box being drawn
    if (currentBox) {
      context.strokeStyle = '#ffff00';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(
        currentBox.x,
        currentBox.y,
        currentBox.width,
        currentBox.height
      );
      context.setLineDash([]);
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (!selectedLabel) {
      alert('Please select a label first!');
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({ x, y, width: 0, height: 0, label: selectedLabel });
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({
      ...currentBox,
      width: x - currentBox.x,
      height: y - currentBox.y
    });

    redrawBoxes();
  };

  const handleMouseUp = () => {
    if (currentBox && Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
      // Normalize box (handle negative width/height)
      const normalizedBox = {
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
        label: currentBox.label
      };

      setBoxes([...boxes, normalizedBox]);
    }

    setCurrentBox(null);
    setIsDrawing(false);
    redrawBoxes();
  };

  // Redraw when boxes change
  useEffect(() => {
    if (imageLoaded) {
      redrawBoxes();
    }
  }, [boxes, currentBox]);

  const handleRemoveBox = (index) => {
    const newBoxes = boxes.filter((_, i) => i !== index);
    setBoxes(newBoxes);
  };

  const handleClearAll = () => {
    setBoxes([]);
  };

  const handleComplete = () => {
    // Convert pixel coordinates to relative coordinates (0-1 range)
    const relativeBoxes = boxes.map(box => ({
      label: box.label,
      x: box.x / canvasSize.width,
      y: box.y / canvasSize.height,
      width: box.width / canvasSize.width,
      height: box.height / canvasSize.height
    }));

    onMarkupComplete({
      boxes: relativeBoxes,
      imageWidth: canvasSize.width,
      imageHeight: canvasSize.height,
      equipmentType
    });
  };

  return (
    <div className="image-markup-tool">
      <div className="markup-header">
        <h3>Mark Up Nameplate Image</h3>
        <p>Draw boxes around fields to help Claude locate specific information</p>
      </div>

      <div className="markup-controls">
        <div className="label-selector">
          <label>Select Field to Mark:</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
          >
            <option value="">-- Choose a field --</option>
            {labels.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={handleClearAll} disabled={boxes.length === 0}>
            Clear All
          </button>
          <button
            onClick={handleComplete}
            disabled={boxes.length === 0}
            className="primary-button"
          >
            Done - Use These Markups
          </button>
        </div>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: selectedLabel ? 'crosshair' : 'default' }}
        />
      </div>

      {boxes.length > 0 && (
        <div className="boxes-list">
          <h4>Marked Fields ({boxes.length}):</h4>
          <ul>
            {boxes.map((box, index) => (
              <li key={index}>
                <span>#{index + 1}: {box.label}</span>
                <button onClick={() => handleRemoveBox(index)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="markup-instructions">
        <strong>Instructions:</strong>
        <ol>
          <li>Select a field type from the dropdown</li>
          <li>Click and drag on the image to draw a box around that field</li>
          <li>Repeat for all important fields</li>
          <li>Click "Done" to analyze with markup guidance</li>
        </ol>
      </div>
    </div>
  );
};

export default ImageMarkupTool;
