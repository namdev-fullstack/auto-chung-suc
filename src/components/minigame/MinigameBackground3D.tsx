'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MinigameBackground3DProps {
  intensity?: number;
  variant?: 'light' | 'festive' | 'dark';
}

export default function MinigameBackground3D({
  intensity = 1,
  variant = 'light',
}: MinigameBackground3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 85;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // 2. Tạo hạt tinh vân 3D (Tối ưu số lượng hạt để nhẹ máy)
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Bảng màu rực rỡ, tương phát cao trên nền sáng
    const goldColor = new THREE.Color('#d97706'); // Warm gold/amber
    const orangeColor = new THREE.Color('#f97316'); // Orange
    const amberColor = new THREE.Color('#f59e0b'); // Bright amber
    const blueColor = new THREE.Color('#0284c7'); // Vivid ocean blue
    const redColor = new THREE.Color('#e11d48'); // Rose/Red festive

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 170;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const rand = Math.random();
      let selectedColor = goldColor;
      if (rand < 0.4) {
        selectedColor = amberColor;
      } else if (rand < 0.7) {
        selectedColor = orangeColor;
      } else if (rand < 0.9) {
        selectedColor = blueColor;
      } else {
        selectedColor = redColor;
      }

      colors[i * 3] = selectedColor.r;
      colors[i * 3 + 1] = selectedColor.g;
      colors[i * 3 + 2] = selectedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Tạo texture hạt phát sáng mượt mà
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.35, 'rgba(245, 158, 11, 0.7)');
      gradient.addColorStop(0.7, 'rgba(217, 119, 6, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 3.5 * intensity,
      map: particleTexture,
      transparent: true,
      vertexColors: true,
      blending: variant === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      opacity: variant === 'dark' ? 0.85 : 0.65,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 3. Animation Loop (tạm dừng khi tab ẩn để tránh tiêu tốn GPU)
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Chuyển động nhẹ nhàng, không gây lag
      particles.rotation.y = elapsedTime * 0.035;
      particles.rotation.x = Math.sin(elapsedTime * 0.025) * 0.08;
      particles.rotation.z = Math.cos(elapsedTime * 0.02) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!isRunning) {
          isRunning = true;
          clock.start();
          animate();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Resize listener
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 5. Cleanup
    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

  }, [intensity, variant]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    />
  );
}
