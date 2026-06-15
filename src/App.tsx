import { useState, useEffect, useCallback } from "react";
import { ScanLine, History, ArrowLeft } from "lucide-react";
import type { AppConfig } from "./config";
import { getConfig } from "./config";
import type { Quad, FilterMode } from "./utils/imageProcessor";
import {
  fileToDataUrl,
  pdfFirstPageToDataUrl,
  detectDocumentCorners,
  applyPerspectiveWarp,
  applyDocumentFilter,
} from "./utils/imageProcessor";
import { useDocumentHistory } from "./hooks/useDocumentHistory";
import { CameraCapture } from "./components/CameraCapture";
import { CropEditor } from "./components/CropEditor";
import { FilterSelector } from "./components/FilterSelector";
import { ProcessingView } from "./components/ProcessingView";
import { PreviewView } from "./components/PreviewView";
import { HistoryView } from "./components/HistoryView";
import type { ScannedDocument } from "./types";

type Step = "home" | "camera" | "crop" | "filter" | "processing" | "preview" | "history";

function ActualApp({ config }: { config: AppConfig }) {
  const [step, setStep] = useState<Step>("home");
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("bw");
  const [currentDoc, setCurrentDoc] = useState<ScannedDocument | null>(null);
  const [processingLabel, setProcessingLabel] = useState("Procesando…");
  const { documents, saveDocument, deleteDocument, clearAll } = useDocumentHistory(config.storageKey);

  const handleImageReceived = useCallback(async (dataUrl: string) => {
    setRawDataUrl(dataUrl);
    setProcessingLabel("Detectando bordes…");
    setStep("processing");
    const detected = await detectDocumentCorners(dataUrl);
    setQuad(detected);
    setStep("crop");
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    let dataUrl: string | null = null;
    if (file.type === "application/pdf") {
      setProcessingLabel("Leyendo PDF…");
      setStep("processing");
      dataUrl = await pdfFirstPageToDataUrl(file);
    } else {
      dataUrl = await fileToDataUrl(file);
    }
    if (!dataUrl) { setStep("home"); return; }
    await handleImageReceived(dataUrl);
  }, [handleImageReceived]);

  const handleCropConfirm = useCallback(async (confirmedQuad: Quad) => {
    if (!rawDataUrl) return;
    setProcessingLabel("Recortando…");
    setStep("processing");
    const warped = await applyPerspectiveWarp(rawDataUrl, confirmedQuad);
    setCroppedDataUrl(warped);
    setStep("filter");
  }, [rawDataUrl]);

  const handleFilterConfirm = useCallback(async () => {
    if (!croppedDataUrl || !rawDataUrl) return;
    setProcessingLabel("Aplicando filtro…");
    setStep("processing");
    const processed = await applyDocumentFilter(croppedDataUrl, filterMode);
    const doc: ScannedDocument = {
      id: Date.now().toString(),
      name: `Documento_${new Date().toLocaleDateString("es-ES").replace(/\//g, "-")}`,
      originalDataUrl: rawDataUrl,
      processedDataUrl: processed,
      createdAt: new Date().toISOString(),
      fileType: filterMode,
    };
    setCurrentDoc(doc);
    setStep("preview");
  }, [croppedDataUrl, rawDataUrl, filterMode]);

  const handleReset = useCallback(() => {
    setRawDataUrl(null);
    setQuad(null);
    setCroppedDataUrl(null);
    setCurrentDoc(null);
    setFilterMode("bw");
    setStep("home");
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1526] text-white flex flex-col">

      {step !== "camera" && step !== "crop" && (
        <header className="bg-[#0D1A35] border-b border-[#1E2D4D] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {(step !== "home" && step !== "history") ? (
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all mr-1"
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#4F8EF7]/20 flex items-center justify-center">
                <ScanLine size={16} className="text-[#4F8EF7]" />
              </div>
            )}
            <span className="font-bold text-sm text-white">DocScanner</span>
          </div>
          <button
            onClick={() => setStep(step === "history" ? "home" : "history")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all border border-[#1E2D4D]"
          >
            <History size={14} />
            {step === "history" ? "Inicio" : `Historial (${documents.length})`}
          </button>
        </header>
      )}

      <main className="flex-1 overflow-y-auto">

        {step === "home" && (
          <HomeScreen
            onCamera={() => setStep("camera")}
            onFileUpload={handleFileUpload}
            docCount={documents.length}
          />
        )}

        {step === "camera" && (
          <CameraCapture onCapture={handleImageReceived} onClose={handleReset} />
        )}

        {step === "crop" && rawDataUrl && quad && (
          <CropEditor
            imageDataUrl={rawDataUrl}
            initialQuad={quad}
            onConfirm={handleCropConfirm}
            onRetry={handleReset}
          />
        )}

        {step === "filter" && croppedDataUrl && (
          <div className="flex flex-col">
            <FilterSelector
              selected={filterMode}
              onChange={setFilterMode}
              previewUrl={croppedDataUrl}
            />
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D1A35] border-t border-[#1E2D4D]">
              <button
                onClick={handleFilterConfirm}
                className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-[#4F8EF7] hover:bg-[#3B7AE8] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95"
              >
                <ScanLine size={18} />
                Escanear documento
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (rawDataUrl || croppedDataUrl) && (
          <ProcessingView
            imageSrc={croppedDataUrl ?? rawDataUrl!}
            label={processingLabel}
          />
        )}

        {step === "preview" && currentDoc && (
          <PreviewView
            document={currentDoc}
            onSave={(doc) => { saveDocument(doc); }}
            onRetry={handleReset}
          />
        )}

        {step === "history" && (
          <HistoryView
            documents={documents}
            onDelete={deleteDocument}
            onClearAll={clearAll}
          />
        )}
      </main>
    </div>
  );
}

function HomeScreen({
  onCamera,
  onFileUpload,
  docCount,
}: {
  onCamera: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  docCount: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#4F8EF7]/20 border border-[#4F8EF7]/30 flex items-center justify-center mx-auto mb-4">
          <ScanLine size={36} className="text-[#4F8EF7]" />
        </div>
        <h1 className="text-2xl font-bold text-white">DocScanner</h1>
        <p className="text-slate-400 text-sm mt-2">Digitalice sus documentos en segundos</p>
        {docCount > 0 && (
          <p className="text-xs text-[#4F8EF7] mt-1">
            {docCount} documento{docCount > 1 ? "s" : ""} guardado{docCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={onCamera}
          className="w-full flex items-center gap-4 bg-[#4F8EF7] hover:bg-[#3B7AE8] text-white font-bold py-4 px-5 rounded-2xl transition-all shadow-lg shadow-blue-900/30 active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ScanLine size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold">Usar la cámara</p>
            <p className="text-xs text-blue-200 font-normal">Fotografía directa del documento</p>
          </div>
        </button>

        <label className="w-full flex items-center gap-4 bg-[#0D1A35] hover:bg-[#112040] border-2 border-dashed border-[#2A3A5C] hover:border-[#4F8EF7]/60 text-white font-bold py-4 px-5 rounded-2xl transition-all cursor-pointer active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-[#1A2744] flex items-center justify-center flex-shrink-0">
            <History size={20} className="text-[#4F8EF7]" />
          </div>
          <div className="text-left">
            <p className="font-bold">Importar archivo</p>
            <p className="text-xs text-slate-400 font-normal">JPG, PNG o PDF</p>
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFileUpload}
          />
        </label>
      </div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const cfg = getConfig();
    document.body.setAttribute("data-theme", cfg.theme);
    setConfig(cfg);
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-[#0D1526] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4F8EF7]/30 border-t-[#4F8EF7] rounded-full animate-spin" />
      </div>
    );
  }

  return <ActualApp config={config} />;
}