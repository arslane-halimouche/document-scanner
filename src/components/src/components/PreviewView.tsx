import { useState } from "react";
import {
  Download,
  Save,
  RotateCcw,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Button } from "./ui/Button";
import type { ScannedDocument } from "../types";

interface PreviewViewProps {
  document: ScannedDocument;
  onSave: (doc: ScannedDocument) => void;
  onRetry: () => void;
}

export function PreviewView({ document, onSave, onRetry }: PreviewViewProps) {
  const [name, setName] = useState(document.name);
  const [saved, setSaved] = useState(false);

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.processedDataUrl;
    link.download = `${name || "document"}.jpg`;
    link.click();
  };

  const handleSave = () => {
    onSave({ ...document, name });
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-primary" />
        <h2 className="text-base font-bold text-slate-800">Aperçu du scan</h2>
      </div>

      {/* Image preview */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-white">
        <img
          src={document.processedDataUrl}
          alt="Document numérisé"
          className="w-full object-contain max-h-[420px]"
        />
      </div>

      {/* Comparaison originale */}
      <details className="text-xs text-slate-400 cursor-pointer">
        <summary className="select-none hover:text-slate-600 transition-colors">
          Voir l'image originale
        </summary>
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-100">
          <img
            src={document.originalDataUrl}
            alt="Original"
            className="w-full object-contain max-h-64"
          />
        </div>
      </details>

      {/* Nom du fichier */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Nom du document
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-primary transition-colors bg-white"
          placeholder="Nom du fichier…"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button onClick={handleDownload} size="lg" fullWidth>
          <Download size={18} />
          Télécharger le document
        </Button>

        <Button
          onClick={handleSave}
          variant={saved ? "ghost" : "secondary"}
          size="lg"
          fullWidth
          disabled={saved}
        >
          {saved ? (
            <>
              <CheckCircle size={18} className="text-green-500" />
              <span className="text-green-600">Sauvegardé dans l'historique</span>
            </>
          ) : (
            <>
              <Save size={18} />
              Sauvegarder dans l'historique
            </>
          )}
        </Button>

        <Button onClick={onRetry} variant="ghost" size="md" fullWidth>
          <RotateCcw size={16} />
          Nouveau scan
        </Button>
      </div>
    </div>
  );
}
