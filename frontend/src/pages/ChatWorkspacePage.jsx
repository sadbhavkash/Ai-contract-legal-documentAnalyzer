import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { Loader2, Send, Bot, User, FileText, AlertTriangle, List, AlignLeft, Info, ChevronDown, BookOpen } from 'lucide-react';
import { FormattedAnalysis } from '../utils/formatters';

/**
 * Trim an excerpt to a clean sentence or word boundary.
 * If the text already ends at a sentence boundary, return it as-is.
 * Otherwise shorten to `maxLen` at the nearest word boundary and append "…".
 */
function smartExcerpt(text, maxLen = 280) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;

  // Try to cut at the last sentence-ending punctuation within maxLen
  const region = trimmed.slice(0, maxLen);
  const sentenceEnd = Math.max(
    region.lastIndexOf('. '),
    region.lastIndexOf('.\n'),
    region.lastIndexOf('? '),
    region.lastIndexOf('! '),
  );
  if (sentenceEnd > maxLen * 0.4) {
    return trimmed.slice(0, sentenceEnd + 1);
  }

  // Fall back to word boundary
  const wordEnd = region.lastIndexOf(' ');
  if (wordEnd > maxLen * 0.4) {
    return trimmed.slice(0, wordEnd) + '…';
  }

  return region + '…';
}

function SourcesSection({ sources }) {
  const [open, setOpen] = useState(false);

  // Guard against null / undefined / empty / non-array
  if (!Array.isArray(sources) || sources.length === 0) return null;

  // Filter out sources that have no usable text
  const validSources = sources.filter(
    (s) => s && typeof s === 'object' && s.text && typeof s.text === 'string' && s.text.trim()
  );
  if (validSources.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 -ml-1"
        aria-expanded={open}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Sources ({validSources.length})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {validSources.map((s, i) => {
            const fullText = s.text.trim();
            const excerpt = smartExcerpt(fullText);
            const wasTruncated = excerpt.length < fullText.length;

            return (
              <div key={s.chunk_id ?? i} className="text-xs bg-slate-50 rounded-lg border border-slate-100 px-3 py-2.5">
                {/* Header: chunk identifier */}
                {s.chunk_index != null && (
                  <p className="font-semibold text-slate-600 mb-1">
                    Chunk {s.chunk_index}
                  </p>
                )}
                {/* Excerpt */}
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {excerpt}
                  {wasTruncated && (
                    <ExpandToggle fullText={fullText} excerpt={excerpt} />
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandToggle({ fullText, excerpt }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <>
        {/* Replace the excerpt with full text rendered by the parent — 
            we use a trick: render the rest of the text after the excerpt */}
        {fullText.slice(excerpt.replace(/…$/, '').length)}
        <button
          onClick={() => setExpanded(false)}
          className="ml-1 text-indigo-600 hover:text-indigo-800 font-medium"
        >
          show less
        </button>
      </>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="ml-1 text-indigo-600 hover:text-indigo-800 font-medium"
    >
      show more
    </button>
  );
}
export default function ChatWorkspacePage() {
  const { id: chatId } = useParams();
  
  const [chat, setChat] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [loadingChat, setLoadingChat] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  
  const [activeTab, setActiveTab] = useState('analysis'); // mobile only
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAsking]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      setLoadingChat(true);
      setLoadingAnalysis(true);
      setLoadingMessages(true);
      
      try {
        // 1. Fetch Chat details
        const chatRes = await api.get(`/chats/${chatId}`);
        setChat(chatRes.data);
        
        // 2. Fetch Chat messages
        const msgRes = await api.get(`/chats/${chatId}/messages`);
        setMessages(msgRes.data || []);
        setLoadingMessages(false);
        
        // 3. Fetch/Generate Analysis
        if (chatRes.data?.document_id) {
          try {
            const analysisRes = await api.post(`/documents/${chatRes.data.document_id}/analyze`);
            setAnalysis(analysisRes.data);
          } catch (err) {
            console.error("Failed to load analysis", err);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace", err);
      } finally {
        setLoadingChat(false);
        setLoadingAnalysis(false);
      }
    };
    
    fetchWorkspace();
  }, [chatId]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;
    
    const currentQ = question;
    setQuestion('');
    
    // Optimistic UI update
    const tempMsg = {
      id: Date.now(),
      question: currentQ,
      answer: '',
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setIsAsking(true);
    
    try {
      const res = await api.get(`/chats/${chatId}/ask`, {
        params: { question: currentQ }
      });
      
      // Replace optimistic message with real response
      setMessages(prev => 
        prev.map(m => m.id === tempMsg.id ? {
          id: res.data.chat_message_id || Date.now(),
          question: res.data.question || currentQ,
          answer: res.data.answer,
          sources: res.data.sources
        } : m)
      );
    } catch (err) {
      console.error(err);
      // Update optimistic message with error
      setMessages(prev => 
        prev.map(m => m.id === tempMsg.id ? {
          ...m,
          answer: 'Sorry, I encountered an error while analyzing the document. Please try again.',
          isError: true
        } : m)
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk(e);
    }
  };

  if (loadingChat) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <FileText className="w-12 h-12 mb-4 text-slate-300" />
        <p>Chat not found or access denied.</p>
      </div>
    );
  }

  // Mobile Tabs Header
  const MobileTabs = () => (
    <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0">
      <button 
        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        onClick={() => setActiveTab('analysis')}
      >
        Analysis
      </button>
      <button 
        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'chat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        onClick={() => setActiveTab('chat')}
      >
        Q&A Chat
      </button>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-slate-50 overflow-hidden">
      <MobileTabs />
      
      {/* LEFT PANE: Analysis */}
      <div className={`w-full lg:w-1/2 xl:w-7/12 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden ${activeTab === 'analysis' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-4 md:p-6 border-b border-slate-100 shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{chat.title}</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Analyzed on {new Date(chat.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8">
          {loadingAnalysis ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-sm">Fetching document analysis...</p>
            </div>
          ) : !analysis ? (
            <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-100">
              No analysis data available.
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                  <AlignLeft className="w-5 h-5 text-indigo-500" />
                  Executive Summary
                </h2>
                <FormattedAnalysis content={analysis.summary} type="summary" />
              </section>

              {/* Key Clauses Section */}
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                  <List className="w-5 h-5 text-emerald-500" />
                  Key Clauses & Obligations
                </h2>
                <FormattedAnalysis content={analysis.key_clauses} type="clauses" />
              </section>

              {/* Risks Section */}
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Risk Analysis
                </h2>
                <FormattedAnalysis content={analysis.risks} type="risks" />
              </section>
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat Q&A */}
      <div className={`w-full lg:w-1/2 xl:w-5/12 flex flex-col h-full bg-slate-50 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {loadingMessages ? (
             <div className="flex justify-center p-4">
               <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
             </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1">AI Assistant Ready</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Ask questions about this document. I'll search the contract and provide cited answers.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <button 
                  onClick={() => setQuestion("What is the termination notice period?")}
                  className="text-xs md:text-sm bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-full hover:bg-slate-50 transition-colors text-left truncate"
                >
                  "What is the termination notice period?"
                </button>
                <button 
                  onClick={() => setQuestion("Are there any non-compete clauses?")}
                  className="text-xs md:text-sm bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-full hover:bg-slate-50 transition-colors text-left truncate"
                >
                  "Are there any non-compete clauses?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className="flex flex-col space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-sm whitespace-pre-wrap">
                    {msg.question}
                  </div>
                </div>
                
                {/* AI Message */}
                <div className="flex justify-start">
                  <div className="flex items-end gap-2 max-w-[90%]">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mb-1">
                      <Bot className="w-4 h-4 text-indigo-700" />
                    </div>
                    <div className={`bg-white border text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm whitespace-pre-wrap ${msg.isError ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                      {msg.isOptimistic ? (
                        <div className="flex items-center gap-2 text-slate-500 h-5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                      ) : (
                        <>
                          {msg.answer}
                          <SourcesSection sources={msg.sources} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleAsk} className="relative max-w-4xl mx-auto">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this contract..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-14 md:h-16 text-sm"
              disabled={isAsking}
              rows={1}
            />
            <button
              type="submit"
              disabled={!question.trim() || isAsking}
              className="absolute right-2 top-2 bottom-2 md:top-2.5 md:bottom-2.5 w-10 md:w-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
          <p className="text-center text-[10px] md:text-xs text-slate-400 mt-2">
            AI analysis can make mistakes. Always review critical legal matters with a qualified professional.
          </p>
        </div>
      </div>
    </div>
  );
}
