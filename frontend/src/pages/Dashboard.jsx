import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../utils/api';
import { 
  Plus,
  FileText, 
  Users, 
  Clock, 
  Terminal, 
  Upload, 
  BookOpen, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Folder,
  FolderPlus,
  ArrowLeft,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Save,
  Loader2,
  Search,
  Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Projects list state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [creatingProject, setCreatingProject] = useState(false);

  // Project Workspace tab state
  const [workspaceTab, setWorkspaceTab] = useState('editor'); // 'editor' | 'papers' | 'chat'

  // Draft Editor state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const editorRef = useRef(null);

  // Stored Papers state for selected project
  const [papers, setPapers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Preparing document...");
  const [metadataError, setMetadataError] = useState('');
  const [paperText, setPaperText] = useState('');
  const [paperForm, setPaperForm] = useState({
    title: '',
    author: '',
    domain: '',
    keywords: '',
    abstract: '',
    summary: ''
  });

  // View PDF & Modal states
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Chatbot states
  // 1. PDF Modal chatbot
  const [modalQuestion, setModalQuestion] = useState('');
  const [modalChatHistory, setModalChatHistory] = useState([]);
  const [modalChatLoading, setModalChatLoading] = useState(false);

  // 2. Project Workspace Chat tab
  const [selectedChatPaper, setSelectedChatPaper] = useState(null);
  const [tabQuestion, setTabQuestion] = useState('');
  const [tabChatHistory, setTabChatHistory] = useState([]);
  const [tabChatLoading, setTabChatLoading] = useState(false);

  // Audit and sessions state
  const [sessionsCount, setSessionsCount] = useState(1);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Projects list
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch active session count
  const fetchActiveSessionsCount = async () => {
    try {
      const response = await api.get('/api/auth/sessions');
      setSessionsCount(response.data.filter(s => s.is_active).length);
    } catch (err) {
      console.error("Failed to load sessions count:", err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchProjects();
    fetchActiveSessionsCount();
    
    // Check dark mode
    const systemTheme = localStorage.getItem('theme');
    if (systemTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, [navigate]);

  useEffect(() => {
    if (activeSection === 'audit') {
      fetchAuditLogs();
    } else if (activeSection === 'dashboard') {
      fetchProjects();
    }
  }, [activeSection]);

  // Reset workspace selection when switching views
  useEffect(() => {
    if (activeSection !== 'dashboard') {
      setSelectedProject(null);
    }
  }, [activeSection]);

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logsResponse = await api.get('/api/auth/audit-logs');
      setAuditLogs(logsResponse.data);
      
      const sessionsResponse = await api.get('/api/auth/sessions');
      const currentToken = localStorage.getItem('session_token');
      
      const mappedSessions = sessionsResponse.data.map(session => ({
        id: session.id,
        device: session.user_agent || 'Chrome / Windows',
        ip: session.ip_address || '127.0.0.1',
        date: new Date(session.created_at).toLocaleDateString(),
        isCurrent: session.session_token === currentToken
      }));
      
      setActiveSessions(mappedSessions);
    } catch (err) {
      console.error("Failed to load audit logs or sessions:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.delete(`/api/auth/sessions/${sessionId}`);
      fetchAuditLogs();
    } catch (err) {
      console.error("Failed to revoke active session:", err);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- Projects Operations ---

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) return;
    setCreatingProject(true);
    try {
      const response = await api.post('/api/projects', newProject);
      setProjects([response.data, ...projects]);
      setNewProject({ title: '', description: '' });
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project? All associated drafts and reference papers will be permanently deleted.")) return;
    try {
      await api.delete(`/api/projects/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setWorkspaceTab('editor');
    // Load fresh project details (including papers)
    try {
      const response = await api.get(`/api/projects/${project.id}`);
      const projectDetails = response.data;
      setSelectedProject(projectDetails);
      setPapers(projectDetails.papers || []);
      setDraftTitle(projectDetails.draft_title || 'Untitled Draft');
      setDraftContent(projectDetails.draft_content || '');
      
      // Select the first paper by default for the tab chat if papers exist
      if (projectDetails.papers && projectDetails.papers.length > 0) {
        setSelectedChatPaper(projectDetails.papers[0]);
      } else {
        setSelectedChatPaper(null);
      }
    } catch (err) {
      console.error("Failed to load project details:", err);
    }
  };

  // --- Draft Editor (Microsoft Word-like) Operations ---

  // Initialize editor contents on project select
  useEffect(() => {
    if (selectedProject && editorRef.current && workspaceTab === 'editor') {
      editorRef.current.innerHTML = selectedProject.draft_content || '';
      
      // Calculate word count
      const text = editorRef.current.innerText || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setSaveStatus('saved');
    }
  }, [selectedProject, workspaceTab]);

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText || '';
      setDraftContent(html);
      
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setSaveStatus('unsaved');
    }
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    handleEditorInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedProject) return;
    setSaveStatus('saving');
    try {
      const response = await api.put(`/api/projects/${selectedProject.id}/draft`, {
        draft_title: draftTitle,
        draft_content: draftContent
      });
      // Update local projects state
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, draft_title: draftTitle, draft_content: draftContent } : p));
      setSaveStatus('saved');
    } catch (err) {
      console.error("Failed to save draft:", err);
      setSaveStatus('error');
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (saveStatus === 'unsaved' && selectedProject) {
      const timer = setTimeout(() => {
        handleSaveDraft();
      }, 5000); // Auto-save after 5 seconds of typing inactivity
      return () => clearTimeout(timer);
    }
  }, [draftContent, draftTitle, saveStatus, selectedProject]);

  // --- Reference Papers Operations ---

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setMetadataError('');
    setExtractingMetadata(true);
    setLoadingProgress(0);
    setLoadingMessage("Uploading PDF...");

    let stage = 0;
    const stages = [
      "Uploading PDF...",
      "Reading document structure...",
      "AI analyzing content...",
      "Extracting metadata...",
      "Finalizing results..."
    ];

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + Math.floor(Math.random() * 6 + 3);
        if (next > 20 && stage === 0) { stage = 1; setLoadingMessage(stages[1]); }
        if (next > 40 && stage === 1) { stage = 2; setLoadingMessage(stages[2]); }
        if (next > 65 && stage === 2) { stage = 3; setLoadingMessage(stages[3]); }
        if (next > 85 && stage === 3) { stage = 4; setLoadingMessage(stages[4]); }
        if (next >= 95) return 95;
        return next;
      });
    }, 400);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/ai/extract-metadata', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success === false) {
        setMetadataError(response.data.message);
        setExtractingMetadata(false);
        return;
      }

      const metadata = response.data.metadata || {};
      const summary = response.data.summary || "";
      setPaperText(response.data.paper_text || "");

      setPaperForm({
        title: metadata.title || '',
        author: Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author || '',
        domain: metadata.domain || '',
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords || '',
        abstract: metadata.abstract || '',
        summary: summary || ''
      });
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      setMetadataError(error?.response?.data?.message || 'Metadata extraction failed.');
    } finally {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setExtractingMetadata(false);
        setLoadingProgress(0);
        setLoadingMessage("Preparing document...");
      }, 600);
    }
  };

  const handlePaperSubmit = async (e) => {
    e.preventDefault();
    setUploadSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append('title', paperForm.title);
      formData.append('author', paperForm.author);
      formData.append('domain', paperForm.domain);
      formData.append('paper_text', paperText);
      formData.append('project_id', selectedProject.id);
      if (paperForm.keywords) formData.append('keywords', paperForm.keywords);
      if (paperForm.abstract) formData.append('abstract', paperForm.abstract);
      if (paperForm.summary) formData.append('summary', paperForm.summary);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await api.post('/api/papers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newPaper = response.data;
      const updatedPapers = [newPaper, ...papers];
      setPapers(updatedPapers);
      
      // Update selected project papers in local state
      setSelectedProject(prev => ({ ...prev, papers: updatedPapers }));
      
      // Update selector dropdown if it was null
      if (!selectedChatPaper) {
        setSelectedChatPaper(newPaper);
      }

      setPaperForm({ title: '', author: '', domain: '', keywords: '', abstract: '', summary: '' });
      setSelectedFile(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to add paper:", err);
    }
  };

  const handleDeletePaper = async (paperId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this reference paper?")) return;
    try {
      await api.delete(`/api/papers/${paperId}`);
      const updatedPapers = papers.filter(p => p.id !== paperId);
      setPapers(updatedPapers);
      setSelectedProject(prev => ({ ...prev, papers: updatedPapers }));
      
      if (selectedPaper?.id === paperId) {
        handleCloseModal();
      }
      if (selectedChatPaper?.id === paperId) {
        setSelectedChatPaper(updatedPapers[0] || null);
        setTabChatHistory([]);
      }
    } catch (err) {
      console.error("Failed to delete paper:", err);
    }
  };

  const handleSelectPaper = async (paper) => {
    setSelectedPaper(paper);
    setPdfUrl(null);
    setModalChatHistory([]);
    setModalQuestion('');
    if (paper.file_name) {
      setLoadingPdf(true);
      try {
        const response = await api.get(`/api/papers/${paper.id}/file`, {
          responseType: 'blob'
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error("Failed to load PDF file:", err);
      } finally {
        setLoadingPdf(false);
      }
    }
  };

  const handleCloseModal = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setSelectedPaper(null);
    setPdfUrl(null);
  };

  // --- Stored Paper Chatbots Operations ---

  // 1. PDF Modal chatbot submit
  const handleModalChatSend = async (e) => {
    e.preventDefault();
    if (!modalQuestion.trim() || modalChatLoading || !selectedPaper) return;

    const userQuestion = modalQuestion.trim();
    setModalQuestion('');
    setModalChatHistory(prev => [...prev, { role: 'user', content: userQuestion }]);
    setModalChatLoading(true);

    try {
      const response = await api.post('/api/ai/chat-paper', {
        paper_text: selectedPaper.paper_text || selectedPaper.summary || '',
        question: userQuestion
      });
      setModalChatHistory(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (err) {
      console.error("Chat failed:", err);
      setModalChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Error calling research chatbot. Please ensure your backend Ollama service (phi3:mini) is running." 
      }]);
    } finally {
      setModalChatLoading(false);
    }
  };

  // 2. Project Workspace Chat tab submit
  const handleTabChatSend = async (e) => {
    e.preventDefault();
    if (!tabQuestion.trim() || tabChatLoading || !selectedChatPaper) return;

    const userQuestion = tabQuestion.trim();
    setTabQuestion('');
    setTabChatHistory(prev => [...prev, { role: 'user', content: userQuestion }]);
    setTabChatLoading(true);

    try {
      const response = await api.post('/api/ai/chat-paper', {
        paper_text: selectedChatPaper.paper_text || selectedChatPaper.summary || '',
        question: userQuestion
      });
      setTabChatHistory(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (err) {
      console.error("Chat failed:", err);
      setTabChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Error calling research chatbot. Please ensure your backend Ollama service (phi3:mini) is running." 
      }]);
    } finally {
      setTabChatLoading(false);
    }
  };

  const handleChatPaperChange = (paperId) => {
    const selected = papers.find(p => p.id === parseInt(paperId));
    setSelectedChatPaper(selected);
    setTabChatHistory([]); // Clear chat history when switching reference papers
  };

  // Filter papers for active project searching
  const filteredPapers = papers.filter((paper) => {
    const search = searchTerm.toLowerCase();
    return (
      paper.title?.toLowerCase().includes(search) ||
      paper.author?.toLowerCase().includes(search) ||
      paper.domain?.toLowerCase().includes(search) ||
      paper.keywords?.toLowerCase().includes(search) ||
      paper.abstract?.toLowerCase().includes(search) ||
      paper.summary?.toLowerCase().includes(search)
    );
  });

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-pastel-darkBg text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        user={user} 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <Topbar 
          isDark={isDark} 
          user={user} 
          activeSection={activeSection} 
          onMenuClick={() => setMobileOpen(true)}
        />

        {/* Dynamic Panels */}
        <main className="flex-1 overflow-y-auto">
          
          {activeSection === 'dashboard' && (
            <div className="h-full">
              {!selectedProject ? (
                /* PROJECTS LIST VIEW */
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                  
                  {/* Banner header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl gradient-card-border shadow-sm bg-gradient-to-r from-pastel-pink/10 to-pastel-green/10">
                    <div>
                      <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-pastel-accent to-pink-500 bg-clip-text text-transparent">
                        Research Workspaces
                      </h1>
                      <p className="text-sm text-gray-400 mt-1">
                        Select a research project to manage draft theses, reference literature, and custom paper chatbots.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center space-x-2 px-5 py-3 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold rounded-2xl transition-all shadow-md hover-scale"
                    >
                      <FolderPlus className="w-5 h-5" />
                      <span>New Project</span>
                    </button>
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl gradient-card-border shadow-sm bg-white dark:bg-pastel-darkCard">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Projects</p>
                          <h3 className="text-3xl font-extrabold mt-1 text-pastel-accent">{projects.length}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-pastel-pink/20 text-pastel-accent">
                          <Folder className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl gradient-card-border shadow-sm bg-white dark:bg-pastel-darkCard">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Sessions</p>
                          <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">{sessionsCount}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-pastel-green/30 text-emerald-600">
                          <Users className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Projects Grid */}
                  <div>
                    <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                      <Folder className="w-5 h-5 text-pastel-accent" />
                      <span>Active Projects</span>
                    </h2>

                    {loadingProjects ? (
                      <div className="py-16 text-center">
                        <Loader2 className="w-10 h-10 border-pastel-accent rounded-full animate-spin mx-auto mb-3 text-pastel-accent" />
                        <p className="text-sm text-gray-400 font-semibold">Retrieving your workspaces...</p>
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="p-12 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-pastel-darkBorder">
                        <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                        <p className="font-bold text-lg">No research projects created yet</p>
                        <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 mb-6">
                          Get started by creating a new workspace project. You can write your draft and organize reference papers inside.
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-5 py-3 bg-pastel-accent text-white font-bold rounded-2xl shadow-md hover-scale"
                        >
                          Create First Project
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            onClick={() => handleSelectProject(project)}
                            className={`p-6 rounded-3xl border transition-all hover:shadow-xl cursor-pointer hover-scale flex flex-col justify-between min-h-[180px] ${
                              isDark 
                                ? 'bg-gradient-to-br from-slate-900 to-indigo-950/20 border-pastel-darkBorder hover:border-pastel-accent/40 text-gray-200' 
                                : 'bg-gradient-to-br from-white to-slate-50 border-gray-100 hover:border-pastel-pink/50 text-gray-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <div className="p-2.5 rounded-xl bg-pastel-pink/20 text-pastel-accent">
                                  <Folder className="w-5 h-5" />
                                </div>
                                <button
                                  onClick={(e) => handleDeleteProject(project.id, e)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <h3 className="font-extrabold text-md mt-4 text-pastel-accent line-clamp-1">{project.title}</h3>
                              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                                {project.description || "No project description provided."}
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-pastel-darkBorder flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              <span>Draft: {project.draft_title || 'Untitled Draft'}</span>
                              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* SELECTED PROJECT WORKSPACE VIEW */
                <div className="h-full flex flex-col">
                  
                  {/* Project Header bar */}
                  <div className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3 min-w-0">
                      <button
                        onClick={() => setSelectedProject(null)}
                        className={`p-2.5 rounded-xl border hover-scale ${
                          isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-300' : 'border-gray-150 hover:bg-gray-50 text-gray-600'
                        }`}
                        title="Back to all projects"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="overflow-hidden">
                        <h2 className="font-extrabold text-lg truncate text-pastel-accent leading-snug">
                          {selectedProject.title}
                        </h2>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {selectedProject.description || "Project Workspace"}
                        </p>
                      </div>
                    </div>

                    {/* Tab Navigation & Save Status */}
                    <div className="flex items-center space-x-4 self-end md:self-auto flex-shrink-0">
                      
                      {workspaceTab === 'editor' && (
                        <div className="flex items-center space-x-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
                          {saveStatus === 'saved' && (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 dark:text-emerald-400">Autosaved</span>
                            </>
                          )}
                          {saveStatus === 'saving' && (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-pastel-accent animate-spin" />
                              <span className="text-pastel-accent animate-pulse">Saving...</span>
                            </>
                          )}
                          {saveStatus === 'unsaved' && (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                              <span className="text-amber-500">Unsaved edits</span>
                            </>
                          )}
                          {saveStatus === 'error' && (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-red-500">Save failed</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className={`flex rounded-2xl p-1 border ${
                        isDark ? 'bg-gray-900 border-pastel-darkBorder' : 'bg-gray-100 border-gray-200'
                      }`}>
                        <button
                          onClick={() => setWorkspaceTab('editor')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            workspaceTab === 'editor'
                              ? 'bg-pastel-accent text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Thesis Draft</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceTab('papers')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            workspaceTab === 'papers'
                              ? 'bg-pastel-accent text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>References ({papers.length})</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceTab('chat')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            workspaceTab === 'chat'
                              ? 'bg-pastel-accent text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>AI Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tab Panels */}
                  <div className="flex-1 overflow-hidden">
                    
                    {/* PANEL 1: MS WORD EDITOR */}
                    {workspaceTab === 'editor' && (
                      <div className="h-full flex flex-col">
                        
                        {/* MS Word Formatting Toolbar */}
                        <div className={`p-2.5 border-b flex flex-wrap gap-2 items-center justify-between ${
                          isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-slate-50 border-gray-200'
                        }`}>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            
                            {/* Formatting commands */}
                            <button
                              onClick={() => handleFormat('bold')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Bold"
                            >
                              <Bold className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('italic')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Italic"
                            >
                              <Italic className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('underline')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Underline"
                            >
                              <Underline className="w-4 h-4" />
                            </button>

                            <div className="w-[1px] h-6 bg-gray-200 dark:bg-pastel-darkBorder mx-1" />

                            {/* Alignment commands */}
                            <button
                              onClick={() => handleFormat('justifyLeft')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Align Left"
                            >
                              <AlignLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('justifyCenter')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Align Center"
                            >
                              <AlignCenter className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('justifyRight')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Align Right"
                            >
                              <AlignRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('justifyFull')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Align Justify"
                            >
                              <AlignJustify className="w-4 h-4" />
                            </button>

                            <div className="w-[1px] h-6 bg-gray-200 dark:bg-pastel-darkBorder mx-1" />

                            {/* Lists commands */}
                            <button
                              onClick={() => handleFormat('insertUnorderedList')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Bullet List"
                            >
                              <List className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFormat('insertOrderedList')}
                              className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                              title="Numbered List"
                            >
                              <ListOrdered className="w-4 h-4" />
                            </button>

                            <div className="w-[1px] h-6 bg-gray-200 dark:bg-pastel-darkBorder mx-1" />

                            {/* Heading selection */}
                            <select
                              onChange={(e) => handleFormat('formatBlock', e.target.value)}
                              className="px-2 py-1.5 text-xs font-bold rounded-xl border bg-white dark:bg-slate-800 border-gray-200 dark:border-pastel-darkBorder text-gray-600 dark:text-gray-200"
                              defaultValue="<p>"
                            >
                              <option value="<p>">Normal Paragraph</option>
                              <option value="<h1>">Heading 1 (Title)</option>
                              <option value="<h2>">Heading 2 (Section)</option>
                              <option value="<h3>">Heading 3 (Sub)</option>
                              <option value="<blockquote>">Quote Block</option>
                            </select>

                            <button
                              onClick={() => handleFormat('removeFormat')}
                              className="px-2 py-1.5 text-xs font-bold border border-gray-200 dark:border-pastel-darkBorder hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 rounded-xl"
                              title="Clear Text Formatting"
                            >
                              Reset styles
                            </button>
                          </div>

                          {/* Action manual saves */}
                          <button
                            onClick={handleSaveDraft}
                            disabled={saveStatus === 'saved' || saveStatus === 'saving'}
                            className={`flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                              saveStatus === 'saved' || saveStatus === 'saving'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                : 'bg-pastel-accent hover:bg-pastel-accent/90 text-white hover-scale'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Draft</span>
                          </button>
                        </div>

                        {/* Editor Canvas Area */}
                        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-6 md:p-12 flex justify-center items-start min-h-[500px]">
                          
                          {/* MS Word page-like container */}
                          <div className={`w-full max-w-[800px] min-h-[842px] p-12 md:p-16 shadow-xl rounded-sm border flex flex-col transition-colors duration-200 ${
                            isDark 
                              ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
                              : 'bg-white text-gray-900 border-gray-250'
                          }`}>
                            
                            {/* Draft Title Input */}
                            <input
                              type="text"
                              value={draftTitle}
                              onChange={(e) => { setDraftTitle(e.target.value); setSaveStatus('unsaved'); }}
                              placeholder="Draft Title (e.g. My Thesis Draft v1)"
                              className="font-extrabold text-2xl border-none outline-none focus:ring-0 w-full mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800 bg-transparent text-pastel-accent focus:border-pastel-pink/50 focus:outline-none"
                            />

                            {/* Rich text editing canvas */}
                            <div
                              ref={editorRef}
                              contentEditable
                              onInput={handleEditorInput}
                              className="editor-content flex-1 text-base leading-relaxed focus:outline-none min-h-[600px]"
                              placeholder="Start typing your thesis paper draft here... Highlight text to apply formatting using the toolbar."
                            />
                            
                            {/* Word Count indicator */}
                            <div className="mt-8 pt-4 border-t border-gray-150 dark:border-zinc-800 flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                              <span>Words: {wordCount}</span>
                              <span>Chars: {charCount}</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* PANEL 2: REFERENCE PAPERS */}
                    {workspaceTab === 'papers' && (
                      <div className="h-full p-6 overflow-y-auto">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          
                          {/* Left Column: Upload Paper form */}
                          <div className="lg:col-span-5">
                            <div className="p-6 rounded-3xl gradient-card-border bg-white dark:bg-pastel-darkCard shadow-md hover:shadow-lg transition-all duration-300">
                              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                                <Plus className="w-5 h-5 text-pastel-accent" />
                                <span>Add Reference Paper</span>
                              </h2>

                              {uploadSuccess && (
                                <div className="mb-4 flex items-center space-x-2 p-3 rounded-xl bg-pastel-green/40 text-emerald-800 text-sm font-semibold border border-emerald-200">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Paper uploaded and metadata stored securely!</span>
                                </div>
                              )}

                              <form onSubmit={handlePaperSubmit} className="space-y-4">
                                
                                {/* Upload PDF Trigger */}
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    Upload Research PDF
                                  </label>

                                  <div className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                                    isDark 
                                      ? 'border-pastel-darkBorder hover:border-pastel-pink/40 hover:bg-gray-800/20' 
                                      : 'border-gray-250 hover:border-pastel-pink/50 hover:bg-gray-55'
                                  }`}>
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      onChange={handleFileChange}
                                      className="hidden"
                                      id="project-pdf-upload"
                                    />
                                    <label htmlFor="project-pdf-upload" className="cursor-pointer flex flex-col items-center">
                                      <Upload className="w-8 h-8 text-gray-300 mb-2" />
                                      {selectedFile ? (
                                        <span className="text-xs font-semibold text-pastel-accent truncate max-w-xs">
                                          {selectedFile.name}
                                        </span>
                                      ) : (
                                        <>
                                          <span className="text-xs font-semibold">Click to upload PDF</span>
                                          <span className="text-[10px] text-gray-400 mt-1">Metadata will be auto-extracted</span>
                                        </>
                                      )}
                                    </label>
                                  </div>
                                </div>

                                {/* Loading AI Status */}
                                {extractingMetadata && (
                                  <div className="space-y-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                                    <div className="flex items-center space-x-2 text-blue-700 text-sm font-semibold">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>{loadingMessage}</span>
                                    </div>
                                    
                                    <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pastel-accent transition-all duration-300 ease-out"
                                        style={{ width: `${loadingProgress}%` }}
                                      />
                                    </div>
                                    
                                    <div className="flex justify-between text-[10px] font-semibold text-blue-600">
                                      <span className={loadingProgress > 10 ? "text-blue-700" : "text-blue-300"}>Upload</span>
                                      <span className={loadingProgress > 35 ? "text-blue-700" : "text-blue-300"}>Reading</span>
                                      <span className={loadingProgress > 65 ? "text-blue-700" : "text-blue-300"}>Extracting</span>
                                      <span className={loadingProgress > 90 ? "text-blue-700" : "text-blue-300"}>Finalizing</span>
                                    </div>
                                  </div>
                                )}

                                {metadataError && (
                                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{metadataError}</span>
                                  </div>
                                )}

                                {/* Metadata fields (only visible after selecting file) */}
                                {selectedFile && (
                                  <div className="space-y-4 animate-fade-in">
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        Paper Title
                                      </label>
                                      <input
                                        required
                                        type="text"
                                        name="title"
                                        value={paperForm.title}
                                        onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                          isDark 
                                            ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                            : 'bg-gray-55 border-gray-200'
                                        }`}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                          Author(s)
                                        </label>
                                        <input
                                          required
                                          type="text"
                                          name="author"
                                          value={paperForm.author}
                                          onChange={(e) => setPaperForm({ ...paperForm, author: e.target.value })}
                                          className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                            isDark 
                                              ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                              : 'bg-gray-55 border-gray-200'
                                          }`}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                          Domain
                                        </label>
                                        <input
                                          required
                                          type="text"
                                          name="domain"
                                          value={paperForm.domain}
                                          onChange={(e) => setPaperForm({ ...paperForm, domain: e.target.value })}
                                          className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                            isDark 
                                              ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                              : 'bg-gray-55 border-gray-200'
                                          }`}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        Keywords
                                      </label>
                                      <input
                                        type="text"
                                        name="keywords"
                                        value={paperForm.keywords}
                                        onChange={(e) => setPaperForm({ ...paperForm, keywords: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                          isDark 
                                            ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                            : 'bg-gray-55 border-gray-200'
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        Abstract
                                      </label>
                                      <textarea
                                        rows="3"
                                        name="abstract"
                                        value={paperForm.abstract}
                                        onChange={(e) => setPaperForm({ ...paperForm, abstract: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm border resize-none focus:outline-none ${
                                          isDark 
                                            ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                            : 'bg-gray-55 border-gray-200'
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        AI Generated Summary
                                      </label>
                                      <textarea
                                        rows="4"
                                        name="summary"
                                        value={paperForm.summary}
                                        readOnly
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm border resize-none focus:outline-none ${
                                          isDark
                                            ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200'
                                            : 'bg-gray-100 border-gray-200'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={!selectedFile || extractingMetadata}
                                  className={`w-full py-3 font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2 ${
                                    !selectedFile || extractingMetadata
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-pastel-accent hover:bg-pastel-accent/90 text-white'
                                  }`}
                                >
                                  <Plus className="w-5 h-5" />
                                  <span>{extractingMetadata ? 'Analyzing Paper...' : 'Submit Reference Paper'}</span>
                                </button>
                              </form>
                            </div>
                          </div>

                          {/* Right Column: References List */}
                          <div className="lg:col-span-7">
                            <div className="p-6 rounded-3xl gradient-card-border bg-white dark:bg-pastel-darkCard shadow-md hover:shadow-lg transition-all duration-300">
                              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                                <BookOpen className="w-5 h-5 text-pastel-accent" />
                                <span>Reference Papers</span>
                              </h2>

                              <div className="mb-4 relative">
                                <input
                                  type="text"
                                  placeholder="Search reference papers by title, authors, domain..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none ${
                                    isDark
                                      ? 'bg-slate-800 border-slate-700 text-white focus:border-pastel-accent'
                                      : 'bg-white border-gray-250 text-gray-900 focus:border-pastel-accent'
                                  }`}
                                />
                                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                              </div>

                              <p className="text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">
                                Showing {filteredPapers.length} of {papers.length} reference paper(s)
                              </p>

                              {papers.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-pastel-accent" />
                                  <p className="font-semibold text-sm">No references stored in this project.</p>
                                  <p className="text-xs text-gray-400 mt-1">Upload relevant PDF papers to build your library.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {filteredPapers.map((paper) => (
                                    <div 
                                      key={paper.id} 
                                      onClick={() => handleSelectPaper(paper)}
                                      className={`p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer hover-scale ${
                                        isDark 
                                          ? 'bg-gradient-to-br from-slate-900 to-indigo-950/20 border-pastel-darkBorder hover:border-pastel-accent/40 text-gray-200' 
                                          : 'bg-gradient-to-br from-white to-slate-50 border-gray-100 hover:border-pastel-pink/50 text-gray-800'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                          <h3 className="font-bold text-sm text-pastel-accent leading-snug">{paper.title}</h3>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {paper.author} &bull; {paper.domain}
                                          </p>
                                        </div>
                                        <button
                                          onClick={(e) => handleDeletePaper(paper.id, e)}
                                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {paper.keywords && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                          {paper.keywords.split(',').map((kw, i) => (
                                            <span 
                                              key={i} 
                                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                                isDark 
                                                  ? 'bg-pastel-darkCard text-pastel-pink border border-pastel-darkBorder' 
                                                  : 'bg-white text-pastel-accent border border-pastel-pink/30'
                                              }`}
                                            >
                                              {kw.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {paper.summary && (
                                        <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed text-gray-500 dark:text-gray-400 ${
                                          isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-gradient-to-r from-pink-50/20 to-blue-50/20 border-pastel-pink/20'
                                        }`}>
                                          <p className="font-extrabold text-[9px] uppercase tracking-wider text-pastel-accent mb-1">Summary snippet</p>
                                          <p className="line-clamp-2">{paper.summary}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* PANEL 3: PROJECT WORKSPACE CHAT TAB */}
                    {workspaceTab === 'chat' && (
                      <div className="h-full p-6 flex flex-col">
                        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                          
                          {/* Sidebar Selector for Reference Paper */}
                          <div className="w-full lg:w-1/3 flex flex-col justify-between p-6 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm">
                            <div>
                              <h3 className="font-extrabold text-sm text-pastel-accent mb-2 uppercase tracking-wider flex items-center space-x-2">
                                <Sparkles className="w-4 h-4 text-pastel-accent" />
                                <span>Reference Assistant</span>
                              </h3>
                              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                Chat with any reference paper uploaded to this project. Ask questions about methodology, findings, or literature details.
                              </p>
                              
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Choose Paper context:
                              </label>

                              {papers.length === 0 ? (
                                <p className="text-xs text-amber-500 font-semibold p-3 bg-amber-50 rounded-xl border border-amber-200">
                                  No reference papers stored in this workspace yet. Upload some in the "References" tab first to start chatting!
                                </p>
                              ) : (
                                <select
                                  value={selectedChatPaper?.id || ''}
                                  onChange={(e) => handleChatPaperChange(e.target.value)}
                                  className={`w-full p-3 text-sm rounded-xl border focus:outline-none font-semibold ${
                                    isDark 
                                      ? 'bg-slate-800 border-slate-700 text-white' 
                                      : 'bg-white border-gray-250 text-gray-900'
                                  }`}
                                >
                                  {papers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {selectedChatPaper && (
                              <div className={`mt-6 p-4 rounded-2xl border text-xs ${
                                isDark ? 'bg-slate-900/50 border-pastel-darkBorder' : 'bg-slate-50 border-gray-150'
                              }`}>
                                <h4 className="font-bold text-gray-500 uppercase tracking-wider mb-1">Selected Paper Details</h4>
                                <p className="font-bold text-pastel-accent">{selectedChatPaper.title}</p>
                                <p className="text-gray-400 mt-1 font-semibold">{selectedChatPaper.author}</p>
                                <p className="text-gray-400 mt-0.5">{selectedChatPaper.domain}</p>
                              </div>
                            )}
                          </div>

                          {/* Chat Screen area */}
                          <div className="flex-1 flex flex-col p-6 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm overflow-hidden h-[500px] lg:h-auto">
                            
                            {/* Chat output */}
                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                              {tabChatHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                                  <MessageSquare className="w-12 h-12 mb-3 text-pastel-accent opacity-30" />
                                  {selectedChatPaper ? (
                                    <>
                                      <p className="font-bold text-sm text-gray-500 dark:text-gray-300">Start your dialogue with this paper</p>
                                      <p className="text-xs text-gray-400/80 mt-1 max-w-sm">
                                        Ask questions like "What methodology was used in this study?" or "Summarize the key results."
                                      </p>
                                    </>
                                  ) : (
                                    <p className="font-bold text-sm">Select a reference paper context to begin</p>
                                  )}
                                </div>
                              ) : (
                                tabChatHistory.map((msg, idx) => (
                                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                      msg.role === 'user'
                                        ? 'bg-pastel-accent text-white rounded-tr-none'
                                        : isDark 
                                          ? 'bg-slate-800 text-gray-100 border border-slate-700 rounded-tl-none' 
                                          : 'bg-slate-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                      <span className="font-extrabold text-[9px] uppercase tracking-wider block opacity-70 mb-1">
                                        {msg.role === 'user' ? 'You' : 'Research Assistant'}
                                      </span>
                                      <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                              {tabChatLoading && (
                                <div className="flex justify-start">
                                  <div className={`p-4 rounded-2xl rounded-tl-none flex items-center space-x-2 text-xs text-gray-400 ${
                                    isDark ? 'bg-slate-800' : 'bg-slate-100'
                                  }`}>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-pastel-accent" />
                                    <span>AI is digesting paper content...</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Chat input box */}
                            <form onSubmit={handleTabChatSend} className="flex items-center space-x-3 flex-shrink-0">
                              <input
                                type="text"
                                value={tabQuestion}
                                onChange={(e) => setTabQuestion(e.target.value)}
                                disabled={tabChatLoading || !selectedChatPaper}
                                placeholder={selectedChatPaper ? "Type your research query here..." : "Select a reference paper above first"}
                                className={`flex-1 px-4 py-3 rounded-xl border text-xs focus:outline-none focus:border-pastel-accent ${
                                  isDark
                                    ? 'bg-slate-850 border-slate-700 text-white placeholder-slate-500'
                                    : 'bg-white border-gray-250 text-gray-900'
                                }`}
                              />
                              <button
                                type="submit"
                                disabled={tabChatLoading || !tabQuestion.trim() || !selectedChatPaper}
                                className={`px-5 py-3 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center transition-all ${
                                  tabChatLoading || !tabQuestion.trim() || !selectedChatPaper
                                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : 'bg-pastel-accent hover:bg-pastel-accent/90 hover-scale'
                                }`}
                              >
                                Ask AI
                              </button>
                            </form>

                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </div>
          )}

          {activeSection === 'audit' && (
            <div className="max-w-7xl mx-auto p-6 space-y-6">
              
              {/* Active Sessions Panel */}
              <div className="p-6 rounded-3xl gradient-card-border bg-white dark:bg-pastel-darkCard shadow-md hover:shadow-lg transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-pastel-accent" />
                  <span>Database Sessions (Active Connections)</span>
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-xs font-bold uppercase tracking-wider text-gray-400 ${
                        isDark ? 'border-pastel-darkBorder' : 'border-gray-100'
                      }`}>
                        <th className="pb-3">Device / Browser</th>
                        <th className="pb-3">IP Address</th>
                        <th className="pb-3">Login Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-105 dark:divide-pastel-darkBorder">
                      {activeSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-55/50 dark:hover:bg-gray-800/10">
                          <td className="py-3.5 font-semibold text-xs">{session.device}</td>
                          <td className="py-3.5 text-gray-400 font-mono text-xs">{session.ip}</td>
                          <td className="py-3.5 text-gray-400 text-xs">{session.date}</td>
                          <td className="py-3.5">
                            {session.isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pastel-green/40 text-emerald-800 border border-emerald-200">
                                Current
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-400">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            {!session.isCurrent && (
                              <button 
                                onClick={() => handleRevokeSession(session.id)}
                                className="px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="p-6 rounded-3xl gradient-card-border bg-white dark:bg-pastel-darkCard shadow-md hover:shadow-lg transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-pastel-accent" />
                  <span>Real-time Secure Audit Log</span>
                </h2>

                {loadingLogs ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 border-2 border-pastel-accent border-t-transparent rounded-full animate-spin mx-auto mb-3 text-pastel-accent" />
                    <p className="text-xs text-gray-400 font-semibold">Loading log details...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-xs font-bold uppercase tracking-wider text-gray-400 ${
                          isDark ? 'border-pastel-darkBorder' : 'border-gray-100'
                        }`}>
                          <th className="pb-3">Timestamp</th>
                          <th className="pb-3">Action</th>
                          <th className="pb-3">IP Address</th>
                          <th className="pb-3">Operation Details</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-mono divide-y divide-gray-100 dark:divide-pastel-darkBorder">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-55/50 dark:hover:bg-gray-800/10">
                            <td className="py-3 text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                log.action.includes('LOGIN') 
                                  ? 'bg-pastel-green/40 text-emerald-800' 
                                  : log.action.includes('REGISTER')
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                    : 'bg-pastel-pink/20 text-pastel-accent'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                            <td className="py-3 text-gray-300 max-w-xs truncate">{log.details || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden p-6 shadow-2xl transition-all duration-300 border ${
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-250' : 'bg-white text-gray-800 border-gray-100'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-pastel-darkBorder">
              <h3 className="font-extrabold text-lg text-pastel-accent">Create Project</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`p-1.5 rounded-lg border hover-scale ${
                  isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-50 text-gray-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Project Title
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. LLM Reasoning or Thesis Draft"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-accent ${
                    isDark 
                      ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                      : 'bg-gray-55 border-gray-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter a brief summary of the research goal..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border resize-none focus:outline-none focus:border-pastel-accent ${
                    isDark 
                      ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                      : 'bg-gray-55 border-gray-200'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={creatingProject || !newProject.title.trim()}
                className={`w-full py-3 font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2 ${
                  creatingProject || !newProject.title.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-pastel-accent hover:bg-pastel-accent/90 text-white hover-scale'
                }`}
              >
                {creatingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Project Workspace</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PAPER MODAL (PDF + Chatbot Split Panel) */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-7xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 border ${
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-200' : 'bg-white text-gray-800 border-gray-150'
          }`}>
            
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between dark:border-pastel-darkBorder flex-shrink-0">
              <div className="overflow-hidden mr-4">
                <h3 className="font-extrabold text-md text-pastel-accent truncate leading-snug">{selectedPaper.title}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                  {selectedPaper.author} &bull; {selectedPaper.domain}
                </p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {pdfUrl && (
                  <a 
                    href={pdfUrl} 
                    download={selectedPaper.file_name || 'research_paper.pdf'} 
                    className="flex items-center space-x-2 px-4 py-2 bg-pastel-accent hover:bg-pastel-accent/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0 hover-scale"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </a>
                )}
                <button 
                  onClick={handleCloseModal}
                  className={`p-2 rounded-xl border hover-scale ${
                    isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left column has Summary & Chatbot, Right column has PDF */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Pane: Info, Summary & Chatbot */}
              <div className="w-full md:w-5/12 overflow-y-auto border-r dark:border-pastel-darkBorder flex flex-col h-full bg-slate-50 dark:bg-slate-900/30">
                
                {/* Paper details and Summary */}
                <div className="p-6 border-b dark:border-pastel-darkBorder space-y-4 flex-shrink-0 bg-white dark:bg-pastel-darkCard">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Academic Domain</h4>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-pastel-pink/20 text-pastel-accent border border-pastel-pink/30">
                      {selectedPaper.domain}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Author(s)</h4>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{selectedPaper.author}</p>
                  </div>

                  {selectedPaper.keywords && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedPaper.keywords.split(',').map((kw, i) => (
                          <span 
                            key={i} 
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                              isDark 
                                ? 'bg-gray-800 text-pastel-pink border border-pastel-darkBorder' 
                                : 'bg-gray-100 text-pastel-accent border border-gray-200'
                            }`}
                          >
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPaper.summary && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">AI Generated Summary</h4>
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-150 dark:border-pastel-darkBorder max-h-[120px] overflow-y-auto">
                        {selectedPaper.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Stored Paper Chatbot Section */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
                  
                  {/* Chat messages log */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <h4 className="text-xs font-bold text-pastel-accent uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                      <MessageSquare className="w-4 h-4 text-pastel-accent" />
                      <span>Stored Paper Chatbot</span>
                    </h4>

                    {modalChatHistory.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-pastel-accent opacity-30" />
                        <p className="font-bold">Ask anything about this document</p>
                        <p className="text-[10px] text-gray-400/80 mt-0.5">Responses are derived specifically from the paper text.</p>
                      </div>
                    ) : (
                      modalChatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-pastel-accent text-white rounded-tr-none'
                              : isDark 
                                ? 'bg-slate-800 text-gray-150 border border-slate-700 rounded-tl-none' 
                                : 'bg-white text-gray-800 border border-gray-150 rounded-tl-none'
                          }`}>
                            <span className="font-bold text-[8px] uppercase tracking-wider block opacity-75 mb-0.5">
                              {msg.role === 'user' ? 'You' : 'Paper AI'}
                            </span>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {modalChatLoading && (
                      <div className="flex justify-start">
                        <div className={`p-3 rounded-xl rounded-tl-none flex items-center space-x-2 text-xs text-gray-400 ${
                          isDark ? 'bg-slate-800' : 'bg-white border border-gray-150'
                        }`}>
                          <Loader2 className="w-3 h-3 animate-spin text-pastel-accent" />
                          <span>AI is checking paper text...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat input box */}
                  <form onSubmit={handleModalChatSend} className="p-4 border-t bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder flex items-center space-x-2 flex-shrink-0">
                    <input
                      type="text"
                      value={modalQuestion}
                      onChange={(e) => setModalQuestion(e.target.value)}
                      disabled={modalChatLoading}
                      placeholder="Ask a question about this reference paper..."
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-pastel-accent ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={modalChatLoading || !modalQuestion.trim()}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                        modalChatLoading || !modalQuestion.trim()
                          ? 'bg-gray-300 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                          : 'bg-pastel-accent hover:bg-pastel-accent/90 hover-scale'
                      }`}
                    >
                      Ask
                    </button>
                  </form>
                </div>

              </div>

              {/* Right Pane: PDF Viewer */}
              <div className="w-full md:w-7/12 bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden h-full">
                {loadingPdf ? (
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 border-pastel-accent rounded-full animate-spin mx-auto mb-3 text-pastel-accent" />
                    <p className="text-xs text-gray-400 font-semibold">Retrieving PDF document securely...</p>
                  </div>
                ) : pdfUrl ? (
                  <iframe 
                    src={pdfUrl} 
                    className="w-full h-full border-none" 
                    title="Research PDF Viewer"
                  />
                ) : (
                  <div className="text-center p-8 text-gray-400 max-w-sm">
                    <FileText className="w-16 h-16 mx-auto mb-3 opacity-30 text-pastel-accent" />
                    <p className="font-bold text-sm">No PDF File Attached</p>
                    <p className="text-xs text-gray-450 mt-1 leading-relaxed">
                      This research paper record is stored with metadata details only. Upload a PDF file when creating a paper to enable viewing.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}