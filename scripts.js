let imageWidth = 0;
let imageHeight = 0;
let initialImageWidth = 0;
let initialImageHeight = 0;

document.addEventListener("DOMContentLoaded", function () {
  const imageUpload = document.getElementById('imageUpload');
  const slider = document.getElementById('slider');
  const colourSlider = document.getElementById('ColourSlider');
  const poolingType = document.getElementById('poolingType');

  const uploadedImage = document.getElementById('uploadedImage');
  const copiedImage = document.getElementById('copiedImage');

  imageUpload.addEventListener('change', function (event) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = function () {
          // Display both images
          uploadedImage.src = img.src;
          copiedImage.src = img.src;

          uploadedImage.style.display = 'block';
          copiedImage.style.display = 'block';

          // Extract EXIF and dimensions
          EXIF.getData(img, function () {
            imageWidth = EXIF.getTag(this, 'PixelXDimension') || img.width;
            imageHeight = EXIF.getTag(this, 'PixelYDimension') || img.height;

            initialImageWidth = imageWidth;
            initialImageHeight = imageHeight;

            updateDisplay();
            console.log(EXIF.getAllTags(this));
          });
        };
      };

      reader.readAsDataURL(file);
    }
  });

  // Listener for slider
  slider.addEventListener('input', function () {
    document.getElementById('sliderValue').textContent = slider.value;
    updateDisplay();
  });

  // Listener for slider
  colourSlider.addEventListener('input', function () {
    document.getElementById('colourSliderValue').textContent = colourSlider.value;
    updateDisplay();
  });

  // Listener for pooling type change
  poolingType.addEventListener('change', function () {
    updateDisplay();
  });

    function updateDisplay() {
      const kernelSize = parseInt(slider.value);
      const poolingValue = poolingType.value;
      const quantiseEnabled = document.getElementById('Quantise').value === 'yes'; // 'mean' means quantise here
      const quantiseLevels = parseInt(colourSlider.value);

      const canvas = document.getElementById('hiddenCanvas');
      const ctx = canvas.getContext('2d');

      canvas.width = uploadedImage.naturalWidth;
      canvas.height = uploadedImage.naturalHeight;
      ctx.drawImage(uploadedImage, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

        // Loop over all pixels in image, ensuring pixels are processed in blocks of kernelSize
        for (let y = 0; y < height; y += kernelSize) {
            for (let x = 0; x < width; x += kernelSize) {
            let r, g, b, a;

            // Initialize r, g, b, a based on pooling type
            if (poolingValue === 'mean') {
                r = g = b = a = 0;
            } else if (poolingValue === 'max') {
                r = g = b = a = 0;
            } else if (poolingValue === 'min') {
                r = g = b = a = 255;
            }

            let count = 0;

            // Loop over the kernel area
            for (let ky = 0; ky < kernelSize && y + ky < height; ky++) {
                for (let kx = 0; kx < kernelSize && x + kx < width; kx++) {
                    // Get rgba values of the pixel at (x + kx, y + ky)
                    const index = ((y + ky) * width + (x + kx)) * 4;
                    const rVal = data[index];
                    const gVal = data[index + 1];
                    const bVal = data[index + 2];
                    const aVal = data[index + 3];

                    // Update r, g, b, a based on pooling type
                    if (poolingValue === 'mean') {
                        r += rVal;
                        g += gVal;
                        b += bVal;
                        a += aVal;
                        count++;
                    } else if (poolingValue === 'max') {
                        r = count === 0 ? rVal : Math.max(r, rVal);
                        g = count === 0 ? gVal : Math.max(g, gVal);
                        b = count === 0 ? bVal : Math.max(b, bVal);
                        a = count === 0 ? aVal : Math.max(a, aVal);
                        count++;
                    } else if (poolingValue === 'min') {
                        r = count === 0 ? rVal : Math.min(r, rVal);
                        g = count === 0 ? gVal : Math.min(g, gVal);
                        b = count === 0 ? bVal : Math.min(b, bVal);
                        a = count === 0 ? aVal : Math.min(a, aVal);
                        count++;
                    }
                }
            }

            // If pooling type is mean, average the values
            if (poolingValue === 'mean') {
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                a = Math.round(a / count);
            }

            // Set the pixel values in the kernel area
            for (let ky = 0; ky < kernelSize && y + ky < height; ky++) {
                for (let kx = 0; kx < kernelSize && x + kx < width; kx++) {
                    const index = ((y + ky) * width + (x + kx)) * 4;
                    data[index] = r;
                    data[index + 1] = g;
                    data[index + 2] = b;
                    data[index + 3] = a;
                }
            }
            }
        }

        if (quantiseEnabled && quantiseLevels > 1) {
          // Quantise each pixel's R,G,B based on slider value
          for (let i = 0; i < data.length; i += 4) {
            data[i] = quantiseValue(data[i], quantiseLevels);
            data[i + 1] = quantiseValue(data[i + 1], quantiseLevels);
            data[i + 2] = quantiseValue(data[i + 2], quantiseLevels);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        copiedImage.src = canvas.toDataURL();
    }


    // Function to quantise a value to the nearest level
    function quantiseValue(value, levels) {
      const step = 255 / (levels - 1);
      return Math.round(value / step) * step;
    }


});
