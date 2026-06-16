import React, { useState } from "react";
import { Save, RotateCcw, FileText, CheckCircle, ChevronDown, FileImage, FileType, Cloud, HardDrive, Loader } from "lucide-react";
import { exportAsJpeg, exportAsPng, exportAsPdf } from "../utils/pdfExport";
import { getModelApi, isModelApiAvailable } from "../services/modelApi";
import type { ScannedDocument } from "../types";

interface PreviewViewProps {
  document: ScannedDocument;
  onSave: (doc: ScannedDocument) => void;
  onRetry: () => void;
}

type ExportFormat = "jpeg" | "png" | "pdf";
type SaveDestination = "local" | "cloud";

export function PreviewView({ document, onSave, onRetry }: PreviewViewProps) {
  const [name, setName] = useState(document.name);
  const [saved, setSaved] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [downloading, setDownloading] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [destination, setDestination] = useState<SaveDestination>("local");
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const cloudAvailable = isModelApiAvailable();

  const formatLabels: Record<ExportFormat, { label: string; icon: React.ReactNode; desc: string }> = {
    jpeg: { label: "JPEG", icon: <FileImage size={15} />, desc: "Imagen comprimida, ligero" },
    png:  { label: "PNG",  icon: <FileImage size={15} />, desc: "Sin pérdida, máxima calidad" },
    pdf:  { label: "PDF",  icon: <FileType  size={15} />, desc: "Documento PDF A4" },
  };

  const handleDownloadLocal = async () => {
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

  const handleSaveCloud = async () => {
    setCloudSaving(true);
    setCloudError(null);
    try {
      const api = getModelApi();
      await api.create("scanned-documents", {
        name: name || "documento",
        filterMode: "color",
        dataUrl: document.processedDataUrl,
        source: "camera",
        createdAt: document.createdAt,
        updatedAt: new Date().toISOString(),
      });
      setCloudSaved(true);
      onSave({ ...document, name });
    } catch (err) {
      console.error("Error guardando en Knowledge Hub:", err);
      setCloudError("Error al guardar en el Knowledge Hub. Verifica tu conexión.");
    } finally {
      setCloudSaving(false);
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

      {/* Image */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#2A3A5C] bg-[#111827]">
        <img src={document.processedDataUrl} alt="Documento digitalizado" className="w-full object-contain max-h-[420px]" />
      </div>

      {/* Original */}
      <details className="text-xs text-slate-500 cursor-pointer group">
        <summary className="select-none hover:text-slate-300 transition-colors flex items-center gap-1.5">
          <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
          Ver imagen original
        </summary>
        <div className="mt-2 rounded-xl overflow-hidden border border-[#2A3A5C]">
          <img src={document.originalDataUrl} alt="Original" className="w-full object-contain max-h-64" />
        </div>
      </details>

      {/* Nom */}
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

      {/* Destination */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          ¿Dónde guardar?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDestination("local")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              destination === "local"
                ? "border-[#4F8EF7] bg-[#1A2744]"
                : "border-[#2A3A5C] bg-[#0D1A35] hover:border-[#4F8EF7]/40"
            }`}
          >
            <HardDrive size={24} className={destination === "local" ? "text-[#4F8EF7]" : "text-slate-400"} />
            <div className="text-center">
              <p className={`text-xs font-bold ${destination === "local" ? "text-[#4F8EF7]" : "text-white"}`}>
                En este dispositivo
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">PC o móvil</p>
            </div>
          </button>

          <button
            onClick={() => cloudAvailable && setDestination("cloud")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              destination === "cloud"
                ? "border-[#4F8EF7] bg-[#1A2744]"
                : "border-[#2A3A5C] bg-[#0D1A35] hover:border-[#4F8EF7]/40"
            } ${!cloudAvailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Cloud size={24} className={destination === "cloud" ? "text-[#4F8EF7]" : "text-slate-400"} />
            <div className="text-center">
              <p className={`text-xs font-bold ${destination === "cloud" ? "text-[#4F8EF7]" : "text-white"}`}>
                Knowledge Hub
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">ConsulPoint</p>
            </div>
          </button>
        </div>
        {!cloudAvailable && (
          <p className="text-[10px] text-amber-400 mt-1">
            ⚠ Knowledge Hub disponible solo dentro de ConsulPoint
          </p>
        )}
      </div>

      {/* Format — seulement si local */}
      {destination === "local" && (
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
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">

        {/* Bouton principal */}
        {destination === "local" ? (
          <button
            onClick={handleDownloadLocal}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-[#4F8EF7] hover:bg-[#3B7AE8] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Exportando…
              </>
            ) : (
              <>
                <HardDrive size={16} />
                Descargar en {formatLabels[format].label}
              </>
            )}
          </button>
        ) : (
          <>
            {cloudSaved ? (
              <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 font-bold py-3.5 rounded-xl">
                <CheckCircle size={16} />
                Guardado en Knowledge Hub ✅
              </div>
            ) : (
              <button
                onClick={handleSaveCloud}
                disabled={cloudSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#4F8EF7] hover:bg-[#3B7AE8] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:opacity-60"
              >
                {cloudSaving ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Guardando en ConsulPoint…
                  </>
                ) : (
                  <>
                    <Cloud size={16} />
                    Guardar en Knowledge Hub
                  </>
                )}
              </button>
            )}
            {cloudError && (
              <p className="text-xs text-red-400 text-center mt-1">{cloudError}</p>
            )}
          </>
        )}

        {/* Historial */}
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