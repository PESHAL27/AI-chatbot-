import React, { useState, useEffect, useRef } from 'react';
import type { DocumentItem } from '../types/pml';
import { pmlApi } from '../services/pmlApi';

interface DocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem | null) => void;
  onUploadSuccess?: (doc: DocumentItem) => void;
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  selectedDocumentId,
  onSelectDocument,
  onUploadSuccess
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await pmlApi.fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.warn('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validExts = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExts.includes(ext)) {
      setUploadError(`Unsupported file format '${ext}'. Please upload PDF, DOCX, or TXT.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds the 25MB maximum limit.');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const newDoc = await pmlApi.uploadDocument(file);
      setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
      if (onUploadSuccess) {
        onUploadSuccess(newDoc);
      }

      // Poll for processing status
      pollDocumentStatus(newDoc.id);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pollDocumentStatus = (docId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const updated = await pmlApi.getDocument(docId);
      if (updated) {
        setDocuments(prev => prev.map(d => (d.id === docId ? updated : d)));
        if (updated.status === 'ready' || updated.status === 'failed' || attempts > 15) {
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 1500);
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document and purge all its vector chunks from PML?')) {
      return;
    }

    try {
      await pmlApi.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDocumentId === docId) {
        onSelectDocument(null);
      }
    } catch (err) {
      console.warn('Error deleting document:', err);
    }
  };

  const handleRetry = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const retried = await pmlApi.retryDocument(docId);
      if (retried) {
        setDocuments(prev => prev.map(d => (d.id === docId ? retried : d)));
        pollDocumentStatus(docId);
      }
    } catch (err) {
      console.warn('Error retrying document:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    const ft = fileType.toLowerCase();
    if (ft.includes('pdf')) return '📕';
    if (ft.includes('doc')) return '📘';
    if (ft.includes('txt') || ft.includes('md')) return '📄';
    if (ft.includes('csv')) return '📊';
    return '📑';
  };

  const filteredDocs = documents.filter(d =>
    d.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-3xl rounded-2xl border border-violet-500/30 bg-[#0f0b1f]/95 text-white shadow-2xl shadow-violet-950/60 flex flex-col max-h-[90vh] overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with glowing cosmic tab style */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-violet-500/20 bg-gradient-to-r from-violet-900/30 via-purple-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              📚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-purple-100 to-indigo-200">
                  Document Intelligence & RAG
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded-full">
                  Phase 7
                </span>
              </div>
              <p className="text-xs text-violet-300/70 mt-0.5">
                Upload PDFs, DOCX, and text notes. PML extracts text, creates vector embeddings, and answers grounded questions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-violet-400 hover:text-white hover:bg-violet-500/20 transition-all"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Upload Zone / Dropzone */}
        <div className="p-6 pb-4 border-b border-violet-500/15 bg-violet-950/20">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed transition-all p-5 flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-violet-400 bg-violet-600/20 shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-[0.99]'
                : 'border-violet-500/30 bg-violet-900/10 hover:border-violet-400/60 hover:bg-violet-800/15'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".pdf,.docx,.doc,.txt,.md,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-2xl mb-2 text-violet-300">
              {uploading ? '⏳' : '⬆️'}
            </div>
            <div className="text-sm font-semibold text-violet-200">
              {uploading ? 'Uploading and parsing document...' : 'Click to Upload or Drag & Drop Document'}
            </div>
            <div className="text-xs text-violet-400/80 mt-1 flex items-center gap-2">
              <span>Supported: PDF, DOCX, TXT</span>
              <span>•</span>
              <span>Max 25MB</span>
            </div>
          </div>

          {uploadError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
            </div>
          )}
        </div>

        {/* Search and Scope Filter Bar */}
        <div className="px-6 py-3 flex items-center justify-between gap-3 border-b border-violet-500/15 bg-[#140e2b]">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search uploaded documents..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-100 placeholder-violet-400/50 focus:outline-none focus:border-violet-400"
            />
            <span className="absolute left-3 top-2 text-xs text-violet-400">🔍</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedDocumentId ? (
              <button
                onClick={() => onSelectDocument(null)}
                className="px-3 py-1.5 text-xs rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 transition-all flex items-center gap-1.5"
                title="Search all documents"
              >
                <span>Scope: Selected Doc</span>
                <span className="text-violet-400 hover:text-white font-bold">✕ Reset</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg bg-violet-900/30 border border-violet-500/20 text-violet-300/80">
                Scope: All Documents
              </span>
            )}
            <button
              onClick={loadDocuments}
              className="p-1.5 text-xs rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-300 hover:text-white hover:bg-violet-800/30 transition-all"
              title="Refresh Document List"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-violet-400 gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
              <span className="text-xs">Loading document library...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-violet-400/70">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm font-semibold text-violet-200">No documents uploaded yet</div>
              <p className="text-xs text-violet-400/70 max-w-sm mt-1">
                Upload your course notes, assignment PDFs, or project specifications. PML will parse and index them for grounded AI reasoning.
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => {
              const isSelected = selectedDocumentId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(isSelected ? null : doc)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-violet-400 bg-violet-600/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                      : 'border-violet-500/20 bg-violet-950/30 hover:border-violet-500/40 hover:bg-violet-900/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">{getFileIcon(doc.file_type)}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-violet-100">{doc.file_name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/50">
                            Active Scope
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-violet-400/70 mt-1 flex-wrap">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.file_type.toUpperCase()}</span>
                        {doc.chunk_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-violet-300">{doc.chunk_count} chunks indexed</span>
                          </>
                        )}
                      </div>

                      {doc.error_message && (
                        <div className="text-[11px] text-rose-300 mt-1">
                          Error: {doc.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Status Badge */}
                    {doc.status === 'ready' && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                        <span>✓</span> Ready
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        Processing...
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                          Failed
                        </span>
                        <button
                          onClick={e => handleRetry(doc.id, e)}
                          className="px-2 py-1 text-xs rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200"
                          title="Retry processing"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Ask Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectDocument(doc);
                        onClose();
                      }}
                      className="px-3 py-1 text-xs rounded-lg bg-violet-600/40 hover:bg-violet-600 border border-violet-400/40 text-violet-100 hover:text-white transition-all shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                      title="Ask question about this document"
                    >
                      💬 Ask PML
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={e => handleDelete(doc.id, e)}
                      className="p-1.5 text-xs rounded-lg text-violet-400/70 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-purple-950/30 to-violet-950/40 flex items-center justify-between text-xs text-violet-400/80">
          <div>
            Total Documents: <strong className="text-violet-200">{documents.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
