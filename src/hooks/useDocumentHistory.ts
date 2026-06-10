import { useState, useEffect } from "react";
import type { ScannedDocument } from "../types";

const STORAGE_KEY = "doc_scanner_history";

export function useDocumentHistory() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDocuments(JSON.parse(raw));
    } catch {
      setDocuments([]);
    }
  }, []);

  const saveDocument = (doc: ScannedDocument) => {
    setDocuments((prev) => {
      const updated = [doc, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage plein : on retire les plus anciens
        const trimmed = updated.slice(0, 20);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        return trimmed;
      }
      return updated;
    });
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDocuments([]);
  };

  return { documents, saveDocument, deleteDocument, clearAll };
}
