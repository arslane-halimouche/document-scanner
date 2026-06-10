import { useRef, useState, useCallback, useEffect } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { Quad, Point } from "../utils/imageProcessor";

interface CropEditorProps {
  imageDataUrl: string;
  initialQuad: Quad;
  onConfirm: (quad: Quad) => void;
  onRetry: () => void;
}

const HANDLE_RADIUS = 22;

export function CropEditor({
  imageDataUrl,
  initialQuad,
  onConfirm,
  onRetry,
}: CropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [quad, setQuad] = useState<Quad>(initialQuad);
  const [dragging, setDragging] = useState<number | null>(null);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.width, h: img.height });
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / imgSize.w, rect.height / imgSize.h, 1);
    setDisplaySize({ w: imgSize.w * scale, h: imgSize.h * scale });
  }, [imgSize]);

  const toDisplay = (p: Point) => ({
    x: p.x * displaySize.w,
    y: p.y * displaySize.h,
  });

  const toNorm = useCallback(
    (x: number, y: number): Point => ({
      x: Math.max(0, Math.min(1, x / displaySize.w)),
      y: Math.max(0, Math.min(1, y / displaySize.h)),
    }),
    [displaySize]
  );

  const getEventPos = (
    e: React.MouseEvent | React.TouchEvent,
    rect: DOMRect
  ) => {
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const handlePointerDown = useCallback(
    (index: number) =>
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDragging(index);
      },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (dragging === null || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = (rect.width - displaySize.w) / 2;
      const offsetY = (rect.height - displaySize.h) / 2;
      const pos = getEventPos(e, rect);
      const newPoint = toNorm(pos.x - offsetX, pos.y - offsetY);
      setQuad((prev) => {
        const next = [...prev] as Quad;
        next[dragging] = newPoint;
        return next;
      });
    },
    [dragging, displaySize, toNorm]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const pts = quad.map(toDisplay);
  const polygonPoints = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90">
        <button
          onClick={onRetry}
          className="text-white flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl hover:bg-white/10"
        >
          <RotateCcw size={16} />
          Reintentar
        </button>
        <p className="text-white text-sm font-semibold">
          Ajustar el documento
        </p>
        <button
          onClick={() => onConfirm(quad)}
          className="text-white flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-[#4F8EF7] hover:bg-[#3B7AE8]"
        >
          <Check size={16} />
          Confirmar
        </button>
      </div>

      {/* Instrucción */}
      <div className="bg-black/70 text-center py-2">
        <p className="text-white/70 text-xs">
          Arrastre las esquinas para ajustar
        </p>
      </div>

      {/* Zona de edición */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        <div
          className="relative"
          style={{ width: displaySize.w, height: displaySize.h }}
        >
          <img
            src={imageDataUrl}
            alt="documento"
            className="w-full h-full object-contain select-none"
            draggable={false}
          />

          <svg
            className="absolute inset-0 w-full h-full"
            style={{ overflow: "visible" }}
          >
            <defs>
              <mask id="docMask">
                <rect width="100%" height="100%" fill="white" />
                <polygon points={polygonPoints} fill="black" />
              </mask>
            </defs>

            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#docMask)"
            />

            <polygon
              points={polygonPoints}
              fill="rgba(79,142,247,0.12)"
              stroke="#4F8EF7"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {[1, 2].map((i) => {
              const t = i / 3;
              const topX = pts[0].x + (pts[1].x - pts[0].x) * t;
              const topY = pts[0].y + (pts[1].y - pts[0].y) * t;
              const botX = pts[3].x + (pts[2].x - pts[3].x) * t;
              const botY = pts[3].y + (pts[2].y - pts[3].y) * t;
              const leftX = pts[0].x + (pts[3].x - pts[0].x) * t;
              const leftY = pts[0].y + (pts[3].y - pts[0].y) * t;
              const rightX = pts[1].x + (pts[2].x - pts[1].x) * t;
              const rightY = pts[1].y + (pts[2].y - pts[1].y) * t;
              return (
                <g key={i}>
                  <line
                    x1={topX} y1={topY} x2={botX} y2={botY}
                    stroke="rgba(79,142,247,0.4)" strokeWidth="1"
                  />
                  <line
                    x1={leftX} y1={leftY} x2={rightX} y2={rightY}
                    stroke="rgba(79,142,247,0.4)" strokeWidth="1"
                  />
                </g>
              );
            })}

            {pts.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={HANDLE_RADIUS}
                  fill="transparent"
                  style={{ cursor: "grab" }}
                  onMouseDown={handlePointerDown(i) as any}
                  onTouchStart={handlePointerDown(i) as any}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={10}
                  fill="white"
                  stroke="#4F8EF7"
                  strokeWidth="3"
                  style={{ pointerEvents: "none" }}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#4F8EF7"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
