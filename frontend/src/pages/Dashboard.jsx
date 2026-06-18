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
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Dashboard state
  const [papers, setPapers] = useState([
    { id: 1, title: "Attention Is All You Need", author: "Vaswani et al.", domain: "Deep Learning", keywords: "Transformers, NLP", abstract: "We propose a new simple network architecture, the Transformer..." },
    { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers", author: "Devlin et al.", domain: "Natural Language Processing", keywords: "BERT, NLP, Language Models", abstract: "We introduce a new language representation model called BERT..." }
  ]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Form state
  const [paperForm, setPaperForm] = useState({
    title: '',
    author: '',
    domain: '',
    keywords: '',
    abstract: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    
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
      // Fetch audit logs (decrypted automatically in interceptor)
      const logsResponse = await api.get('/api/auth/audit-logs');
      setAuditLogs(logsResponse.data);
      
      // Fetch active database sessions (decrypted automatically in interceptor)
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
      // Refresh session lists and audit log history
      fetchAuditLogs();
    } catch (err) {
      console.error("Failed to revoke active session:", err);
    }
  };

  const handleInputChange = (e) => {
    setPaperForm({ ...paperForm, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setUploadSuccess(false);
    
    // Simple state update to represent uploading paper
    const newPaper = {
      id: Date.now(),
      title: paperForm.title,
      author: paperForm.author,
      domain: paperForm.domain,
      keywords: paperForm.keywords,
      abstract: paperForm.abstract
    };

    setPapers([newPaper, ...papers]);
    setPaperForm({ title: '', author: '', domain: '', keywords: '', abstract: '' });
    setSelectedFile(null);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 4000);
  };

  const handleDeletePaper = (id) => {
    setPapers(papers.filter(p => p.id !== id));
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
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <Topbar isDark={isDark} user={user} activeSection={activeSection} />

        {/* Dynamic Panels */}
        <main className="flex-1 overflow-y-auto p-6">
          
          {activeSection === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Top Banner Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Papers Stat Card */}
                <div className={`p-6 rounded-3xl border shadow-sm ${
                  isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
                }`}>
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
                <div className={`p-6 rounded-3xl border shadow-sm ${
                  isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Sessions</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-emerald-500">1</h3>
                    </div>
                    <div className="p-3 rounded-2xl bg-pastel-green/30 text-emerald-600">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Database Encryption Stat Card */}
                <div className={`p-6 rounded-3xl border shadow-sm ${
                  isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Payload Status</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-indigo-500">AES-256</h3>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Panel Content (Grid layout: Upload Form on Left, Papers on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Upload & Form Container */}
                <div className="lg:col-span-5">
                  <div className={`p-6 rounded-3xl border shadow-md ${
                    isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
                  }`}>
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

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Paper Title</label>
                        <input
                          required
                          type="text"
                          name="title"
                          placeholder="e.g. Attention Is All You Need"
                          value={paperForm.title}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-pink/50 ${
                            isDark ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' : 'bg-gray-50 border-gray-100'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Author(s)</label>
                          <input
                            required
                            type="text"
                            name="author"
                            placeholder="Vaswani et al."
                            value={paperForm.author}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-pink/50 ${
                              isDark ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' : 'bg-gray-50 border-gray-100'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Domain</label>
                          <input
                            required
                            type="text"
                            name="domain"
                            placeholder="Deep Learning"
                            value={paperForm.domain}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-pink/50 ${
                              isDark ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' : 'bg-gray-50 border-gray-100'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Keywords</label>
                        <input
                          type="text"
                          name="keywords"
                          placeholder="e.g. NLP, AI, Neural Network"
                          value={paperForm.keywords}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-pink/50 ${
                            isDark ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' : 'bg-gray-50 border-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Abstract</label>
                        <textarea
                          rows="3"
                          name="abstract"
                          placeholder="Brief abstract..."
                          value={paperForm.abstract}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pastel-pink/50 resize-none ${
                            isDark ? 'bg-gray-800/50 border-pastel-darkBorder text-gray-200' : 'bg-gray-50 border-gray-100'
                          }`}
                        />
                      </div>

                      {/* PDF Upload UI */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Upload Research PDF</label>
                        <div className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                          isDark 
                            ? 'border-pastel-darkBorder hover:border-pastel-pink/40 hover:bg-gray-800/20' 
                            : 'border-gray-200 hover:border-pastel-pink/50 hover:bg-gray-50'
                        }`}>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="pdf-upload-file"
                          />
                          <label htmlFor="pdf-upload-file" className="cursor-pointer flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-300 mb-2" />
                            {selectedFile ? (
                              <span className="text-xs font-semibold text-pastel-accent truncate max-w-xs">{selectedFile.name}</span>
                            ) : (
                              <>
                                <span className="text-xs font-semibold">Click to upload PDF paper</span>
                                <span className="text-[10px] text-gray-400 mt-1">Maximum size 10MB</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold rounded-2xl transition-all shadow-sm hover-scale flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Paper</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Papers List Container */}
                <div className="lg:col-span-7">
                  <div className={`p-6 rounded-3xl border shadow-md ${
                    isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
                  }`}>
                    <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-pastel-accent" />
                      <span>Stored Papers</span>
                    </h2>

                    {papers.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-35" />
                        <p className="font-semibold text-sm">No research papers stored yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {papers.map((paper) => (
                          <div 
                            key={paper.id} 
                            className={`p-5 rounded-2xl border transition-all hover:shadow-sm ${
                              isDark ? 'bg-gray-800/20 border-pastel-darkBorder' : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h3 className="font-bold text-md text-pastel-accent leading-snug">{paper.title}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  {paper.author} &bull; {paper.domain}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeletePaper(paper.id)}
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
              <div className={`p-6 rounded-3xl border shadow-md ${
                isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
              }`}>
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
                        <tr key={session.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
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
              <div className={`p-6 rounded-3xl border shadow-md ${
                isDark ? 'bg-pastel-darkCard border-pastel-darkBorder' : 'bg-white border-gray-100'
              }`}>
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
                          <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
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

    </div>
  );
}
