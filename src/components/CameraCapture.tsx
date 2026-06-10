import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, AlertCircle, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [ready, setReady] = useState(false);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    try {
      setReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
      setError(null);
    } catch {
      setError(
        "No se puede acceder a la cámara. Verifique los permisos del navegador."
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlip = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/5">
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
        <span className="text-white text-sm font-semibold tracking-wide">
          Digitalizar un documento
        </span>
        <button
          onClick={handleFlip}
          className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Visor — SIN rectángulo guía */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {error ? (
          <div className="text-white text-center px-6 flex flex-col items-center gap-3">
            <AlertCircle size={44} className="text-red-400 opacity-80" />
            <p className="text-sm text-white/70">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Indicador de carga */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white/60 text-xs">Iniciando cámara…</p>
            </div>
          </div>
        )}
      </div>

      {/* Botón de captura */}
      <div className="flex items-center justify-center py-8 bg-black/90 border-t border-white/5">
        <button
          onClick={handleCapture}
          disabled={!!error || !ready}
          className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-all duration-150 disabled:opacity-30 border-4 border-[#4F8EF7]"
        >
          <Camera size={28} className="text-[#1A2744]" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
