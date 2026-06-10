import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, History, ScanLine, FileUp, Camera } from "lucide-react";
import { CameraCapture } from "./components/CameraCapture";
import { CropEditor } from "./components/CropEditor";
import { ProcessingView } from "./components/ProcessingView";
import { PreviewView } from "./components/PreviewView";
import { HistoryView } from "./components/HistoryView";
import { useDocumentHistory } from "./hooks/useDocumentHistory";
import {
  detectDocumentCorners,
  applyPerspectiveWarp,
  applyDocumentFilter,
  fileToDataUrl,
  pdfFirstPageToDataUrl,
} from "./utils/imageProcessor";
import type { Quad, FilterMode } from "./utils/imageProcessor";
import type { ScannedDocument } from "./types";

type AppView =
  | "home"
  | "camera"
  | "crop"
  | "processing"
  | "preview"
  | "history";

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null);
  const [detectedQuad, setDetectedQuad] = useState<Quad | null>(null);
  const [currentDoc, setCurrentDoc] = useState<ScannedDocument | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processingLabel, setProcessingLabel] = useState(
    "Detectando el documento…"
  );
  const [filterMode] = useState<FilterMode>("bw");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { documents, saveDocument, deleteDocument, clearAll } =
    useDocumentHistory();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).getConfig) {
      (window as any).getConfig();
    }
  }, []);

  const handleRawImage = useCallback(async (dataUrl: string) => {
    setRawDataUrl(dataUrl);
    setView("processing");
    setProcessingLabel("Detectando el documento…");

    const timeoutId = setTimeout(() => {
      setDetectedQuad([
        { x: 0.08, y: 0.08 },
        { x: 0.92, y: 0.08 },
        { x: 0.92, y: 0.92 },
        { x: 0.08, y: 0.92 },
      ]);
      setView("crop");
    }, 5000);

    try {
      const quad = await detectDocumentCorners(dataUrl);
      clearTimeout(timeoutId);
      const finalQuad: Quad = quad ?? [
        { x: 0.08, y: 0.08 },
        { x: 0.92, y: 0.08 },
        { x: 0.92, y: 0.92 },
        { x: 0.08, y: 0.92 },
      ];
      setDetectedQuad(finalQuad);
      setView("crop");
    } catch {
      clearTimeout(timeoutId);
      setDetectedQuad([
        { x: 0.08, y: 0.08 },
        { x: 0.92, y: 0.08 },
        { x: 0.92, y: 0.92 },
        { x: 0.08, y: 0.92 },
      ]);
      setView("crop");
    }
  }, []);

  const handleCropConfirm = useCallback(
    async (quad: Quad) => {
      if (!rawDataUrl) return;
      setView("processing");
      setProcessingLabel("Corrigiendo la perspectiva…");

      try {
        const warped = await applyPerspectiveWarp(rawDataUrl, quad);
        setProcessingLabel("Aplicando filtro escáner…");
        const processed = await applyDocumentFilter(warped, filterMode);

        const doc: ScannedDocument = {
          id: crypto.randomUUID(),
          name: `Scan_${new Date()
            .toLocaleDateString("es-ES")
            .replace(/\//g, "-")}_${Date.now().toString().slice(-4)}`,
          originalDataUrl: rawDataUrl,
          processedDataUrl: processed,
          createdAt: new Date().toISOString(),
          fileType: "image/jpeg",
        };
        setCurrentDoc(doc);
        setView("preview");
      } catch {
        setView("home");
      }
    },
    [rawDataUrl, filterMode]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      let dataUrl: string | null = null;
      if (file.type === "application/pdf") {
        dataUrl = await pdfFirstPageToDataUrl(file);
        if (!dataUrl) {
          alert("No se pudo leer el PDF. Intente con una imagen JPG/PNG.");
          return;
        }
      } else {
        dataUrl = await fileToDataUrl(file);
      }
      await handleRawImage(dataUrl);
    },
    [handleRawImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const resetToHome = () => {
    setCurrentDoc(null);
    setRawDataUrl(null);
    setDetectedQuad(null);
    setView("home");
  };

  const Header = ({ showBack = false }: { showBack?: boolean }) => (
    <header className="bg-[#0D1A35] border-b border-[#1E2D4D] sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4F8EF7] flex items-center justify-center shadow-lg shadow-blue-900/40">
            <ScanLine size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              DocScanner
            </h1>
            <p className="text-xs text-slate-400">Digitalización de documentos</p>
          </div>
        </div>
        {showBack ? (
          <button
            onClick={() => setView("home")}
            className="text-xs font-semibold text-[#4F8EF7] hover:text-blue-300 px-3 py-2 transition-colors"
          >
            ← Volver
          </button>
        ) : (
          <button
            onClick={() => setView("history")}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[#1A2744] transition-colors"
          >
            <History size={17} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">
              Historial
            </span>
            {documents.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#4F8EF7] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {documents.length > 9 ? "9+" : documents.length}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );

  // ─── VIEWS ────────────────────────────────────────────────────────────────

  if (view === "camera") {
    return (
      <CameraCapture
        onCapture={handleRawImage}
        onClose={() => setView("home")}
      />
    );
  }

  if (view === "crop" && rawDataUrl && detectedQuad) {
    return (
      <CropEditor
        imageDataUrl={rawDataUrl}
        initialQuad={detectedQuad}
        onConfirm={handleCropConfirm}
        onRetry={() => setView("camera")}
      />
    );
  }

  if (view === "processing" && rawDataUrl) {
    return (
      <div className="min-h-screen bg-[#0D1526] flex flex-col">
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full">
          <ProcessingView imageSrc={rawDataUrl} label={processingLabel} />
        </main>
      </div>
    );
  }

  if (view === "preview" && currentDoc) {
    return (
      <div className="min-h-screen bg-[#0D1526] flex flex-col">
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full">
          <PreviewView
            document={currentDoc}
            onSave={saveDocument}
            onRetry={resetToHome}
          />
        </main>
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="min-h-screen bg-[#0D1526] flex flex-col">
        <Header showBack />
        <main className="flex-1 max-w-lg mx-auto w-full">
          <HistoryView
            documents={documents}
            onDelete={deleteDocument}
            onClearAll={clearAll}
          />
        </main>
      </div>
    );
  }

  // ─── HOME ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D1526] flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-6 px-4 py-8">
          {/* Hero */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#4F8EF7] mx-auto flex items-center justify-center shadow-2xl shadow-blue-900/50 mb-4">
              <ScanLine size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Digitalice sus documentos
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              Detección automática + corrección de perspectiva.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            {/* Camera */}
            <button
              onClick={() => setView("camera")}
              className="flex items-center gap-4 bg-[#0D1A35] rounded-2xl p-5 border border-[#1E2D4D] hover:border-[#4F8EF7]/50 hover:bg-[#112040] transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#4F8EF7]/10 flex items-center justify-center group-hover:bg-[#4F8EF7]/20 transition-colors">
                <Camera size={28} className="text-[#4F8EF7]" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Tomar una foto</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detección automática del documento
                </p>
              </div>
            </button>

            {/* Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-4 bg-[#0D1A35] rounded-2xl p-5 border-2 border-dashed transition-all cursor-pointer group ${
                dragOver
                  ? "border-[#4F8EF7] bg-[#112040]"
                  : "border-[#1E2D4D] hover:border-[#4F8EF7]/50 hover:bg-[#112040]"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1A2744] flex items-center justify-center group-hover:bg-[#4F8EF7]/10 transition-colors">
                <FileUp
                  size={28}
                  className="text-slate-500 group-hover:text-[#4F8EF7] transition-colors"
                />
              </div>
              <div className="text-left">
                <p className="font-bold text-white">Importar un archivo</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  JPG, PNG, PDF, WEBP — arrastre o haga clic
                </p>
              </div>
              <Upload size={16} className="text-slate-600 ml-auto" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Récents */}
          {documents.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Recientes
                </p>
                <button
                  onClick={() => setView("history")}
                  className="text-xs text-[#4F8EF7] font-semibold hover:text-blue-300 transition-colors"
                >
                  Ver todo
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex-shrink-0 w-24 rounded-xl overflow-hidden border border-[#1E2D4D] bg-[#0D1A35]"
                  >
                    <img
                      src={doc.processedDataUrl}
                      alt={doc.name}
                      className="w-full h-28 object-cover"
                    />
                    <p className="text-[10px] text-slate-400 font-medium px-2 py-1.5 truncate">
                      {doc.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
