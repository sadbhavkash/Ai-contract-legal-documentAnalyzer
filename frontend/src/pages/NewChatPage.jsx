import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { UploadCloud, FileText, X, Loader2, AlertCircle } from 'lucide-react';

export default function NewChatPage() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.docx')) {
      setError('Please upload a PDF or DOCX file.');
      return;
    }
    
    // Automatically set title if empty
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension
    }
    
    setFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for this analysis.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);

      const res = await api.post('/chats/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Navigate to new chat workspace
      navigate(`/chat/${res.data.chat_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process document. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Analysis</h1>
        <p className="text-slate-600 mt-1">Upload a legal document to extract insights, summarize terms, and identify risks.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col h-full">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200 flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Analysis Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="e.g. Acme Corp NDA"
              className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="mb-8 flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Document (PDF or DOCX)</label>
            
            {!file ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center h-48 transition-colors ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                } ${loading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-900 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500">PDF or DOCX up to 10MB</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                {!loading && (
                  <button 
                    type="button" 
                    onClick={clearFile}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 pt-6 mt-auto">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 mr-4 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || !title.trim()}
              className="inline-flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Analyze Document'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating embeddings and initial analysis. This may take up to a minute...
          </p>
        </div>
      )}
    </div>
  );
}
