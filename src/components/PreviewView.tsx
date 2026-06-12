import React, { useState } from "react";
import { Save, RotateCcw, FileText, CheckCircle, ChevronDown, FileImage, FileType } from "lucide-react";
import { exportAsJpeg, exportAsPng, exportAsPdf } from "../utils/pdfExport";
import type { ScannedDocument } from "../types";

interface PreviewViewProps {
  document: ScannedDocument;
  onSave: (doc: ScannedDocument) => void;
  onRetry: () => void;
}

type ExportFormat = "jpeg" | "png" | "pdf";

export function PreviewView({ document, onSave, onRetry }: PreviewViewProps) {
  const [name, setName] = useState(document.name);
  const [saved, setSaved] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [downloading, setDownloading] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const formatLabels: Record<ExportFormat, { label: string; icon: React.ReactNode; desc: string }> = {
    jpeg: { label: "JPEG", icon: <FileImage size={15} />, desc: "Imagen comprimida, ligero" },
    png:  { label: "PNG",  icon: <FileImage size={15} />, desc: "Sin pérdida, máxima calidad" },
    pdf:  { label: "PDF",  icon: <FileType  size={15} />, desc: "Documento PDF A4" },
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const fileName = name || "documento";
      if (format === "jpeg")      exportAsJpeg(document.processedDataUrl, fileName);
      else if (format === "png")  await exportAsPng(document.processedDataUrl, fileName);
      else                        await exportAsPdf(document.processedDataUrl, fileName);
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = () => {
    onSave({ ...document, name });
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-[#4F8EF7]" />
        <h2 className="text-sm font-bold text-white">Vista previa del escaneo</h2>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#2A3A5C] bg-[#111827]">
        <img src={document.processedDataUrl} alt="Documento digitalizado" className="w-full object-contain max-h-[420px]" />
      </div>

      <details className="text-xs text-slate-500 cursor-pointer group">
        <summary className="select-none hover:text-slate-300 transition-colors flex items-center gap-1.5">
          <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
          Ver imagen original
        </summary>
        <div className="mt-2 rounded-xl overflow-hidden border border-[#2A3A5C]">
          <img src={document.originalDataUrl} alt="Original" className="w-full object-contain max-h-64" />
        </div>
      </details>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Nombre del documento
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#1A2744] border border-[#2A3A5C] rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-[#4F8EF7] transition-colors placeholder-slate-500"
          placeholder="Nombre del archivo…"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Formato de exportación
        </label>
        <div className="relative">
          <button
            onClick={() => setShowFormatMenu((v) => !v)}
            className="w-full flex items-center justify-between bg-[#1A2744] border border-[#2A3A5C] rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:border-[#4F8EF7] transition-colors"
          >
            <div className="flex items-center gap-2 text-[#4F8EF7]">
              {formatLabels[format].icon}
              <span>{formatLabels[format].label}</span>
              <span className="text-slate-400 font-normal">— {formatLabels[format].desc}</span>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${showFormatMenu ? "rotate-180" : ""}`} />
          </button>

          {showFormatMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A2744] border border-[#2A3A5C] rounded-xl overflow-hidden shadow-2xl z-10">
              {(["jpeg", "png", "pdf"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFormat(f); setShowFormatMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#243660] ${format === f ? "text-[#4F8EF7] bg-[#1E3060]" : "text-white"}`}
                >
                  <span className={format === f ? "text-[#4F8EF7]" : "text-slate-400"}>
                    {formatLabels[f].icon}
                  </span>
                  <span className="font-semibold">{formatLabels[f].label}</span>
                  <span className="text-slate-400 text-xs">{formatLabels[f].desc}</span>
                  {format === f && <CheckCircle size={14} className="ml-auto text-[#4F8EF7]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-[#4F8EF7] hover:bg-[#3B7AE8] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:opacity-60"
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exportando…
            </>
          ) : (
            <>
              {formatLabels[format].icon}
              Descargar en {formatLabels[format].label}
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={saved}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl border transition-all ${
            saved
              ? "border-green-500/30 text-green-400 bg-green-500/10 cursor-default"
              : "border-[#2A3A5C] text-slate-300 hover:bg-[#1A2744] hover:border-[#4F8EF7]"
          }`}
        >
          {saved ? (
            <><CheckCircle size={16} className="text-green-400" />Guardado en el historial</>
          ) : (
            <><Save size={16} />Guardar en el historial</>
          )}
        </button>

        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium py-2.5 rounded-xl hover:bg-[#1A2744] transition-all"
        >
          <RotateCcw size={15} />
          Nuevo escaneo
        </button>
      </div>
    </div>
  );
}
