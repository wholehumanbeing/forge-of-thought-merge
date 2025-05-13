import React, { useMemo, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpaceBackgroundProps {
  starsCount?: number;
  depth?: number;
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ 
  starsCount = 5000,
  depth = 2000,
}) => {
  const { scene } = useThree();
  const starsRef = useRef<THREE.Points>(null);
  
  // Create a star texture
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a radial gradient for a soft glow effect
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(240, 240, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Create stars particles as a memo
  const stars = useMemo(() => {
    // Create a buffer geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const sizes = [];
    
    // Generate random positions for stars
    for (let i = 0; i < starsCount; i++) {
      // Create stars in a large cubic space using randFloatSpread
      const x = THREE.MathUtils.randFloatSpread(depth);
      const y = THREE.MathUtils.randFloatSpread(depth);
      const z = THREE.MathUtils.randFloatSpread(depth);
      
      vertices.push(x, y, z);
      
      // Create subtle color variations for stars
      const color = new THREE.Color();
      
      // More diverse star colors (blue, white, slight yellow)
      const colorType = Math.random();
      if (colorType < 0.7) {
        // White to blue-white stars (most common)
        color.setHSL(
          Math.random() * 0.1 + 0.58, // Hue (bluish/whitish)
          Math.random() * 0.3 + 0.1,   // Saturation (subtle)
          Math.random() * 0.2 + 0.8    // Lightness (bright)
        );
      } else if (colorType < 0.9) {
        // Slightly yellow/orange stars
        color.setHSL(
          Math.random() * 0.05 + 0.12, // Hue (yellowish/orange)
          Math.random() * 0.3 + 0.1,    // Saturation (subtle)
          Math.random() * 0.2 + 0.8     // Lightness (bright)
        );
      } else {
        // Few reddish stars
        color.setHSL(
          Math.random() * 0.05 + 0.01, // Hue (reddish)
          Math.random() * 0.4 + 0.2,   // Saturation (more vibrant)
          Math.random() * 0.3 + 0.7    // Lightness (slightly less bright)
        );
      }
      
      colors.push(color.r, color.g, color.b);
      
      // Vary the size of stars (smaller more distant ones, occasional larger ones)
      const size = Math.random() < 0.1 
        ? THREE.MathUtils.randFloat(3, 6)   // Few larger stars
        : THREE.MathUtils.randFloat(0.5, 2); // Most stars are smaller
      
      sizes.push(size);
    }
    
    // Add vertices to the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    // Create the material with appropriate settings for realistic stars
    const material = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: true,
      vertexColors: true,
      map: starTexture,
      alphaTest: 0.01,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    // Create the points
    return new THREE.Points(geometry, material);
  }, [starsCount, depth, starTexture]);
  
  // Add a dark purple/blue background for deep space color
  useMemo(() => {
    scene.background = new THREE.Color(0x090018);
  }, [scene]);
  
  // Add subtle twinkling effect
  useFrame(({ clock }) => {
    if (starsRef.current) {
      const time = clock.getElapsedTime();
      
      // Get the size attribute to animate
      const sizes = starsRef.current.geometry.attributes.size;
      
      // Animate the sizes for a twinkling effect
      for (let i = 0; i < sizes.count; i++) {
        // Original size
        const originalSize = sizes.getX(i);
        
        // Subtle random size variation based on time and star index
        const twinkle = Math.sin(time * 2 + i * 1000) * 0.15 + 1;
        
        // Update size with the twinkle factor
        sizes.setX(i, originalSize * twinkle);
      }
      
      sizes.needsUpdate = true;
    }
  });
  
  return (
    <>
      {/* Add nebula-like fog for depth */}
      <fog attach="fog" args={['#090018', depth * 0.2, depth]} />
      
      {/* Add the stars points */}
      <primitive object={stars} ref={starsRef} />
      
      {/* Add distant light sources to represent other galaxies or nebulae */}
      <pointLight position={[-depth/2, depth/2, -depth/2]} intensity={0.5} color="#6633aa" />
      <pointLight position={[depth/2, -depth/3, -depth/2]} intensity={0.3} color="#3355ff" />
    </>
  );
};

export default SpaceBackground; 