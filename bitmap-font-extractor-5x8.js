// 5x8 Bitmap Font Extractor
// This script loads a PNG image containing a 5x8 pixel font bitmap
// and extracts each character as an array of 8-bit bytes

document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png';
  document.body.appendChild(fileInput);
  
  const outputDiv = document.createElement('div');
  document.body.appendChild(outputDiv);

  // Create a button to trigger the extraction
  const extractButton = document.createElement('button');
  extractButton.textContent = 'Extract Font';
  document.body.appendChild(extractButton);

  // Set up canvas (will be hidden)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Configuration options adjusted for a 5x8 font
  const config = {
    charsPerRow: 16,          // Number of characters per row in the image
    charRows: 16,             // Number of rows of characters
    charWidth: 5,             // Width of each character in pixels (changed to 5)
    charHeight: 8,            // Height of each character in pixels
    xOffset: 0,               // X offset to the start of the first character
    yOffset: 0,               // Y offset to the start of the first character
    xPadding: 0,              // Horizontal padding between characters
    yPadding: 0,              // Vertical padding between characters
    threshold: 128            // Brightness threshold (0-255) for determining black vs white
  };

  // Configuration form
  const configForm = document.createElement('div');
  configForm.innerHTML = `
    <h3>Font Extraction Settings (5x8 Font)</h3>
    <div>
      <label>Characters per row: <input type="number" id="charsPerRow" value="${config.charsPerRow}"></label>
    </div>
    <div>
      <label>Number of rows: <input type="number" id="charRows" value="${config.charRows}"></label>
    </div>
    <div>
      <label>Character width (px): <input type="number" id="charWidth" value="${config.charWidth}"></label>
    </div>
    <div>
      <label>Character height (px): <input type="number" id="charHeight" value="${config.charHeight}"></label>
    </div>
    <div>
      <label>X offset (px): <input type="number" id="xOffset" value="${config.xOffset}"></label>
    </div>
    <div>
      <label>Y offset (px): <input type="number" id="yOffset" value="${config.yOffset}"></label>
    </div>
    <div>
      <label>X padding between chars (px): <input type="number" id="xPadding" value="${config.xPadding}"></label>
    </div>
    <div>
      <label>Y padding between rows (px): <input type="number" id="yPadding" value="${config.yPadding}"></label>
    </div>
    <div>
      <label>Threshold (0-255): <input type="number" id="threshold" min="0" max="255" value="${config.threshold}"></label>
    </div>
  `;
  document.body.insertBefore(configForm, extractButton);

  // Function to update config from form values
  function updateConfigFromForm() {
    config.charsPerRow = parseInt(document.getElementById('charsPerRow').value);
    config.charRows = parseInt(document.getElementById('charRows').value);
    config.charWidth = parseInt(document.getElementById('charWidth').value);
    config.charHeight = parseInt(document.getElementById('charHeight').value);
    config.xOffset = parseInt(document.getElementById('xOffset').value);
    config.yOffset = parseInt(document.getElementById('yOffset').value);
    config.xPadding = parseInt(document.getElementById('xPadding').value);
    config.yPadding = parseInt(document.getElementById('yPadding').value);
    config.threshold = parseInt(document.getElementById('threshold').value);
  }

  // Preview image when selected
  fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const img = new Image();
      img.onload = function() {
        // Show preview of the image
        const previewDiv = document.createElement('div');
        previewDiv.innerHTML = '<h3>Image Preview</h3>';
        previewDiv.appendChild(img.cloneNode());
        
        // Remove old preview if exists
        const oldPreview = document.querySelector('div h3');
        if (oldPreview && oldPreview.textContent === 'Image Preview') {
          document.body.removeChild(oldPreview.parentNode);
        }
        
        document.body.insertBefore(previewDiv, extractButton);
      };
      img.src = URL.createObjectURL(e.target.files[0]);
    }
  });
  
  extractButton.addEventListener('click', function() {
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Please select a PNG file first');
      return;
    }
    
    updateConfigFromForm();
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Extract font data
        const fontData = extractFontData(ctx, img.width, img.height, config);
        
        // Display the result
        displayResults(fontData);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileInput.files[0]);
  });
  
  function extractFontData(ctx, imgWidth, imgHeight, config) {
    const fontData = [];
    
    // Loop through all characters in the grid
    for (let row = 0; row < config.charRows; row++) {
      for (let col = 0; col < config.charsPerRow; col++) {
        // Calculate pixel position of this character in the image
        const charX = config.xOffset + col * (config.charWidth + config.xPadding);
        const charY = config.yOffset + row * (config.charHeight + config.yPadding);
        
        // Skip characters that would be outside the image bounds
        if (charX + config.charWidth > imgWidth || charY + config.charHeight > imgHeight) {
          continue;
        }
        
        // Extract image data for this character
        const charData = ctx.getImageData(charX, charY, config.charWidth, config.charHeight);
        
        // Convert to bytes - for 5x8 font, we still use 8 bits per row, with 3 unused bits
        const charBytes = [];
        
        for (let y = 0; y < config.charHeight; y++) {
          let byte = 0;
          
          for (let x = 0; x < config.charWidth; x++) {
            // Calculate pixel index in the ImageData array
            const pixelIndex = (y * config.charWidth + x) * 4;
            
            // Calculate grayscale value (average of RGB)
            const r = charData.data[pixelIndex];
            const g = charData.data[pixelIndex + 1];
            const b = charData.data[pixelIndex + 2];
            const brightness = (r + g + b) / 3;
            
            // Set bit if pixel is dark (below threshold)
            // For 5-bit width characters, we'll align to the left of the byte
            // This means bit positions 7, 6, 5, 4, 3 will be used (0-based index)
            if (brightness < config.threshold) {
              byte |= (1 << (7 - x)); // MSB first
            }
          }
          
          charBytes.push(byte);
        }
        
        fontData.push(charBytes);
      }
    }
    
    return fontData;
  }
  
  function displayResults(fontData) {
    // Create JavaScript code representation
    let jsCode = '// 5x8 Bitmap font data - each character represented as an array of bytes\n';
    jsCode += 'const fontData = [\n';
    
    fontData.forEach((charBytes, index) => {
      // Calculate ASCII value if in ASCII range
      let asciiChar = '';
      if (index >= 32 && index <= 126) {
        asciiChar = ` (${String.fromCharCode(index)})`;
      }
      
      jsCode += `  [ // Character ${index} (0x${index.toString(16).padStart(2, '0')})${asciiChar}\n`;
      jsCode += '    ' + charBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ') + '\n';
      jsCode += '  ]' + (index < fontData.length - 1 ? ',' : '') + '\n';
    });
    
    jsCode += '];\n';
    
    // Create bitmap visualization
    let visualization = '<h3>Character Bitmap Visualization</h3>';
    visualization += '<div style="font-family: monospace; white-space: pre;">';
    
    fontData.forEach((charBytes, index) => {
      if (index % 8 === 0 && index > 0) {
        visualization += '\n\n';
      } else if (index > 0) {
        visualization += '  ';
      }
      
      // Calculate ASCII value if in ASCII range
      let asciiChar = '';
      if (index >= 32 && index <= 126) {
        asciiChar = ` '${String.fromCharCode(index)}'`;
      }
      
      visualization += `Char ${index.toString(16).padStart(2, '0')}${asciiChar}: `;
      
      // Convert bytes to visual representation
      let charVis = '';
      for (let i = 0; i < charBytes.length; i++) {
        let row = '';
        // For 5x8 font, we only show the first 5 bits of each byte
        for (let bit = 7; bit >= 3; bit--) {
          row += (charBytes[i] & (1 << bit)) ? '█' : '·';
        }
        charVis += row + '\n' + '           ';
      }
      
      visualization += '\n           ' + charVis;
    });
    
    visualization += '</div>';
    
    // Display output
    outputDiv.innerHTML = `
      <h3>Extracted Font Data (JavaScript)</h3>
      <pre style="background-color: #f5f5f5; padding: 10px; max-height: 300px; overflow: auto;">${jsCode}</pre>
      ${visualization}
      
      <h3>How to Use This Font</h3>
      <pre style="background-color: #f5f5f5; padding: 10px;">
// Example function to draw a character to a canvas or buffer
function drawCharacter(ctx, charIndex, x, y, color = '#000000', scale = 1) {
  const charData = fontData[charIndex];
  ctx.fillStyle = color;
  
  for (let row = 0; row < 8; row++) {
    const rowByte = charData[row];
    
    // For each of the 5 bits (for 5x8 font)
    for (let col = 0; col < 5; col++) {
      // Check if the bit is set (starting from the leftmost bit)
      if (rowByte & (1 << (7 - col))) {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}
      </pre>
    `;
  }
});
