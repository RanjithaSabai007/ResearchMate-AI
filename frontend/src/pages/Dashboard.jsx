import React, { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Dashboard state
  const [papers, setPapers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionsCount, setSessionsCount] = useState(1);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // View PDF Modal State
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Form state
  const [paperForm, setPaperForm] = useState({
    title: '',
    author: '',
    domain: '',
    keywords: '',
    abstract: '',
    summary: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "Preparing document..."
  );
  const [metadataError, setMetadataError] = useState('');

  const fetchPapers = async () => {
    try {
      const response = await api.get('/api/papers');
      setPapers(response.data);
    } catch (err) {
      console.error("Failed to load papers:", err);
    }
  };

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

  const fetchActiveSessions = async () => {
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
    fetchPapers();
    fetchActiveSessions();
    
    // Check local storage for dark mode
    const systemTheme = localStorage.getItem('theme');
    if (systemTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, [navigate]);

  useEffect(() => {
    if (activeSection === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSection]);

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

  const handleInputChange = (e) => {
    setPaperForm({ ...paperForm, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
  const file = e.target.files?.[0];

  if (!file) return;

  setSelectedFile(file);
  setMetadataError('');
  setExtractingMetadata(true);
  setShowMetadataForm(true);
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

      // Stage updates
      if (next > 20 && stage === 0) {
        stage = 1;
        setLoadingMessage(stages[1]);
      }
      if (next > 40 && stage === 1) {
        stage = 2;
        setLoadingMessage(stages[2]);
      }
      if (next > 65 && stage === 2) {
        stage = 3;
        setLoadingMessage(stages[3]);
      }
      if (next > 85 && stage === 3) {
        stage = 4;
        setLoadingMessage(stages[4]);
      }

      if (next >= 95) return 95;

      return next;
    });
  }, 400);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
      '/api/ai/extract-metadata',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log("FULL RESPONSE:", response.data);

    if (response.data.success === false) {

        setMetadataError(
            response.data.message
        );

        setExtractingMetadata(false);

        return;
    }

    console.log("FULL RESPONSE:", response.data);

    const metadata = response.data.metadata || {};
    const summary = response.data.summary || "";

    console.log("METADATA:", metadata);
    console.log("SUMMARY:", summary);

    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata);
    }

    console.log("SETTING FORM NOW");
    setPaperForm({
      title: metadata.title || '',
      author: Array.isArray(metadata.author)
        ? metadata.author.join(', ')
        : metadata.author || '',
      domain: metadata.domain || '',
      keywords: Array.isArray(metadata.keywords)
        ? metadata.keywords.join(', ')
        : metadata.keywords || '',
      abstract: metadata.abstract || '',
      summary: summary || ''
    });

  } catch (error) {
        console.error(
            'Metadata extraction failed:',
            error
        );

        setMetadataError(
            error?.response?.data?.message ||
            'Metadata extraction failed.'
        );
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setUploadSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append('title', paperForm.title);
      formData.append('author', paperForm.author);
      formData.append('domain', paperForm.domain);
      if (paperForm.keywords) formData.append('keywords', paperForm.keywords);
      if (paperForm.abstract) formData.append('abstract', paperForm.abstract);
      if (paperForm.summary)
         formData.append('summary', paperForm.summary);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await api.post('/api/papers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log(response.data);

      setPapers([response.data, ...papers]);
      setPaperForm({ title: '', author: '', domain: '', keywords: '', abstract: '', summary: '' });
      setSelectedFile(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to add paper:", err);
    }
  };

  const handleDeletePaper = async (id) => {
    try {
      await api.delete(`/api/papers/${id}`);
      setPapers(papers.filter(p => p.id !== id));
      if (selectedPaper && selectedPaper.id === id) {
        handleCloseModal();
      }
    } catch (err) {
      console.error("Failed to delete paper:", err);
    }
  };

  const handleSelectPaper = async (paper) => {
    setSelectedPaper(paper);
    setPdfUrl(null);
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
        <main className="flex-1 overflow-y-auto p-6">
          
          {activeSection === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Top Banner Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Papers Stat Card */}
                <div className="p-6 rounded-3xl gradient-card-border shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Papers</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-pastel-accent">{papers.length}</h3>
                    </div>
                    <div className="p-3 rounded-2xl bg-pastel-pink/20 text-pastel-accent">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Sessions Stat Card */}
                <div className="p-6 rounded-3xl gradient-card-border shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Sessions</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-emerald-500">{sessionsCount}</h3>
                    </div>
                    <div className="p-3 rounded-2xl bg-pastel-green/30 text-emerald-600">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Panel Content (Grid layout: Upload Form on Left, Papers on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Upload & Form Container */}
                <div className="lg:col-span-5">
                  <div className="p-6 rounded-3xl gradient-card-border shadow-md hover:shadow-lg transition-all duration-300">
                    <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                      <Plus className="w-5 h-5 text-pastel-accent" />
                      <span>Add Research Paper</span>
                    </h2>

                    {uploadSuccess && (
                      <div className="mb-4 flex items-center space-x-2 p-3 rounded-xl bg-pastel-green/40 text-emerald-800 text-sm font-semibold border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        <span>Paper uploaded and metadata stored securely!</span>
                      </div>
                    )}

                    {extractingMetadata && (
                      <div className="mb-4 flex items-center space-x-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-200">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          AI is analyzing the paper...
                        </span>
                      </div>
                    )}

                    {metadataError && (
                      <div className="mb-4 flex items-center space-x-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                        <AlertCircle className="w-4 h-4" />
                        <span>{metadataError}</span>
                      </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4">

                      {/* STEP 1: Upload First */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Upload Research PDF
                        </label>

                        <div className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                          isDark 
                            ? 'border-pastel-darkBorder hover:border-pastel-pink/40 hover:bg-gray-800/20' 
                            : 'border-gray-200 hover:border-pastel-pink/50 hover:bg-gray-55'
                        }`}>

                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="pdf-upload-file"
                          />

                          <label htmlFor="pdf-upload-file" className="cursor-pointer flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-300 mb-2" />

                            {selectedFile ? (
                              <span className="text-xs font-semibold text-pastel-accent truncate max-w-xs">
                                {selectedFile.name}
                              </span>
                            ) : (
                              <>
                                <span className="text-xs font-semibold">
                                  Step 1: Click to upload PDF
                                </span>
                                <span className="text-[10px] text-gray-400 mt-1">
                                  Metadata will be auto-extracted
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* STEP 2: Show AI Status (keeps your UX) */}
                      {extractingMetadata && (
                        <div className="space-y-3 p-4 rounded-xl bg-blue-50 border border-blue-200">

                          {/* Top Status Text */}
                          <div className="flex items-center space-x-2 text-blue-700 text-sm font-semibold">
                            <AlertCircle className="w-4 h-4 animate-pulse" />
                            <span>{loadingMessage}</span>
                          </div>

                          {/* STEP PROGRESS BAR */}
                          <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pastel-accent transition-all duration-300 ease-out"
                              style={{ width: `${loadingProgress}%` }}
                            />
                          </div>

                          {/* STEP LABELS */}
                          <div className="flex justify-between text-[10px] font-semibold text-blue-600 mt-2">

                            <span className={loadingProgress > 10 ? "text-blue-700" : "text-blue-300"}>
                              Upload
                            </span>

                            <span className={loadingProgress > 35 ? "text-blue-700" : "text-blue-300"}>
                              Reading
                            </span>

                            <span className={loadingProgress > 65 ? "text-blue-700" : "text-blue-300"}>
                              Extracting
                            </span>

                            <span className={loadingProgress > 90 ? "text-blue-700" : "text-blue-300"}>
                              Finalizing
                            </span>

                          </div>
                        </div>
                      )}

                      {metadataError && (
                        <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                          <AlertCircle className="w-4 h-4" />
                          <span>{metadataError}</span>
                        </div>
                      )}

                      {/* STEP 3: FORM FIELDS (only show AFTER file selected) */}
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
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                isDark 
                                  ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                  : 'bg-gray-55 border-gray-100'
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                              Author(s)
                            </label>
                            
                            <input
                              required
                              type="text"
                              name="author"
                              placeholder="Author"
                              value={paperForm.author}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none ${
                                isDark 
                                  ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                  : 'bg-gray-55 border-gray-100'
                              }`}
                            />

                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                              Domain
                            </label>

                            <input
                              required
                              type="text"
                              name="domain"
                              placeholder="Domain"
                              value={paperForm.domain}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                                isDark 
                                  ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                  : 'bg-gray-55 border-gray-100'
                              }`}
                            />
                          </div>

                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                            Keywords
                          </label>

                          <input
                            type="text"
                            name="keywords"
                            placeholder="Keywords"
                            value={paperForm.keywords}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                              isDark 
                                ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                : 'bg-gray-55 border-gray-100'
                            }`}
                          />

                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                              Abstract
                            </label>
                          <textarea
                            rows="3"
                            name="abstract"
                            placeholder="Abstract"
                            value={paperForm.abstract}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border resize-none ${
                              isDark 
                                ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' 
                                : 'bg-gray-55 border-gray-100'
                            }`}
                          />

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                              AI Generated Summary
                            </label>

                            <textarea
                              rows="6"
                              name="summary"
                              value={paperForm.summary}
                              readOnly
                              className={`w-full px-4 py-2.5 rounded-xl text-sm border resize-none ${
                                isDark
                                  ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200'
                                  : 'bg-gray-50 border-gray-100'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* STEP 4: SUBMIT BUTTON (ONLY ENABLE AFTER FILE) */}
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
                        <span>
                          {extractingMetadata
                            ? 'Analyzing Paper...'
                            : 'Submit Paper'}
                        </span>
                      </button>

                    </form>
                  </div>
                </div>

                {/* Papers List Container */}
                <div className="lg:col-span-7">
                  <div className="p-6 rounded-3xl gradient-card-border shadow-md hover:shadow-lg transition-all duration-300">
                    <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-pastel-accent" />
                      <span>Stored Papers</span>
                    </h2>

                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search papers by title, author, domain, keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Showing {filteredPapers.length} paper(s)
                    </p>

                    {papers.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-35" />
                        <p className="font-semibold text-sm">No research papers stored yet.</p>
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
                                <h3 className="font-bold text-md text-pastel-accent leading-snug">{paper.title}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                  {paper.author} &bull; {paper.domain}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePaper(paper.id);
                                }}
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
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
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

                            {paper.abstract && (
                              <p className="text-xs text-gray-400 mt-3.5 leading-relaxed truncate-3-lines">
                                {paper.abstract}
                              </p>
                            )}

                            {paper.summary && (
                              <div
                                className={`mt-3 p-3 rounded-xl border ${
                                  isDark
                                    ? 'bg-slate-900/40 border-pastel-darkBorder'
                                    : 'bg-gradient-to-r from-pink-50/50 to-blue-50/50 border-pastel-pink/20'
                                }`}
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-pastel-accent mb-2">
                                  AI Generated Summary
                                </p>

                                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-4">
                                  {paper.summary}
                                </p>
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

          {activeSection === 'audit' && (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Active Sessions Panel */}
              <div className="p-6 rounded-3xl gradient-card-border shadow-md hover:shadow-lg transition-all duration-300">
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
                    <tbody className="text-sm divide-y divide-gray-100 dark:divide-pastel-darkBorder">
                      {activeSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-55/50 dark:hover:bg-gray-800/10">
                          <td className="py-3.5 font-semibold">{session.device}</td>
                          <td className="py-3.5 text-gray-400 font-mono">{session.ip}</td>
                          <td className="py-3.5 text-gray-400">{session.date}</td>
                          <td className="py-3.5">
                            {session.isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pastel-green/40 text-emerald-800 border border-emerald-200">
                                Current
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">
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
              <div className="p-6 rounded-3xl gradient-card-border shadow-md hover:shadow-lg transition-all duration-300">
                <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-pastel-accent" />
                  <span>Real-time Secure Audit Log</span>
                </h2>

                {loadingLogs ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-pastel-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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

      {/* View Paper & PDF Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
            isDark ? 'bg-pastel-darkCard border border-pastel-darkBorder text-gray-200' : 'bg-white text-gray-800'
          }`}>
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between dark:border-pastel-darkBorder">
              <div className="overflow-hidden mr-4">
                <h3 className="font-extrabold text-lg text-pastel-accent truncate leading-snug">{selectedPaper.title}</h3>
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
                    isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-100 hover:bg-gray-55 text-gray-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Metadata */}
              <div className="w-full md:w-2/5 p-6 overflow-y-auto border-r dark:border-pastel-darkBorder space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Academic Domain</h4>
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-pastel-pink/20 text-pastel-accent border border-pastel-pink/30">
                    {selectedPaper.domain}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Author(s)</h4>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{selectedPaper.author}</p>
                </div>

                {selectedPaper.keywords && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPaper.keywords.split(',').map((kw, i) => (
                        <span 
                          key={i} 
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            isDark 
                              ? 'bg-gray-800 text-pastel-pink border border-pastel-darkBorder' 
                              : 'bg-gray-50 text-pastel-accent border border-gray-100'
                          }`}
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPaper.abstract && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Abstract</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      {selectedPaper.abstract}
                    </p>
                  </div>
                )}

                {selectedPaper.summary && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      AI Generated Summary
                    </h4>

                    <div
                      className={`p-3 rounded-xl ${
                        isDark
                          ? 'bg-slate-900/50 border border-pastel-darkBorder'
                          : 'bg-gradient-to-r from-pink-50/50 to-blue-50/50 border border-pastel-pink/20'
                      }`}
                    >
                      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {selectedPaper.summary}
                      </p>
                    </div>
                  </div>
                )}

                {selectedPaper.file_name && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Attached PDF File</h4>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{selectedPaper.file_name}</p>
                  </div>
                )}
              </div>

              {/* Right Column: PDF Viewer */}
              <div className="w-full md:w-3/5 bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
                {loadingPdf ? (
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-pastel-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
                    <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">No PDF File Attached</p>
                    <p className="text-xs text-gray-400/80 mt-1 leading-relaxed">This research paper record is stored with metadata details only. Upload a PDF file when creating a paper to enable viewing.</p>
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