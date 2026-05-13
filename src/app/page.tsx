"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Stethoscope } from "lucide-react";

// Register ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const TOTAL_FRAMES = 192;
const FRAME_PREFIX = "ezgif-frame-";
const FRAME_EXTENSION = ".jpg";
const FRAMES_DIR = "/scrollanimationframes/";

const padZero = (num: number, size: number) => {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
};

export default function CinematicScrollPage() {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Disable scrolling while loading
  useEffect(() => {
    if (!isLoaded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoaded]);

  // Preload images
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = padZero(i, 3);
      // Added ?v=2 to bypass browser cache for the newly enhanced images
      img.src = `${FRAMES_DIR}${FRAME_PREFIX}${frameNum}${FRAME_EXTENSION}?v=2`;
      
      img.onload = () => {
        loadedCount++;
        loadedImages[i - 1] = img;
        setProgress(Math.floor((loadedCount / TOTAL_FRAMES) * 100));
        
        if (loadedCount === TOTAL_FRAMES) {
          setImages(loadedImages);
          // Small delay before setting loaded for smooth transition
          setTimeout(() => {
            setIsLoaded(true);
          }, 500);
        }
      };
      
      img.onerror = () => {
        console.error(`Failed to load image: ${img.src}`);
        // Increment anyway so it doesn't get stuck
        loadedCount++;
        loadedImages[i - 1] = img; // Could be a fallback or left empty
        setProgress(Math.floor((loadedCount / TOTAL_FRAMES) * 100));
        
        if (loadedCount === TOTAL_FRAMES) {
          setImages(loadedImages);
          setTimeout(() => {
            setIsLoaded(true);
          }, 500);
        }
      };
    }
  }, []);

  // Initialize Lenis and Canvas
  useEffect(() => {
    if (!isLoaded || images.length === 0) return;

    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-style easing
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Canvas setup
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Set canvas dimensions
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderFrame(currentFrameObj.frame);
    };

    const renderFrame = (index: number) => {
      if (!context || !canvas) return;
      
      // Ensure index is within bounds
      const safeIndex = Math.min(Math.max(0, Math.floor(index)), TOTAL_FRAMES - 1);
      const img = images[safeIndex];
      
      if (!img) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      // Implement object-fit: cover logic
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;
      
      let renderWidth, renderHeight, offsetX = 0, offsetY = 0;

      if (canvasRatio > imgRatio) {
        renderWidth = canvas.width;
        renderHeight = canvas.width / imgRatio;
        offsetY = (canvas.height - renderHeight) / 2;
      } else {
        renderWidth = canvas.height * imgRatio;
        renderHeight = canvas.height;
        offsetX = (canvas.width - renderWidth) / 2;
      }

      context.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
    };

    // Initial render and resize listener
    const currentFrameObj = { frame: 0 };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Setup ScrollTrigger animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // Smooth scrubbing
      },
    });

    tl.to(currentFrameObj, {
      frame: TOTAL_FRAMES - 1,
      snap: "frame", // Optional: snap to integer frames
      ease: "none",
      onUpdate: () => {
        renderFrame(currentFrameObj.frame);
      },
    });

    // Handle component unmount
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateCanvasSize);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      tl.kill();
      lenis.destroy();
    };
  }, [isLoaded, images]);

  return (
    <main className="bg-black text-white min-h-screen">
      {/* Loading Screen */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ${
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="text-4xl font-light tracking-widest tabular-nums text-white mb-8">
          {progress}%
        </div>
        
        <div className="relative w-64 md:w-96">
          {/* Stethoscope Icon moving along the track */}
          <div 
            className="absolute bottom-6 -translate-x-1/2 transition-all duration-300 ease-out text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            style={{ left: `${progress}%` }}
          >
            <Stethoscope className="w-8 h-8 animate-pulse" strokeWidth={1.5} />
          </div>

          {/* Loading Track */}
          <div className="h-[2px] w-full bg-white/10 relative overflow-hidden rounded-full">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/50 to-white transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Animation Container */}
      <div ref={containerRef} className="h-[500vh] w-full relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="h-full w-full object-cover block"
          />
        </div>
      </div>
    </main>
  );
}
