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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#071208] border border-[rgba(180,255,100,0.25)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0f2412] border border-[rgba(180,255,100,0.3)] flex items-center justify-center text-[#9CFF45]">
              <span className="text-xl">📄</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Document Intelligence & RAG Library</h2>
              <p className="text-xs text-[#A8B0A5]">Upload PDFs, DOCX, or text notes for semantic vector reasoning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A8B0A5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Upload Zone / Dropzone */}
        <div className="p-6 pb-4 border-b border-white/5 bg-[#0a180b]/60">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-5 flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-[#9CFF45] bg-[#122814] shadow-[0_0_20px_rgba(156,255,69,0.3)] scale-[0.99]'
                : 'border-[rgba(180,255,100,0.2)] bg-[#071208]/60 hover:border-[rgba(180,255,100,0.45)] hover:bg-[#0f2412]/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              accept=".pdf,.docx,.doc,.txt,.md,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#122814] border border-[rgba(180,255,100,0.3)] flex items-center justify-center text-2xl mb-2 text-[#9CFF45]">
              {uploading ? '⏳' : '⬆️'}
            </div>
            <div className="text-sm font-semibold text-white">
              {uploading ? 'Uploading and parsing document...' : 'Click to Upload or Drag & Drop Document'}
            </div>
            <div className="text-xs text-[#A8B0A5] mt-1 flex items-center gap-2">
              <span>Supported: PDF, DOCX, TXT</span>
              <span>•</span>
              <span>Max 25MB</span>
            </div>
          </div>

          {uploadError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">✕</button>
            </div>
          )}
        </div>

        {/* Search and Scope Filter Bar */}
        <div className="px-6 py-3 flex items-center justify-between gap-3 border-b border-white/5 bg-[#050c06]">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search uploaded documents..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-[#0c180d] border border-[rgba(180,255,100,0.2)] text-white placeholder-[#758072] focus:outline-none focus:border-[#9CFF45]"
            />
            <span className="absolute left-3 top-2 text-xs text-[#9CFF45]">🔍</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedDocumentId ? (
              <button
                onClick={() => onSelectDocument(null)}
                className="px-3 py-1.5 text-xs rounded-xl bg-[#122814] border border-[#9CFF45]/40 text-[#9CFF45] hover:bg-[#153218] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Search all documents"
              >
                <span>Scope: Selected Doc</span>
                <span className="text-white font-bold">✕ Reset</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-[#A8B0A5]">
                Scope: All Documents
              </span>
            )}
            <button
              onClick={loadDocuments}
              className="p-1.5 text-xs rounded-xl bg-[#0c180d] border border-white/10 text-[#A8B0A5] hover:text-white transition-all cursor-pointer"
              title="Refresh Document List"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#9CFF45] gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#9CFF45] border-t-transparent animate-spin"></div>
              <span className="text-xs text-[#A8B0A5]">Loading document library...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#A8B0A5]">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-sm font-semibold text-white">No documents uploaded yet</div>
              <p className="text-xs text-[#A8B0A5] max-w-sm mt-1">
                Upload notes, assignment PDFs, or project specifications. PML will parse and index them for grounded AI reasoning.
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => {
              const isSelected = selectedDocumentId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(isSelected ? null : doc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#9CFF45] bg-[#122814] shadow-[0_0_15px_rgba(156,255,69,0.2)]'
                      : 'border-white/10 bg-[#0a180b]/60 hover:border-[rgba(180,255,100,0.3)] hover:bg-[#0f2412]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">{getFileIcon(doc.file_type)}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white">{doc.file_name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#9CFF45] text-[#050805]">
                            Active Scope
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#A8B0A5] mt-1 flex-wrap">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.file_type.toUpperCase()}</span>
                        {doc.chunk_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#9CFF45]">{doc.chunk_count} chunks indexed</span>
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
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#122814] border border-[#9CFF45]/40 text-[#9CFF45] flex items-center gap-1">
                        <span>✓</span> Ready
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
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
                          className="px-2 py-1 text-xs rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 cursor-pointer"
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
                      className="px-3 py-1 text-xs rounded-lg bg-[#9CFF45] hover:bg-[#85e03b] text-[#050805] font-bold transition-all cursor-pointer"
                      title="Ask question about this document"
                    >
                      💬 Ask PML
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={e => handleDelete(doc.id, e)}
                      className="p-1.5 text-xs rounded-xl text-[#A8B0A5] hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
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
        <div className="px-6 py-4 border-t border-white/10 bg-[#050c06] flex items-center justify-between text-xs text-[#A8B0A5]">
          <div>
            Total Documents: <strong className="text-white">{documents.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="btn-lime px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shadow-[0_0_15px_rgba(156,255,69,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
