import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  ArrowDown, 
  ArrowUp, 
  Edit3, 
  Sparkles, 
  BookOpen, 
  FileText,
  RefreshCw,
  Plus
} from 'lucide-react';
import writingAssistantApi from '../../services/writingAssistantApi';
import editorBridge from '../../services/editorBridge';

export default function WritingAssistant({ projectId, isDark, projectDocumentType, onDocumentTypeChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [insertedId, setInsertedId] = useState(null);
  const [docType, setDocType] = useState(projectDocumentType || 'Research Thesis');

  // For visual context indicators
  const [hasSelection, setHasSelection] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('');

  const chatEndRef = useRef(null);

  // Poll for context updates (like selection or heading changes)
  useEffect(() => {
    const checkContext = () => {
      if (editorBridge.isRegistered()) {
        setHasSelection(!!editorBridge.getSelection());
        setCurrentHeading(editorBridge.getCurrentHeading());
      }
    };
    const interval = setInterval(checkContext, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync document type with project state
  useEffect(() => {
    if (projectDocumentType) {
      setDocType(projectDocumentType);
    }
  }, [projectDocumentType]);

  // Load chat history on mount or project switch
  useEffect(() => {
    if (projectId) {
      loadHistory();
    }
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const history = await writingAssistantApi.getHistory(projectId);
      setMessages(history);
    } catch (err) {
      console.error("Failed to load assistant history:", err);
    }
  };

  const handleDocTypeChange = async (newType) => {
    setDocType(newType);
    if (onDocumentTypeChange) {
      onDocumentTypeChange(newType);
    }
    try {
      await writingAssistantApi.updateDocumentType(projectId, newType);
    } catch (err) {
      console.error("Failed to update project document type:", err);
    }
  };

  const handleSend = async (customPrompt = null) => {
    const promptText = customPrompt || input;
    if (!promptText.trim() || isLoading) return;

    if (!customPrompt) setInput('');
    setIsLoading(true);

    // Get current context from Editor Bridge
    const selected_text = editorBridge.getSelection();
    const cursor_paragraph = editorBridge.getCursor();
    const current_heading = editorBridge.getCurrentHeading();
    const draft_content = editorBridge.getDocument();

    // Optimistically add user message
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: promptText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await writingAssistantApi.sendMessage(projectId, {
        prompt: promptText,
        selected_text,
        cursor_paragraph,
        current_heading,
        draft_content
      });

      if (result.success) {
        setMessages(result.chat_history);
      }
    } catch (err) {
      console.error("Failed to call writing assistant:", err);
      setMessages(prev => [
        ...prev, 
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "Failed to connect to the writing assistant. Please ensure Ollama (phi3:mini) is running locally.",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your AI writing assistant conversation history for this project?")) return;
    try {
      await writingAssistantApi.clearHistory(projectId);
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  const executeAction = (actionType, content, msgId) => {
    if (!editorBridge.isRegistered()) {
      alert("No active editor canvas loaded. Please make sure the editor is open.");
      return;
    }

    // Wrap output in clean paragraph HTML tag structure if it doesn't have it
    let formattedContent = content;
    if (!formattedContent.trim().startsWith('<')) {
      formattedContent = formattedContent.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }

    switch (actionType) {
      case 'insert':
        editorBridge.insertContent(formattedContent);
        break;
      case 'replace':
        editorBridge.replaceSelection(formattedContent);
        break;
      case 'above':
        editorBridge.appendAbove(formattedContent);
        break;
      case 'below':
        editorBridge.appendBelow(formattedContent);
        break;
      default:
        break;
    }

    setInsertedId(msgId);
    setTimeout(() => setInsertedId(null), 2000);
  };

  const handleCopy = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const docTypesList = [
    "Research Thesis",
    "Research Proposal",
    "PRD",
    "BRD",
    "SRS",
    "Technical Design Document",
    "Whitepaper",
    "Patent Draft",
    "Grant Proposal",
    "Meeting Notes",
    "Documentation"
  ];

  const quickActions = [
    { label: "Improve Academic Tone", prompt: "Improve the academic tone of my selected text or the current section." },
    { label: "Continue Writing", prompt: "Based on the draft context, continue writing the next paragraph naturally." },
    { label: "Explain Context", prompt: "Explain the details and context of my selected text or the current section." },
    { label: "Suggest Key Takeaways", prompt: "Summarize this section into a few bullet points highlighting key takeaways." }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r dark:border-pastel-darkBorder">
      
      {/* Top Config Header */}
      <div className="p-4 border-b dark:border-zinc-800 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-pastel-accent flex items-center space-x-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-pastel-accent" />
            <span>AI Writing Assistant</span>
          </span>
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
            title="Reset Chat & Clear Conversation History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Document Type Dropdown Selector */}
        <div>
          <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Document Format Type</label>
          <select
            value={docType}
            onChange={(e) => handleDocTypeChange(e.target.value)}
            className="w-full text-xs font-bold py-1.5 px-3 rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-pastel-darkBorder text-gray-700 dark:text-gray-250 focus:outline-none"
          >
            {docTypesList.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Context Status indicators */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
            hasSelection 
              ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 text-indigo-400' 
              : 'bg-gray-50 border-gray-150 text-gray-400 dark:bg-slate-800/30 dark:border-zinc-800'
          }`}>
            {hasSelection ? "✓ Selection Active" : "No Selection"}
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all truncate max-w-[150px] ${
            currentHeading 
              ? 'bg-emerald-50 border-emerald-150 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-400' 
              : 'bg-gray-50 border-gray-150 text-gray-400 dark:bg-slate-800/30 dark:border-zinc-800'
          }`} title={currentHeading}>
            {currentHeading ? `Section: ${currentHeading}` : "No Section Head"}
          </span>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Sparkles className="w-10 h-10 text-indigo-400 mb-3 animate-bounce" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Collaborative Writing Partner</h4>
            <p className="text-[11px] leading-relaxed max-w-[200px]">
              Type a prompt or select text in the editor and click quick actions to draft sections together.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col space-y-1.5 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Bubble */}
              <div 
                className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-pastel-accent text-white font-medium rounded-tr-none' 
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 border dark:border-pastel-darkBorder rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {/* Action Buttons for AI Responses */}
              {msg.role === 'assistant' && (
                <div className="flex items-center space-x-1 pl-1 text-[10px] font-bold text-gray-400">
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="p-1 hover:text-indigo-650 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center space-x-1"
                    title="Copy response text"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() => executeAction('insert', msg.content, msg.id)}
                    className="p-1 hover:text-indigo-650 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center space-x-0.5"
                    title="Insert response at cursor location"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() => executeAction('replace', msg.content, msg.id)}
                    className="p-1 hover:text-indigo-650 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center space-x-0.5"
                    title="Replace selected text with response"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Replace</span>
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() => executeAction('below', msg.content, msg.id)}
                    className="p-1 hover:text-indigo-650 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center space-x-0.5"
                    title="Append response below current paragraph"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>Below</span>
                  </button>

                  {insertedId === msg.id && (
                    <span className="text-emerald-500 ml-1 font-semibold">Applied!</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Actions list */}
      <div className="px-4 py-2 border-t dark:border-zinc-800 bg-gray-50/50 dark:bg-slate-900/30">
        <div className="flex overflow-x-auto gap-1.5 py-1 scrollbar-thin scrollbar-thumb-gray-200">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSend(action.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-pastel-darkBorder bg-white dark:bg-slate-800 text-gray-650 dark:text-gray-300 hover:border-pastel-accent dark:hover:border-pastel-accent transition-all shadow-sm flex items-center space-x-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-pastel-accent" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Panel */}
      <div className="p-4 border-t dark:border-zinc-800">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              hasSelection 
                ? "Instruct AI on the selected text..." 
                : "Ask AI to generate content..."
            }
            className="flex-1 px-3.5 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-700 dark:text-gray-250 focus:outline-none focus:border-pastel-accent bg-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-pastel-accent text-white rounded-xl hover:bg-pastel-accent/90 disabled:opacity-30 transition-all flex items-center justify-center shadow"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
