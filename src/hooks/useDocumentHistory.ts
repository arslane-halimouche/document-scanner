import { useState, useEffect, useCallback } from 'react';
import type { ScannedDocument } from '../types';
import { modelApi } from '../services/modelApi';
import { getConfig } from '../config';

const MODEL = 'scanned-documents';
const LOCAL_KEY = 'doc_scanner_history';

export function useDocumentHistory() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const config = getConfig();

  // Charger les documents au démarrage
  useEffect(() => {
    if (config.syncEnabled) {
      // Charger depuis ConsulPoint
      setLoading(true);
      modelApi.list<ScannedDocument>(MODEL, 50)
        .then(({ docs }) => {
          setDocuments(docs.map(d => ({ ...d, id: d._id ?? d.id })));
        })
        .catch(() => {
          // Fallback localStorage
          loadFromLocal();
        })
        .finally(() => setLoading(false));
    } else {
      loadFromLocal();
    }
  }, [config.syncEnabled]);

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setDocuments(JSON.parse(raw));
    } catch {
      setDocuments([]);
    }
  }

  function saveToLocal(docs: ScannedDocument[]) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(docs.slice(0, 20)));
    } catch {}
  }

  const saveDocument = useCallback(async (doc: ScannedDocument) => {
    if (config.syncEnabled) {
      try {
        const saved = await modelApi.create<ScannedDocument>(MODEL, {
          name: doc.name,
          filterMode: doc.filterMode ?? 'color',
          dataUrl: doc.processedDataUrl,
          source: doc.source ?? 'file',
          createdAt: doc.createdAt,
          updatedAt: new Date().toISOString(),
        } as Omit<ScannedDocument, '_id' | '_rev'>);

        const newDoc = { ...doc, _id: saved._id, _rev: saved._rev, savedToCloud: true };
        setDocuments(prev => [newDoc, ...prev]);
        return;
      } catch (err) {
        console.error('Error saving to ConsulPoint:', err);
      }
    }

    // Fallback localStorage
    setDocuments(prev => {
      const updated = [doc, ...prev];
      saveToLocal(updated);
      return updated;
    });
  }, [config.syncEnabled]);

  const deleteDocument = useCallback(async (id: string) => {
    const doc = documents.find(d => d._id === id || d.id === id);

    if (config.syncEnabled && doc?._id && doc?._rev) {
      try {
        await modelApi.remove(MODEL, doc._id, doc._rev);
      } catch (err) {
        console.error('Error deleting from ConsulPoint:', err);
      }
    }

    setDocuments(prev => {
      const updated = prev.filter(d => d._id !== id && d.id !== id);
      saveToLocal(updated);
      return updated;
    });
  }, [config.syncEnabled, documents]);

  const clearAll = useCallback(async () => {
    if (config.syncEnabled) {
      for (const doc of documents) {
        if (doc._id && doc._rev) {
          try {
            await modelApi.remove(MODEL, doc._id, doc._rev);
          } catch {}
        }
      }
    }
    localStorage.removeItem(LOCAL_KEY);
    setDocuments([]);
  }, [config.syncEnabled, documents]);

  return { documents, saveDocument, deleteDocument, clearAll, loading };
}