export async function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ffffff');
        return;
      }
      // Draw image scaled down to 1x1 pixel to get the average color
      ctx.drawImage(img, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      
      let r = data[0];
      let g = data[1];
      let b = data[2];
      
      // Ensure the text remains legible (not too dark)
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (luma < 100) {
        // Lighten the color if it's too dark
        const boost = 120 - luma;
        r = Math.min(255, r + boost * 1.5);
        g = Math.min(255, g + boost * 1.5);
        b = Math.min(255, b + boost * 1.5);
      }

      // Create a complementary/secondary color for the gradient (shift hue slightly and lighten)
      // For simplicity in RGB, we'll just lighten and mix slightly
      const r2 = Math.min(255, r + 40);
      const g2 = Math.min(255, g + 40);
      const b2 = Math.min(255, b + 60); // Add a cool tint to the secondary color
      
      resolve(`linear-gradient(135deg, rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}), rgb(${Math.round(r2)}, ${Math.round(g2)}, ${Math.round(b2)}))`);
    };
    img.onerror = () => {
      // Fallback to white gradient
      resolve('linear-gradient(135deg, #ffffff, #e0e0e0)');
    };
    img.src = imageUrl;
  });
}

export async function getVibrantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#eab308');
        return;
      }
      ctx.drawImage(img, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      
      let r = data[0];
      let g = data[1];
      let b = data[2];
      
      // Boost vibrancy
      const max = Math.max(r, g, b);
      if (max < 180) {
        const factor = 220 / Math.max(max, 1);
        r = Math.min(255, r * factor);
        g = Math.min(255, g * factor);
        b = Math.min(255, b * factor);
      }
      
      resolve(`rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`);
    };
    img.onerror = () => {
      resolve('#eab308');
    };
    img.src = imageUrl;
  });
}

export async function getPosterGradient(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use 2x2 grid to sample Top-Left, Top-Right, Bottom-Left, Bottom-Right
      canvas.width = 2; 
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('linear-gradient(135deg, #ffffff, #eab308)');
        return;
      }
      ctx.drawImage(img, 0, 0, 2, 2);
      const data = ctx.getImageData(0, 0, 2, 2).data;

      const boostVibrancy = (i: number) => {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        const max = Math.max(r, g, b);
        
        // Vigorously boost saturation/brightness for texts
        if (max < 160) {
           const factor = 220 / Math.max(max, 1);
           r = Math.min(255, r * factor);
           g = Math.min(255, g * factor);
           b = Math.min(255, b * factor);
        }
        
        // Add artificial brightness baseline so the text pops
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 40);
        b = Math.min(255, b + 40);
        
        return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      };

      const tl = boostVibrancy(0);  // Top Left (0,0)
      const tr = boostVibrancy(4);  // Top Right (1,0)
      const bl = boostVibrancy(8);  // Bottom Left (0,1)
      const br = boostVibrancy(12); // Bottom Right (1,1)

      // Vibrant 4-stop gradient
      resolve(`linear-gradient(135deg, ${tl} 0%, ${tr} 33%, ${bl} 66%, ${br} 100%)`);
    };
    img.onerror = () => resolve('linear-gradient(135deg, #ffffff, #eab308)');
    img.src = imageUrl;
  });
}
