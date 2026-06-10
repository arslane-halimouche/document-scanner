import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";

interface ProcessingViewProps {
  imageSrc: string;
  label?: string;
}

export function ProcessingView({
  imageSrc,
  label = "Procesando…",
}: ProcessingViewProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 92));
    }, 180);
    return () => clearInterval(interval);
  }, [label]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
      <div className="relative w-48 h-64 rounded-xl overflow-hidden shadow-2xl border border-[#1E2D4D]">
        <img src={imageSrc} alt="escaneo" className="w-full h-full object-cover" />
        <div
          className="absolute left-0 w-full h-0.5 bg-[#4F8EF7] shadow-lg shadow-blue-500/50 transition-all duration-300"
          style={{ top: `${progress}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#4F8EF7]/5 to-transparent" />
      </div>

      <div className="text-center">
        <div className="flex items-center gap-2 justify-center text-[#4F8EF7] font-semibold mb-3">
          <ScanLine size={18} className="animate-pulse" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="w-48 bg-[#1A2744] rounded-full h-1.5">
          <div
            className="bg-[#4F8EF7] h-1.5 rounded-full transition-all duration-300 shadow-sm shadow-blue-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
