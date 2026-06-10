import { Trash2, Download, FileText, Clock, Inbox } from "lucide-react";
import type { ScannedDocument } from "../types";

interface HistoryViewProps {
  documents: ScannedDocument[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryView({
  documents,
  onDelete,
  onClearAll,
}: HistoryViewProps) {
  const handleDownload = (doc: ScannedDocument) => {
    const link = window.document.createElement("a");
    link.href = doc.processedDataUrl;
    link.download = `${doc.name}.jpg`;
    link.click();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-[#0D1A35] border border-[#1E2D4D] flex items-center justify-center">
          <Inbox size={36} className="text-slate-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-400">
            Ningún documento escaneado
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sus documentos digitalizados aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#4F8EF7]" />
          <h2 className="text-sm font-bold text-white">
            Historial ({documents.length})
          </h2>
        </div>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all border border-red-500/20"
        >
          <Trash2 size={12} />
          Borrar todo
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-[#0D1A35] rounded-2xl border border-[#1E2D4D] overflow-hidden flex"
          >
            <div className="w-20 flex-shrink-0 bg-[#0A1428]">
              <img
                src={doc.processedDataUrl}
                alt={doc.name}
                className="w-full h-full object-cover"
                style={{ minHeight: "80px" }}
              />
            </div>
            <div className="flex-1 px-3 py-3 flex flex-col justify-between min-w-0">
              <div className="flex items-start gap-2">
                <FileText
                  size={13}
                  className="text-[#4F8EF7] mt-0.5 flex-shrink-0"
                />
                <p className="text-sm font-semibold text-white truncate">
                  {doc.name}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formatDate(doc.createdAt)}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1 text-xs text-[#4F8EF7] font-semibold hover:text-blue-300 transition-colors"
                >
                  <Download size={11} />
                  Descargar
                </button>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="flex items-center gap-1 text-xs text-red-400 font-semibold hover:text-red-300 transition-colors"
                >
                  <Trash2 size={11} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
