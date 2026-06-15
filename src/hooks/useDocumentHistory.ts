import { useState, useEffect } from 'react';
import type { ScannedDocument } from '../types';

export function useDocumentHistory(storageKey: string) {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDocuments(JSON.parse(raw) as ScannedDocument[]);
    } catch {
      setDocuments([]);
    }
  }, [storageKey]);

  const saveDocument = (doc: ScannedDocument) => {
    setDocuments((prev) => {
      const updated = [doc, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        const trimmed = updated.slice(0, 20);
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
        return trimmed;
      }
      return updated;
    });
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    localStorage.removeItem(storageKey);
    setDocuments([]);
  };

  return { documents, saveDocument, deleteDocument, clearAll };
}