import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../utils/api';
import editorBridge from '../services/editorBridge';
import WritingAssistant from '../components/WritingAssistant';
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
  Sparkles,
  Star,
  Check,
  AlertTriangle,
  Presentation,
  History,
  Award,
  Network,
  Table,
  Image,
  BarChart3,
  Palette
} from 'lucide-react';

// --- Tiptap Core & Extensions Imports ---
import { useEditor, EditorContent, Extension, Node } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TableExtension from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';

// More Lucide icons for Word formatting toolbar
import { 
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, 
  Quote, Minus, Undo2, Redo2, Strikethrough, PaintBucket, 
  ListTodo, Link2, Landmark, Baseline, Maximize2, Minimize2, 
  Printer, Type 
} from 'lucide-react';

// Custom Indentation Extension
const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            renderHTML: attributes => {
              if (!attributes.indent) return {};
              return { style: `padding-left: ${attributes.indent * 24}px` };
            },
            parseHTML: element => {
              const padding = element.style.paddingLeft || '0px';
              return { indent: parseInt(padding) / 24 || 0 };
            }
          }
        }
      }
    ];
  }
});

// Custom Page Break Node
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div.page-break' }];
  },
  renderHTML() {
    return ['div', { 
      class: 'page-break my-6 border-t-2 border-dashed border-gray-300 dark:border-zinc-700 py-3 text-center text-[10px] text-gray-400 font-bold uppercase select-none tracking-widest', 
      style: 'page-break-after: always; break-after: page;',
      contenteditable: 'false'
    }, '--- Page Break ---'];
  },
  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      }
    };
  }
});

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
  const [paperEvaluation, setPaperEvaluation] = useState(null); // Extracted evaluation of uploaded paper
  const [selectedEvaluationPaper, setSelectedEvaluationPaper] = useState(null); // Paper whose evaluation is viewed in modal
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
  const [activeModalTab, setActiveModalTab] = useState('summary'); // 'summary' | 'evaluation' | 'chat'

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

  // Multi-Paper Comparison Engine state
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [activeComparison, setActiveComparison] = useState(null);
  const [generatingComparison, setGeneratingComparison] = useState(false);
  const [comparisonMessage, setComparisonMessage] = useState('');
  const [loadingComparisons, setLoadingComparisons] = useState(false);

  // Research Novelty Analyzer state
  const [noveltyReports, setNoveltyReports] = useState([]);
  const [activeNoveltyReport, setActiveNoveltyReport] = useState(null);
  const [analyzingNovelty, setAnalyzingNovelty] = useState(false);
  const [noveltyMessage, setNoveltyMessage] = useState('');
  const [showNoveltyModal, setShowNoveltyModal] = useState(false);
  const [loadingNoveltyHistory, setLoadingNoveltyHistory] = useState(false);

  // Thesis Presentation Generator state
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const [presentationMessage, setPresentationMessage] = useState('');

  // AI Diagram Generator state
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [diagramMessage, setDiagramMessage] = useState('');
  const [diagramsList, setDiagramsList] = useState([]);
  const [activeDiagram, setActiveDiagram] = useState(null);
  const [loadingDiagrams, setLoadingDiagrams] = useState(false);
  const [diagramSelectionText, setDiagramSelectionText] = useState('');
  const [recommendedDiagramType, setRecommendedDiagramType] = useState('Methodology Flowchart');
  const [recommendedReason, setRecommendedReason] = useState('');
  const [diagramType, setDiagramType] = useState('Methodology Flowchart');
  const [diagramStyle, setDiagramStyle] = useState('Academic Block Diagram');
  
  // Custom rich editing & zoom controls state
  const [selectedEditorElement, setSelectedEditorElement] = useState(null);
  const [selectedElementType, setSelectedElementType] = useState(''); // 'img' or 'table'
  const [diagramZoom, setDiagramZoom] = useState(100);
  
  // Tiptap MS Word UI states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [editorZoom, setEditorZoom] = useState(100);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState([]);
  const [currentFindIndex, setCurrentFindIndex] = useState(-1);
  const [contextMenu, setContextMenu] = useState(null);
  const [insertPanel, setInsertPanel] = useState(null); // null | 'table' | 'image' | 'graph'
  const [resizeVersion, setResizeVersion] = useState(0);
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditingDiagramNode, setIsEditingDiagramNode] = useState(null);
  const [newEdgeSource, setNewEdgeSource] = useState('');
  const [newEdgeTarget, setNewEdgeTarget] = useState('');
  const [newEdgeLabel, setNewEdgeLabel] = useState('');

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
    setSelectedPaperIds([]);
    setActiveComparison(null);
    setNoveltyReports([]);
    setActiveNoveltyReport(null);
    setDiagramsList([]);
    setActiveDiagram(null);
    // Load fresh project details (including papers)
    try {
      const response = await api.get(`/api/projects/${project.id}`);
      const projectDetails = response.data;
      setSelectedProject(projectDetails);
      setPapers(projectDetails.papers || []);
      setDraftTitle(projectDetails.draft_title || 'Untitled Draft');
      setDraftContent(projectDetails.draft_content || '');
      
      // Load comparisons history
      fetchComparisons(projectDetails.id);

      // Load novelty history
      fetchNoveltyReports(projectDetails.id);

      // Load diagrams list
      fetchDiagrams(projectDetails.id);

      // Select the first paper by default for the tab chat if papers exist
      if (projectDetails.papers && projectDetails.papers.length > 0) {
        const firstPaper = projectDetails.papers[0];
        setSelectedChatPaper(firstPaper);
        // Load its chat history from DB
        try {
          const chatHistoryResp = await api.get(`/api/papers/${firstPaper.id}/chat`);
          setTabChatHistory(chatHistoryResp.data.map(msg => ({
            role: msg.role,
            content: msg.content
          })));
        } catch (chatErr) {
          console.error("Failed to load chat history:", chatErr);
        }
      } else {
        setSelectedChatPaper(null);
        setTabChatHistory([]);
      }
    } catch (err) {
      console.error("Failed to load project details:", err);
    }
  };

  // --- Multi-Paper Comparison Engine Operations ---

  const fetchComparisons = async (projectId) => {
    setLoadingComparisons(true);
    try {
      const response = await api.get(`/api/projects/${projectId}/comparisons`);
      setComparisons(response.data);
      if (response.data && response.data.length > 0) {
        // Load the most recent comparison automatically
        setActiveComparison(response.data[0]);
      } else {
        setActiveComparison(null);
      }
    } catch (err) {
      console.error("Failed to load comparisons:", err);
    } finally {
      setLoadingComparisons(false);
    }
  };

  const handleTogglePaperSelect = (paperId, e) => {
    e.stopPropagation();
    setSelectedPaperIds(prev => {
      if (prev.includes(paperId)) {
        return prev.filter(id => id !== paperId);
      } else {
        return [...prev, paperId];
      }
    });
  };

  const handleGenerateComparison = async () => {
    if (selectedPaperIds.length < 2) return;
    setWorkspaceTab('comparison');
    setGeneratingComparison(true);
    
    // Animate stage messages
    const stages = [
      "Compiling paper metadata and author profiles...",
      "Reading abstracts and summaries...",
      "Analyzing similarities and overlaps...",
      "Synthesizing methodology differences...",
      "Structuring dataset and algorithm profiles...",
      "Generating peer reviewer recommendations...",
      "Finalizing multi-paper report formatting..."
    ];
    
    let stageIdx = 0;
    setComparisonMessage(stages[0]);
    const msgInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      setComparisonMessage(stages[stageIdx]);
    }, 4500);

    try {
      const response = await api.post(`/api/projects/${selectedProject.id}/comparisons`, {
        paper_ids: selectedPaperIds
      });
      
      const newComp = response.data;
      setComparisons(prev => [newComp, ...prev]);
      setActiveComparison(newComp);
      setSelectedPaperIds([]); // Clear selection
    } catch (err) {
      console.error("Failed to generate comparison:", err);
      alert("Comparison failed: " + (err.response?.data?.message || err.message));
    } finally {
      clearInterval(msgInterval);
      setGeneratingComparison(false);
    }
  };

  const handleDeleteComparison = async (comparisonId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this comparison report?")) return;
    try {
      await api.delete(`/api/projects/${selectedProject.id}/comparisons/${comparisonId}`);
      setComparisons(prev => prev.filter(c => c.id !== comparisonId));
      if (activeComparison?.id === comparisonId) {
        setActiveComparison(null);
      }
    } catch (err) {
      console.error("Failed to delete comparison:", err);
    }
  };

  // --- Research Novelty Analyzer Operations ---

  const fetchNoveltyReports = async (projectId) => {
    setLoadingNoveltyHistory(true);
    try {
      const response = await api.get(`/api/projects/${projectId}/novelty`);
      setNoveltyReports(response.data);
      if (response.data && response.data.length > 0) {
        setActiveNoveltyReport(response.data[0]);
      } else {
        setActiveNoveltyReport(null);
      }
    } catch (err) {
      console.error("Failed to load novelty reports:", err);
    } finally {
      setLoadingNoveltyHistory(false);
    }
  };

  const handleAnalyzeNovelty = async () => {
    if (!selectedProject) return;
    
    // First, save the current draft content to database before running analysis
    setSaveStatus('saving');
    try {
      await api.put(`/api/projects/${selectedProject.id}/draft`, {
        draft_title: draftTitle,
        draft_content: draftContent
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error("Failed to auto-save before novelty analysis:", err);
      setSaveStatus('error');
    }

    setShowNoveltyModal(true);
    setAnalyzingNovelty(true);
    
    const stages = [
      "Reading current thesis draft content...",
      "Analyzing reference papers and domain contexts...",
      "Identifying overlapping research themes...",
      "Detecting unique contributions and methodologies...",
      "Evaluating gap alignment and citation nominations...",
      "Formulating thesis improvement recommendations..."
    ];
    
    let stageIdx = 0;
    setNoveltyMessage(stages[0]);
    const msgInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      setNoveltyMessage(stages[stageIdx]);
    }, 4500);

    try {
      const response = await api.post(`/api/projects/${selectedProject.id}/novelty`);
      const newReport = response.data;
      setNoveltyReports(prev => [newReport, ...prev]);
      setActiveNoveltyReport(newReport);
    } catch (err) {
      console.error("Failed to analyze novelty:", err);
      alert("Novelty Analysis failed: " + (err.response?.data?.message || err.message));
      setShowNoveltyModal(false);
    } finally {
      clearInterval(msgInterval);
      setAnalyzingNovelty(false);
    }
  };

  const handleDeleteNoveltyReport = async (reportId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this novelty analysis report?")) return;
    try {
      await api.delete(`/api/projects/${selectedProject.id}/novelty/${reportId}`);
      setNoveltyReports(prev => prev.filter(r => r.id !== reportId));
      if (activeNoveltyReport?.id === reportId) {
        setActiveNoveltyReport(null);
      }
    } catch (err) {
      console.error("Failed to delete novelty report:", err);
    }
  };

  const handleViewNoveltyHistory = () => {
    if (!selectedProject) return;
    fetchNoveltyReports(selectedProject.id);
    setShowNoveltyModal(true);
  };

  const handleGeneratePresentation = async () => {
    if (!selectedProject) return;
    
    // Auto-save first
    await handleSaveDraft();
    
    setGeneratingPresentation(true);
    setPresentationMessage("Initializing outline extraction...");
    
    const messages = [
      "Analyzing thesis document structure...",
      "Identifying chapters and sections...",
      "Condensing paragraphs into concise bullets...",
      "Creating slide hierarchy...",
      "Writing PowerPoint layout styles...",
      "Finalizing PPTX presentation..."
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex < messages.length) {
        setPresentationMessage(messages[msgIndex]);
        msgIndex++;
      }
    }, 3000);
    
    try {
      const response = await api.post(`/api/projects/${selectedProject.id}/presentation`, {}, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const safeTitle = (draftTitle || "Thesis").trim().replace(/\s+/g, "_");
      a.download = `${safeTitle}_presentation.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Presentation generation failed:", err);
      alert("Presentation generation failed: " + (err.response?.data?.message || err.message));
    } finally {
      clearInterval(msgInterval);
      setGeneratingPresentation(false);
      setPresentationMessage("");
    }
  };

  const handleDownloadDraft = (format) => {
    let content = "";
    let filename = `${draftTitle.trim().replace(/\s+/g, "_") || "Thesis_Draft"}`;
    let mimeType = "";
    
    if (format === "txt") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = draftContent;
      content = tempDiv.textContent || tempDiv.innerText || "";
      filename += ".txt";
      mimeType = "text/plain";
    } else if (format === "docx") {
      content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${draftTitle}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; padding: 40px; }
    h1 { font-family: 'Georgia', serif; color: #1e3a8a; margin-bottom: 12px; }
    h2 { font-family: 'Georgia', serif; color: #0f766e; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #cbd5e1; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background-color: #f8fafc; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${draftTitle}</h1>
  ${draftContent}
</body>
</html>`;
      filename += ".doc";
      mimeType = "application/msword";
    } else {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${draftTitle}</title><style>body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }</style></head><body><h1>${draftTitle}</h1>${draftContent}</body></html>`;
      filename += ".html";
      mimeType = "text/html";
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- AI Diagram Generator Operations ---

  const fetchDiagrams = async (projectId) => {
    setLoadingDiagrams(true);
    try {
      const response = await api.get(`/api/projects/${projectId}/diagrams`);
      setDiagramsList(response.data);
      if (response.data && response.data.length > 0) {
        setActiveDiagram(response.data[0]);
      } else {
        setActiveDiagram(null);
      }
    } catch (err) {
      console.error("Failed to load diagrams:", err);
    } finally {
      setLoadingDiagrams(false);
    }
  };

  const analyzeDraftForDiagramRecommendation = (text) => {
    if (!text) return { recommendedType: 'Methodology Flowchart', reason: 'Default recommendation' };
    const lower = text.toLowerCase();
    
    if (lower.includes('database') || lower.includes('table') || lower.includes('entity') || lower.includes('relationship') || lower.includes('erd') || lower.includes('schema')) {
      return { 
        recommendedType: 'Entity Relationship Diagram (ERD)', 
        reason: 'Detected database schema or entity relationship terms in content.' 
      };
    }
    if (lower.includes('architecture') || lower.includes('system design') || lower.includes('layer') || lower.includes('component') || lower.includes('module')) {
      return { 
        recommendedType: 'System Architecture', 
        reason: 'Detected system components or software architecture terms.' 
      };
    }
    if (lower.includes('deployment') || lower.includes('kubernetes') || lower.includes('docker') || lower.includes('cloud') || lower.includes('aws') || lower.includes('server')) {
      return { 
        recommendedType: 'Deployment Architecture', 
        reason: 'Detected system hosting, server, or cloud deployment details.' 
      };
    }
    if (lower.includes('workflow') || lower.includes('process') || lower.includes('step') || lower.includes('user flow')) {
      return { 
        recommendedType: 'Workflow Diagram', 
        reason: 'Detected step-by-step process flow or activity details.' 
      };
    }
    return { 
      recommendedType: 'Methodology Flowchart', 
      reason: 'Detected research process or implementation methodology context.' 
    };
  };

  const handleOpenGenerateDiagramModal = () => {
    if (!selectedProject) return;
    
    let selectedText = '';
    if (window.getSelection) {
      selectedText = window.getSelection().toString().trim();
    }
    
    setDiagramSelectionText(selectedText);
    
    const analysis = analyzeDraftForDiagramRecommendation(selectedText || draftContent);
    setRecommendedDiagramType(analysis.recommendedType);
    setRecommendedReason(analysis.reason);
    setDiagramType(analysis.recommendedType);
    setShowDiagramModal(true);
  };

  const handleGenerateDiagram = async () => {
    if (!selectedProject) return;
    
    // Auto-save first
    await handleSaveDraft();
    
    setGeneratingDiagram(true);
    setShowDiagramModal(false);
    setWorkspaceTab('diagrams');
    
    const stages = [
      "Analyzing selected text components...",
      "Extracting inputs, processes, and outputs...",
      "Generating system node relationships...",
      "Computing relative layout coordinates...",
      "Synthesizing visual graph structures...",
      "Finalizing research diagram..."
    ];
    let msgIdx = 0;
    setDiagramMessage(stages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % stages.length;
      setDiagramMessage(stages[msgIdx]);
    }, 4000);

    try {
      const response = await api.post(`/api/projects/${selectedProject.id}/diagrams/generate`, {
        diagram_type: diagramType,
        diagram_style: diagramStyle,
        selected_text: diagramSelectionText
      });
      const newDiagram = response.data;
      setDiagramsList(prev => [newDiagram, ...prev]);
      setActiveDiagram(newDiagram);
    } catch (err) {
      console.error("Failed to generate diagram:", err);
      alert("Diagram generation failed: " + (err.response?.data?.message || err.message));
    } finally {
      clearInterval(interval);
      setGeneratingDiagram(false);
      setDiagramMessage("");
    }
  };

  const handleSaveActiveDiagram = async (updatedDiag) => {
    if (!selectedProject || !updatedDiag) return;
    try {
      const response = await api.put(`/api/projects/${selectedProject.id}/diagrams/${updatedDiag.id}`, {
        name: updatedDiag.name,
        diagram_type: updatedDiag.diagram_type,
        diagram_style: updatedDiag.diagram_style,
        nodes: updatedDiag.nodes,
        edges: updatedDiag.edges
      });
      setDiagramsList(prev => prev.map(d => d.id === updatedDiag.id ? response.data : d));
    } catch (err) {
      console.error("Failed to save diagram changes:", err);
    }
  };

  const handleDeleteDiagram = async (diagramId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this diagram? All node layout data will be permanently removed.")) return;
    
    try {
      await api.delete(`/api/projects/${selectedProject.id}/diagrams/${diagramId}`);
      setDiagramsList(prev => prev.filter(d => d.id !== diagramId));
      if (activeDiagram?.id === diagramId) {
        setActiveDiagram(null);
      }
    } catch (err) {
      console.error("Failed to delete diagram:", err);
    }
  };

  const handleNodeDragStart = (e, nodeId) => {
    e.preventDefault();
    const svgCanvas = document.getElementById('diagram-svg-canvas');
    if (!svgCanvas) return;
    const svgRect = svgCanvas.getBoundingClientRect();
    
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - svgRect.left,
      y: e.clientY - svgRect.top
    });
  };

  const handleNodeDragMove = (e) => {
    if (!draggingNodeId || !activeDiagram) return;
    const svgCanvas = document.getElementById('diagram-svg-canvas');
    if (!svgCanvas) return;
    const svgRect = svgCanvas.getBoundingClientRect();
    
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    
    setActiveDiagram(prev => {
      if (!prev) return prev;
      const updatedNodes = prev.nodes.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: Math.max(50, Math.min(950, Math.round(mouseX))),
            y: Math.max(50, Math.min(550, Math.round(mouseY)))
          };
        }
        return n;
      });
      return { ...prev, nodes: updatedNodes };
    });
  };

  const handleNodeDragEnd = () => {
    if (!draggingNodeId) return;
    setDraggingNodeId(null);
    handleSaveActiveDiagram(activeDiagram);
  };

  const handleExportSVG = () => {
    if (!activeDiagram) return;
    const svgElement = document.getElementById('diagram-svg-canvas');
    if (!svgElement) return;
    
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDiagram.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!activeDiagram) return;
    const svgElement = document.getElementById('diagram-svg-canvas');
    if (!svgElement) return;
    
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      
      if (activeDiagram.diagram_style.toLowerCase().includes('dark')) {
        context.fillStyle = '#0f172a';
      } else {
        context.fillStyle = '#ffffff';
      }
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.drawImage(image, 0, 0, 1000, 600);
      const pngData = canvas.toDataURL('image/png');
      
      const a = document.createElement("a");
      a.href = pngData;
      a.download = `${activeDiagram.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const handleExportJSON = () => {
    if (!activeDiagram) return;
    const jsonString = JSON.stringify({
      nodes: activeDiagram.nodes,
      edges: activeDiagram.edges,
      diagram_type: activeDiagram.diagram_type,
      diagram_style: activeDiagram.diagram_style
    }, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDiagram.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleInsertDiagramIntoThesis = () => {
    if (!activeDiagram) return;
    const svgElement = document.getElementById('diagram-svg-canvas');
    if (!svgElement) return;
    
    const clone = svgElement.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.cursor = 'default';
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.maxWidth = '650px';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'my-6 flex justify-center content-diagram-embed';
    wrapper.style.textAlign = 'center';
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.appendChild(clone);
    
    // Switch to editor tab first so the editor DOM mounts
    setWorkspaceTab('editor');
    
    setTimeout(() => {
      if (editor) {
        editor.chain().focus().insertContent(wrapper.outerHTML).run();
        setSaveStatus('unsaved');
        alert("Diagram successfully inserted inline into your thesis draft!");
      } else {
        alert("Please open the Thesis Draft editor manually first.");
      }
    }, 150);
  };

  const handleAddNewNode = () => {
    if (!activeDiagram) return;
    const nextId = `node_${activeDiagram.nodes.length + 1}_${Date.now()}`;
    const newNode = {
      id: nextId,
      label: "New Component",
      type: "process",
      x: 450,
      y: 250,
      color: "#6366f1"
    };
    
    const updated = {
      ...activeDiagram,
      nodes: [...activeDiagram.nodes, newNode]
    };
    setActiveDiagram(updated);
    handleSaveActiveDiagram(updated);
  };

  const handleUpdateNodeLabel = (nodeId, text) => {
    if (!activeDiagram) return;
    const updated = {
      ...activeDiagram,
      nodes: activeDiagram.nodes.map(n => n.id === nodeId ? { ...n, label: text } : n)
    };
    setActiveDiagram(updated);
  };

  const handleUpdateNodeColor = (nodeId, color) => {
    if (!activeDiagram) return;
    const updated = {
      ...activeDiagram,
      nodes: activeDiagram.nodes.map(n => n.id === nodeId ? { ...n, color: color } : n)
    };
    setActiveDiagram(updated);
    handleSaveActiveDiagram(updated);
  };

  const handleDeleteNode = (nodeId) => {
    if (!activeDiagram) return;
    const updated = {
      ...activeDiagram,
      nodes: activeDiagram.nodes.filter(n => n.id !== nodeId),
      edges: activeDiagram.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    };
    setActiveDiagram(updated);
    handleSaveActiveDiagram(updated);
  };

  const handleAddNewEdge = (e) => {
    if (e) e.preventDefault();
    if (!activeDiagram || !newEdgeSource || !newEdgeTarget) return;
    
    const nextId = `edge_${activeDiagram.edges.length + 1}_${Date.now()}`;
    const newEdge = {
      id: nextId,
      source: newEdgeSource,
      target: newEdgeTarget,
      label: newEdgeLabel || "Flow"
    };
    
    const updated = {
      ...activeDiagram,
      edges: [...activeDiagram.edges, newEdge]
    };
    
    setActiveDiagram(updated);
    handleSaveActiveDiagram(updated);
    
    setNewEdgeSource('');
    setNewEdgeTarget('');
    setNewEdgeLabel('');
  };

  const handleDeleteEdge = (edgeId) => {
    if (!activeDiagram) return;
    const updated = {
      ...activeDiagram,
      edges: activeDiagram.edges.filter(e => e.id !== edgeId)
    };
    setActiveDiagram(updated);
    handleSaveActiveDiagram(updated);
  };

  // --- Draft Editor (Microsoft Word-like) Operations ---

  // --- Tiptap Editor Initialization & Operations ---

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      UnderlineExtension,
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-650 underline cursor-pointer',
        },
      }),
      ImageExtension.configure({
        inline: true,
        HTMLAttributes: {
          class: 'resizable-image max-w-[60%] border rounded-xl shadow-sm cursor-pointer inline-block',
        },
      }),
      TableExtension.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Indent,
      PageBreak,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setDraftContent(html);
      setSaveStatus('unsaved');
      
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    },
  });

  // Sync editor registration with editorBridge
  useEffect(() => {
    if (editor) {
      editorBridge.registerEditor(editor);
    }
    return () => {
      editorBridge.unregisterEditor();
    };
  }, [editor]);

  // Load project draft content into Tiptap
  useEffect(() => {
    if (selectedProject && editor) {
      const currentHTML = editor.getHTML();
      const targetHTML = selectedProject.draft_content || '';
      if (currentHTML !== targetHTML) {
        editor.commands.setContent(targetHTML);
      }
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setSaveStatus('saved');
    }
  }, [selectedProject, editor]);

  // Handle document-wide keyboard shortcuts (Ctrl+S, Ctrl+F, Ctrl+H)
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Ctrl+S: Save Draft
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
      // Ctrl+F: Open Find
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      // Ctrl+H: Open Replace
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [draftContent, draftTitle, selectedProject]);

  // Click outside to close custom context menu
  useEffect(() => {
    const handleCloseContextMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseContextMenu);
    return () => window.removeEventListener('click', handleCloseContextMenu);
  }, []);

  // --- AI Integration Extension Points (For Future Model Hooks) ---
  
  const getAISelectedText = () => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  };

  const getAIEntireDocument = () => {
    if (!editor) return "";
    return editor.getText();
  };

  const getAICursorPosition = () => {
    if (!editor) return 0;
    return editor.state.selection.anchor;
  };

  const getAICurrentParagraph = () => {
    if (!editor) return "";
    const { selection } = editor.state;
    const { $from } = selection;
    return $from.parent.textContent || "";
  };

  const getAICurrentChapter = () => {
    if (!editor) return "";
    return "Chapter boundary node details";
  };

  const getAICurrentHeading = () => {
    if (!editor) return "";
    let headingText = "";
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        headingText = node.textContent;
      }
    });
    return headingText;
  };

  // --- Find & Replace Operations ---

  const executeFindText = () => {
    if (!findText || !editor) return;
    const text = editor.getText();
    const regex = new RegExp(findText, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ index: match.index, text: match[0] });
    }
    setFindResults(matches);
    if (matches.length > 0) {
      setCurrentFindIndex(0);
      alert(`Found ${matches.length} occurrences.`);
    } else {
      setCurrentFindIndex(-1);
      alert("No matching occurrences found.");
    }
  };

  const executeReplaceText = () => {
    if (!editor || !findText) return;
    const currentHTML = editor.getHTML();
    const regex = new RegExp(findText, 'g');
    const updatedHTML = currentHTML.replace(regex, replaceText);
    editor.commands.setContent(updatedHTML);
    setSaveStatus('unsaved');
    alert(`Replaced all occurrences of "${findText}" with "${replaceText}".`);
  };

  // --- Editor Formatting Helpers ---

  const handleFormat = (command, value = null) => {
    if (!editor) return;
    editor.chain().focus();
    
    if (command === 'bold') editor.commands.toggleBold();
    else if (command === 'italic') editor.commands.toggleItalic();
    else if (command === 'underline') editor.commands.toggleUnderline();
    else if (command === 'strike') editor.commands.toggleStrike();
    else if (command === 'code') editor.commands.toggleCode();
    else if (command === 'blockquote') editor.commands.toggleBlockquote();
    else if (command === 'codeBlock') editor.commands.toggleCodeBlock();
    else if (command === 'horizontalRule') editor.commands.setHorizontalRule();
    else if (command === 'pageBreak') editor.commands.insertPageBreak();
    else if (command === 'undo') editor.commands.undo();
    else if (command === 'redo') editor.commands.redo();
    else if (command === 'removeFormat') {
      editor.commands.clearNodes();
      editor.commands.unsetAllMarks();
    }
    else if (command === 'formatBlock') {
      if (value === '<p>') editor.commands.setParagraph();
      else if (value === '<blockquote>') editor.commands.toggleBlockquote();
      else if (value?.startsWith('<h')) {
        const level = parseInt(value.replace(/[^1-6]/g, ''));
        editor.commands.toggleHeading({ level });
      }
    }
    else if (command === 'align') {
      editor.commands.setTextAlign(value);
    }
    
    editor.run();
  };

  const handleIndent = () => {
    if (!editor) return;
    const indentVal = editor.getAttributes('paragraph').indent || 0;
    editor.chain().focus().updateAttributes('paragraph', { indent: Math.min(10, indentVal + 1) }).run();
    editor.chain().focus().updateAttributes('heading', { indent: Math.min(10, indentVal + 1) }).run();
  };

  const handleOutdent = () => {
    if (!editor) return;
    const indentVal = editor.getAttributes('paragraph').indent || 0;
    editor.chain().focus().updateAttributes('paragraph', { indent: Math.max(0, indentVal - 1) }).run();
    editor.chain().focus().updateAttributes('heading', { indent: Math.max(0, indentVal - 1) }).run();
  };

  // --- Drag-to-Resize Mechanics for Images, Tables, & Graphs ---

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = selectedEditorElement.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (direction.includes('r')) newWidth = startWidth + deltaX;
      if (direction.includes('l')) newWidth = startWidth - deltaX;
      if (direction.includes('b')) newHeight = startHeight + deltaY;
      if (direction.includes('t')) newHeight = startHeight - deltaY;
      
      // Enforce bounds
      newWidth = Math.max(120, Math.min(1000, newWidth));
      newHeight = Math.max(80, Math.min(800, newHeight));
      
      // Apply resizing styles directly
      if (selectedElementType === 'img') {
        selectedEditorElement.style.width = `${newWidth}px`;
        selectedEditorElement.style.height = `${newHeight}px`;
      } else if (selectedElementType === 'table') {
        selectedEditorElement.style.width = `${newWidth}px`;
      } else {
        // graph wrapper / svg
        selectedEditorElement.style.width = `${newWidth}px`;
      }
      
      // Force trigger state re-render for helper overlay bounds coordinates
      setResizeVersion(v => v + 1);
      setSaveStatus('unsaved');
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Sync change to Tiptap HTML content state
      if (editor) {
        setDraftContent(editor.getHTML());
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getOverlayStyle = () => {
    if (!selectedEditorElement) return null;
    
    const container = document.querySelector('.editor-canvas-scrollable');
    if (!container) return null;
    
    const containerRect = container.getBoundingClientRect();
    const elementRect = selectedEditorElement.getBoundingClientRect();
    
    return {
      top: elementRect.top - containerRect.top + container.scrollTop,
      left: elementRect.left - containerRect.left + container.scrollLeft,
      width: elementRect.width,
      height: elementRect.height,
    };
  };

  const handleTableAddRow = () => {
    if (editor) editor.chain().focus().addRowAfter().run();
  };

  const handleTableAddCol = () => {
    if (editor) editor.chain().focus().addColumnAfter().run();
  };

  const handleTableDeleteRow = () => {
    if (editor) editor.chain().focus().deleteRow().run();
  };

  const handleTableDeleteTable = () => {
    if (editor) {
      editor.chain().focus().deleteTable().run();
      setSelectedEditorElement(null);
      setSelectedElementType('');
    }
  };

  const handleImageResize = (width) => {
    if (editor) {
      editor.chain().focus().updateAttributes('image', { width }).run();
      selectedEditorElement.style.width = width;
      setSaveStatus('unsaved');
    }
  };

  const handleImageDelete = () => {
    if (editor) {
      // Direct DOM removal of visual wrappers
      const parentNode = selectedEditorElement.parentNode;
      if (parentNode && parentNode.classList.contains('resizable-image')) {
        parentNode.remove();
      } else {
        selectedEditorElement.remove();
      }
      setSelectedEditorElement(null);
      setSelectedElementType('');
      setDraftContent(editor.getHTML());
      setSaveStatus('unsaved');
    }
  };

  const handleEditorClick = (e) => {
    const target = e.target;
    
    // Check if image figure clicked
    if (target.tagName === 'IMG') {
      setSelectedEditorElement(target);
      setSelectedElementType('img');
      return;
    }
    
    // Check if table clicked
    const tableNode = target.closest('table');
    if (tableNode) {
      setSelectedEditorElement(tableNode);
      setSelectedElementType('table');
      return;
    }
    
    // Check if custom graph element clicked (div with resizable-image style)
    const graphNode = target.closest('.resizable-image');
    if (graphNode && graphNode.tagName !== 'IMG') {
      setSelectedEditorElement(graphNode);
      setSelectedElementType('graph');
      return;
    }
    
    // Clicking outside elements clears selections
    setSelectedEditorElement(null);
    setSelectedElementType('');
  };

  const handleContextAction = (action) => {
    alert(`AI Action Placeholder: "${action}" triggered. Selected content: "${getAISelectedText()}"`);
    setContextMenu(null);
  };

  const handleEditorContextMenu = (e) => {
    if (editor && !editor.state.selection.empty) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      setContextMenu(null);
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
    setPaperEvaluation(null); // Clear previous evaluation

    let stage = 0;
    const stages = [
      "Uploading PDF...",
      "Reading document structure...",
      "AI analyzing content...",
      "Extracting metadata & running evaluation...",
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
      const evaluation = response.data.evaluation || null;
      setPaperText(response.data.paper_text || "");
      setPaperEvaluation(evaluation);

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
      if (paperEvaluation) {
        formData.append('evaluation', JSON.stringify(paperEvaluation));
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
        // Load its chat history
        try {
          const chatHistoryResp = await api.get(`/api/papers/${newPaper.id}/chat`);
          setTabChatHistory(chatHistoryResp.data.map(msg => ({
            role: msg.role,
            content: msg.content
          })));
        } catch (chatErr) {
          console.error(chatErr);
        }
      }

      setPaperForm({ title: '', author: '', domain: '', keywords: '', abstract: '', summary: '' });
      setSelectedFile(null);
      setPaperEvaluation(null);
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
        const nextPaper = updatedPapers[0] || null;
        setSelectedChatPaper(nextPaper);
        setTabChatHistory([]);
        if (nextPaper) {
          try {
            const chatHistoryResp = await api.get(`/api/papers/${nextPaper.id}/chat`);
            setTabChatHistory(chatHistoryResp.data.map(msg => ({
              role: msg.role,
              content: msg.content
            })));
          } catch (chatErr) {
            console.error(chatErr);
          }
        }
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
    setActiveModalTab('summary'); // Default to summary tab
    
    // Fetch chat history from database to sync
    try {
      const response = await api.get(`/api/papers/${paper.id}/chat`);
      setModalChatHistory(response.data.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    } catch (chatErr) {
      console.error("Failed to retrieve chat history:", chatErr);
    }

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

  // --- Stored Paper Chatbots Operations (Database Synced) ---

  // 1. PDF Modal chatbot submit
  const handleModalChatSend = async (e) => {
    e.preventDefault();
    if (!modalQuestion.trim() || modalChatLoading || !selectedPaper) return;

    const userQuestion = modalQuestion.trim();
    setModalQuestion('');
    setModalChatHistory(prev => [...prev, { role: 'user', content: userQuestion }]);
    setModalChatLoading(true);

    try {
      const response = await api.post(`/api/papers/${selectedPaper.id}/chat`, {
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
      const response = await api.post(`/api/papers/${selectedChatPaper.id}/chat`, {
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

  const handleChatPaperChange = async (paperId) => {
    const selected = papers.find(p => p.id === parseInt(paperId));
    setSelectedChatPaper(selected);
    setTabChatHistory([]); // Clear local state first
    
    if (selected) {
      setTabChatLoading(true);
      try {
        const response = await api.get(`/api/papers/${selected.id}/chat`);
        setTabChatHistory(response.data.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setTabChatLoading(false);
      }
    }
  };

  // Helper to render star rating graphics based on evaluation overall score (0-100)
  const renderStars = (score) => {
    const starsCount = Math.round((score || 70) / 20); // 0-100 score maps to 0-5 stars
    return (
      <div className="flex items-center space-x-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < starsCount ? 'fill-current' : 'text-gray-300 dark:text-zinc-700'}`} />
        ))}
      </div>
    );
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
      {!isFullScreen && (
        <Sidebar 
          isDark={isDark} 
          toggleTheme={toggleTheme} 
          user={user} 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      )}
 
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        {!isFullScreen && (
          <Topbar 
            isDark={isDark} 
            user={user} 
            activeSection={activeSection} 
            onMenuClick={() => setMobileOpen(true)}
          />
        )}

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
                        Select a research project to manage draft thesis, reference literature, and custom paper chatbots.
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

                  {/*  <div className="p-6 rounded-3xl gradient-card-border shadow-sm bg-white dark:bg-pastel-darkCard">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Sessions</p>
                          <h3 className="text-3xl font-extrabold mt-1 text-emerald-500">{sessionsCount}</h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-pastel-green/30 text-emerald-600">
                          <Users className="w-6 h-6" />
                        </div>
                      </div>
                    </div> */}
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
                          isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-300' : 'border-gray-150 hover:bg-gray-55 text-gray-600'
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
                        <button
                          onClick={() => setWorkspaceTab('comparison')}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            workspaceTab === 'comparison'
                              ? 'bg-pastel-accent text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Comparison Engine</span>
                        </button>
                        <button
                          onClick={() => {
                            setWorkspaceTab('diagrams');
                            if (selectedProject) fetchDiagrams(selectedProject.id);
                          }}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            workspaceTab === 'diagrams'
                              ? 'bg-pastel-accent text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          }`}
                        >
                          <Network className="w-4 h-4" />
                          <span>Diagrams</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tab Panels */}
                  <div className="flex-1 overflow-hidden">
                    
                    {/* PANEL 1: MS WORD EDITOR */}
                    {workspaceTab === 'editor' && (
                      <div className="h-full flex flex-col relative">
                        
                        {/* MS Word Formatting Toolbar */}
                        <div className={`p-2 border-b flex flex-wrap gap-2 items-center justify-between ${
                          isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-slate-50 border-gray-200'
                        }`}>
                          <div className="flex flex-wrap gap-1 items-center">
                            
                            {/* File / Actions */}
                            <div className="flex items-center space-x-0.5 mr-1">
                              <button
                                onClick={() => handleFormat('undo')}
                                disabled={!editor?.can().undo()}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-30"
                                title="Undo (Ctrl+Z)"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleFormat('redo')}
                                disabled={!editor?.can().redo()}
                                className="p-1.5 rounded-lg hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-30"
                                title="Redo (Ctrl+Y)"
                              >
                                <Redo2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="w-[1px] h-5 bg-gray-255 dark:bg-pastel-darkBorder mx-1" />

                            {/* Style Select */}
                            <select
                              onChange={(e) => handleFormat('formatBlock', e.target.value)}
                              className="px-2 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-slate-800 border-gray-250 dark:border-pastel-darkBorder text-gray-600 dark:text-gray-200"
                              value={
                                editor?.isActive('heading', { level: 1 }) ? '<h1>' :
                                editor?.isActive('heading', { level: 2 }) ? '<h2>' :
                                editor?.isActive('heading', { level: 3 }) ? '<h3>' :
                                editor?.isActive('blockquote') ? '<blockquote>' : '<p>'
                              }
                            >
                              <option value="<p>">Normal Paragraph</option>
                              <option value="<h1>">Heading 1</option>
                              <option value="<h2>">Heading 2</option>
                              <option value="<h3>">Heading 3</option>
                              <option value="<h4>">Heading 4</option>
                              <option value="<h5>">Heading 5</option>
                              <option value="<h6>">Heading 6</option>
                              <option value="<blockquote>">Quote Block</option>
                            </select>

                            <div className="w-[1px] h-5 bg-gray-255 dark:bg-pastel-darkBorder mx-1" />

                            {/* Font Formats */}
                            <button
                              onClick={() => handleFormat('bold')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('bold')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Bold (Ctrl+B)"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('italic')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('italic')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Italic (Ctrl+I)"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('underline')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('underline')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Underline (Ctrl+U)"
                            >
                              <Underline className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('strike')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('strike')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Strikethrough"
                            >
                              <Strikethrough className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Script formats */}
                            <button
                              onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('superscript')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Superscript"
                            >
                              <span className="text-[10px] font-bold">X²</span>
                            </button>
                            <button
                              onClick={() => editor?.chain().focus().toggleSubscript().run()}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('subscript')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Subscript"
                            >
                              <span className="text-[10px] font-bold">X₂</span>
                            </button>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Color Selection */}
                            <div className="flex items-center space-x-1" title="Font Text Color">
                              <Baseline className="w-3.5 h-3.5 text-gray-500" />
                              <input
                                type="color"
                                onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                                className="w-5 h-5 rounded cursor-pointer border border-gray-250 p-0"
                              />
                            </div>
                            <div className="flex items-center space-x-1" title="Highlight Marker Color">
                              <PaintBucket className="w-3.5 h-3.5 text-gray-500" />
                              <input
                                type="color"
                                onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                                className="w-5 h-5 rounded cursor-pointer border border-gray-250 p-0"
                              />
                            </div>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Alignments */}
                            <button
                              onClick={() => handleFormat('align', 'left')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive({ textAlign: 'left' })
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Align Left"
                            >
                              <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('align', 'center')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive({ textAlign: 'center' })
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Align Center"
                            >
                              <AlignCenter className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('align', 'right')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive({ textAlign: 'right' })
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Align Right"
                            >
                              <AlignRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('align', 'justify')}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive({ textAlign: 'justify' })
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Align Justified"
                            >
                              <AlignJustify className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Indents */}
                            <button
                              onClick={handleIndent}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                              title="Increase Indentation"
                            >
                              <span className="text-xs font-black">→|</span>
                            </button>
                            <button
                              onClick={handleOutdent}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                              title="Decrease Indentation"
                            >
                              <span className="text-xs font-black">|←</span>
                            </button>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Lists */}
                            <button
                              onClick={() => editor?.chain().focus().toggleBulletList().run()}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('bulletList')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Bullet List"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('orderedList')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Numbered List"
                            >
                              <ListOrdered className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => editor?.chain().focus().toggleTaskList().run()}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('taskList')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Task List"
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Inserts */}
                            <button
                              onClick={() => handleFormat('horizontalRule')}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                              title="Horizontal Line separator"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('pageBreak')}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
                              title="Insert Page Break"
                            >
                              <span className="text-[10px] font-black tracking-tighter">PAGE</span>
                            </button>
                             <button
                              onClick={() => setInsertPanel(insertPanel === 'table' ? null : 'table')}
                              className={`p-1.5 rounded-lg transition-all ${
                                insertPanel === 'table'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Insert Custom Table"
                            >
                              <Table className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInsertPanel(insertPanel === 'image' ? null : 'image')}
                              className={`p-1.5 rounded-lg transition-all ${
                                insertPanel === 'image'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Upload Local / Web image"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInsertPanel(insertPanel === 'graph' ? null : 'graph')}
                              className={`p-1.5 rounded-lg transition-all ${
                                insertPanel === 'graph'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Insert Dynamic Research Bar Graph"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const url = prompt("Enter website hyperlink link URL:");
                                if (url) editor?.chain().focus().setLink({ href: url }).run();
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                editor?.isActive('link')
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Insert Link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFormat('removeFormat')}
                              className="p-1.5 rounded-lg hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-550 hover:text-rose-500 text-xs font-black"
                              title="Clear all local text styles"
                            >
                              <Type className="w-3.5 h-3.5 text-rose-500" />
                            </button>

                            <div className="w-[1px] h-5 bg-gray-250 dark:bg-pastel-darkBorder mx-1" />

                            {/* Editing / Search */}
                            <button
                              onClick={() => setShowFindReplace(!showFindReplace)}
                              className={`p-1.5 rounded-lg transition-all ${
                                showFindReplace
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650'
                                  : 'hover:bg-gray-250 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Find and Replace text (Ctrl+F)"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Action manual saves, downloads, presentation & novelty */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Draft Downloads Group */}
                            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border dark:border-pastel-darkBorder shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleDownloadDraft('html')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-gray-650 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                title="Download draft as formatted HTML web document"
                              >
                                <Download className="w-3 h-3" />
                                <span>HTML Draft</span>
                              </button>
                              <div className="w-[1px] h-3.5 bg-gray-300 dark:bg-gray-600" />
                              <button
                                type="button"
                                onClick={() => handleDownloadDraft('txt')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-gray-650 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                title="Download draft as plain text document"
                              >
                                <FileText className="w-3 h-3" />
                                <span>TXT</span>
                              </button>
                              <div className="w-[1px] h-3.5 bg-gray-300 dark:bg-gray-600" />
                              <button
                                type="button"
                                onClick={() => handleDownloadDraft('docx')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-gray-650 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                title="Download draft as Microsoft Word Document"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                <span>Word Doc</span>
                              </button>
                            </div>

                            {/* Presentation Generator */}
                            <button
                              type="button"
                              onClick={handleGeneratePresentation}
                              disabled={generatingPresentation}
                              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-550 hover:to-indigo-650 text-white hover-scale disabled:opacity-50"
                              title="Generate PowerPoint slide deck from this draft"
                            >
                              {generatingPresentation ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>Slides...</span>
                                </>
                              ) : (
                                <>
                                  <Presentation className="w-3.5 h-3.5 text-white" />
                                  <span>Generate Presentation</span>
                                </>
                              )}
                            </button>

                            {/* Novelty Analyzer Buttons */}
                            <button
                              type="button"
                              onClick={handleAnalyzeNovelty}
                              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-gradient-to-r from-pastel-pink to-pastel-accent text-white hover-scale"
                              title="Analyze the novelty of this draft against reference papers"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                              <span>Analyze Novelty</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={handleViewNoveltyHistory}
                              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all border hover-scale ${
                                isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-55 text-gray-605'
                              }`}
                              title="View previous novelty reports history"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Novelty History</span>
                            </button>

                            {/* Generate Diagram */}
                            <button
                              type="button"
                              onClick={handleOpenGenerateDiagramModal}
                              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover-scale"
                              title="Generate an interactive research diagram from current section / selection"
                            >
                              <Network className="w-3.5 h-3.5 text-white" />
                              <span>Generate Diagram</span>
                            </button>

                            {/* Save Draft */}
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

                            {/* Editor Zoom Controls */}
                            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border dark:border-pastel-darkBorder shadow-sm text-xs font-bold">
                              <button
                                type="button"
                                onClick={() => setEditorZoom(prev => Math.max(50, prev - 10))}
                                className="px-2 py-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-350"
                                title="Zoom Out"
                              >
                                -
                              </button>
                              <span className="px-1 text-gray-600 dark:text-gray-300">{editorZoom}%</span>
                              <button
                                type="button"
                                onClick={() => setEditorZoom(prev => Math.min(200, prev + 10))}
                                className="px-2 py-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-355"
                                title="Zoom In"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditorZoom(100)}
                                className="px-1.5 py-1 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-[10px] text-gray-400"
                                title="Reset Zoom"
                              >
                                Reset
                              </button>
                            </div>

                            {/* Full Screen Toggle */}
                            <button
                              type="button"
                              onClick={() => setIsFullScreen(!isFullScreen)}
                              className={`p-2 rounded-xl transition-all border hover-scale ${
                                isFullScreen 
                                  ? 'bg-indigo-100 border-indigo-200 text-indigo-650' 
                                  : 'border-gray-250 dark:border-pastel-darkBorder hover:bg-gray-55 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Toggle Full Screen Mode"
                            >
                              {isFullScreen ? (
                                <Minimize2 className="w-3.5 h-3.5" />
                              ) : (
                                <Maximize2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* AI Writing Assistant Toggle */}
                            <button
                              type="button"
                              onClick={() => setShowAIAssistant(!showAIAssistant)}
                              className={`p-2 rounded-xl transition-all border hover-scale flex items-center space-x-1 ${
                                showAIAssistant 
                                  ? 'bg-indigo-50 border-indigo-150 text-indigo-700 dark:bg-indigo-950/45 dark:border-indigo-900 text-indigo-400 font-bold' 
                                  : 'border-gray-250 dark:border-pastel-darkBorder hover:bg-gray-55 dark:hover:bg-gray-800 text-gray-500'
                              }`}
                              title="Toggle AI Writing Assistant Sidebar"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">AI Assistant</span>
                            </button>
                          </div>
                        </div>

                        {/* Split Editor + Assistant Pane Container */}
                        <div className="flex-1 flex overflow-hidden relative">
                          
                          {/* AI Writing Assistant Side Panel */}
                          {showAIAssistant && (
                            <div className="w-[320px] h-full flex-shrink-0 animate-fade-in-right">
                              <WritingAssistant 
                                projectId={selectedProject?.id}
                                isDark={isDark}
                                projectDocumentType={selectedProject?.document_type}
                                onDocumentTypeChange={(newType) => {
                                  setSelectedProject(prev => prev ? { ...prev, document_type: newType } : null);
                                }}
                              />
                            </div>
                          )}

                          {/* Editor Canvas Area */}
                          <div className="editor-canvas-scrollable flex-1 overflow-y-auto bg-slate-100 dark:bg-zinc-950 p-6 md:p-12 flex flex-col justify-start items-center min-h-[500px] relative">
                          
                          {/* Find & Replace Panel */}
                          {showFindReplace && (
                            <div className="w-full max-w-[800px] mb-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-pastel-darkBorder flex flex-wrap items-center justify-between gap-3 shadow-md animate-fade-in-up">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                  <input 
                                    type="text" 
                                    placeholder="Find text..." 
                                    value={findText}
                                    onChange={(e) => setFindText(e.target.value)}
                                    className="px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-705 dark:text-gray-205 focus:outline-none focus:border-pastel-pink/55"
                                  />
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="Replace with..." 
                                  value={replaceText}
                                  onChange={(e) => setReplaceText(e.target.value)}
                                  className="px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-205 focus:outline-none focus:border-pastel-pink/55"
                                />
                                <button 
                                  type="button" 
                                  onClick={executeFindText} 
                                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                  Find
                                </button>
                                <button 
                                  type="button" 
                                  onClick={executeReplaceText} 
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-650 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                  Replace All
                                </button>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => { setShowFindReplace(false); setFindText(''); setReplaceText(''); setFindResults([]); }}
                                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-850 text-gray-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Inline Insert Configurator Panel */}
                          {insertPanel && (
                            <div className="w-full max-w-[800px] mb-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-pastel-darkBorder shadow-lg animate-fade-in-up">
                              <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-zinc-850">
                                <h3 className="text-xs font-bold text-pastel-accent uppercase tracking-wider">
                                  Configure Insertion: {insertPanel}
                                </h3>
                                <button 
                                  type="button" 
                                  onClick={() => setInsertPanel(null)}
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {insertPanel === 'table' && (
                                <div className="flex flex-wrap items-end gap-4">
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Rows</label>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      max="20" 
                                      defaultValue="3" 
                                      id="insert-table-rows"
                                      className="w-20 px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-700 dark:text-gray-200"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Columns</label>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      max="20" 
                                      defaultValue="3" 
                                      id="insert-table-cols"
                                      className="w-20 px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-700 dark:text-gray-200"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const rows = parseInt(document.getElementById('insert-table-rows').value) || 3;
                                      const cols = parseInt(document.getElementById('insert-table-cols').value) || 3;
                                      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                                      setInsertPanel(null);
                                    }}
                                    className="px-4 py-2 bg-pastel-accent text-white rounded-xl text-xs font-bold shadow hover-scale"
                                  >
                                    Insert Table
                                  </button>
                                </div>
                              )}

                              {insertPanel === 'image' && (
                                <div className="space-y-3">
                                  <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full">
                                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Upload image file</label>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              const base64Url = event.target.result;
                                              editor?.chain().focus().insertContent(`<img src="${base64Url}" style="max-width: 60%; cursor: pointer;" class="resizable-image border rounded-xl shadow-sm inline-block" alt="${file.name}" />`).run();
                                              setInsertPanel(null);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        className="w-full text-xs text-gray-550 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                      />
                                    </div>
                                    <div className="text-gray-400 text-xs font-bold">OR</div>
                                    <div className="flex-1 w-full">
                                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Image URL</label>
                                      <div className="flex gap-2">
                                        <input 
                                          type="text" 
                                          placeholder="https://example.com/illustration.png"
                                          id="insert-image-url"
                                          className="flex-1 px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-200"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const url = document.getElementById('insert-image-url').value;
                                            if (url) {
                                              editor?.chain().focus().insertContent(`<img src="${url}" style="max-width: 60%; cursor: pointer;" class="resizable-image border rounded-xl shadow-sm inline-block" alt="Web Figure" />`).run();
                                            }
                                            setInsertPanel(null);
                                          }}
                                          className="px-3 py-1.5 bg-pastel-accent text-white rounded-xl text-xs font-bold shadow hover-scale"
                                        >
                                          Insert
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {insertPanel === 'graph' && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                  <div className="md:col-span-2">
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Graph Title</label>
                                    <input 
                                      type="text" 
                                      defaultValue="Performance Evaluation: System Accuracy Comparison" 
                                      id="insert-graph-title"
                                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-205"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Categories (comma-sep)</label>
                                    <input 
                                      type="text" 
                                      defaultValue="Baseline, SOTA, Proposed" 
                                      id="insert-graph-cats"
                                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-205"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Percentages (comma-sep)</label>
                                    <input 
                                      type="text" 
                                      defaultValue="55, 78, 96" 
                                      id="insert-graph-vals"
                                      className="w-full px-3 py-1.5 text-xs border rounded-xl dark:bg-slate-800 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-205"
                                    />
                                  </div>
                                  <div className="md:col-span-4 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const title = document.getElementById('insert-graph-title').value || "System Performance Chart";
                                        const labels = (document.getElementById('insert-graph-cats').value || "").split(",").map(s => s.trim());
                                        const values = (document.getElementById('insert-graph-vals').value || "").split(",").map(s => parseInt(s.trim()) || 0);
                                        
                                        const barWidth = 50;
                                        const spacing = 45;
                                        const chartHeight = 160;
                                        const startX = 80;
                                        const startY = 210;
                                        
                                        let barsHTML = "";
                                        const colors = ["#94a3b8", "#818cf8", "#f43f5e", "#10b981", "#8b5cf6", "#f97316"];
                                        
                                        for (let i = 0; i < Math.min(labels.length, values.length); i++) {
                                          const lbl = labels[i];
                                          const val = Math.min(100, Math.max(0, values[i]));
                                          const bH = (val / 100) * chartHeight;
                                          const bX = startX + i * (barWidth + spacing);
                                          const bY = startY - bH;
                                          const col = colors[i % colors.length];
                                          
                                          barsHTML += `
                                            <rect x="${bX}" y="${bY}" width="${barWidth}" height="${bH}" fill="${col}" rx="4" />
                                            <text x="${bX + barWidth/2}" y="${bY - 8}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="${col}">${val}%</text>
                                            <text x="${bX + barWidth/2}" y="${startY + 16}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#64748b">${lbl}</text>
                                          `;
                                        }
                                        
                                        const graphWidth = Math.max(500, startX + labels.length * (barWidth + spacing) + 30);
                                        
                                        const graphHTML = `
                                          <div style="text-align: center; margin: 24px 0; display: flex; flex-direction: column; align-items: center;" class="resizable-image" contenteditable="false">
                                            <svg width="${graphWidth}" height="280" viewBox="0 0 ${graphWidth} 280" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); padding: 15px; font-family: system-ui, sans-serif;">
                                              <text x="${graphWidth/2}" y="22" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">${title}</text>
                                              <line x1="60" y1="${startY}" x2="${graphWidth - 30}" y2="${startY}" stroke="#94a3b8" stroke-width="2" />
                                              <line x1="60" y1="40" x2="60" y2="${startY}" stroke="#94a3b8" stroke-width="2" />
                                              
                                              <text x="50" y="${startY + 3}" text-anchor="end" font-size="9" fill="#64748b">0%</text>
                                              <line x1="60" y1="${startY}" x2="${graphWidth - 30}" y2="${startY}" stroke="#f1f5f9" stroke-dasharray="3" />
                                              
                                              <text x="50" y="${startY - 40}" text-anchor="end" font-size="9" fill="#64748b">25%</text>
                                              <line x1="60" y1="${startY - 40}" x2="${graphWidth - 30}" y2="${startY - 40}" stroke="#f1f5f9" stroke-dasharray="3" />
                                              
                                              <text x="50" y="${startY - 80}" text-anchor="end" font-size="9" fill="#64748b">50%</text>
                                              <line x1="60" y1="${startY - 80}" x2="${graphWidth - 30}" y2="${startY - 80}" stroke="#f1f5f9" stroke-dasharray="3" />
                                              
                                              <text x="50" y="${startY - 120}" text-anchor="end" font-size="9" fill="#64748b">75%</text>
                                              <line x1="60" y1="${startY - 120}" x2="${graphWidth - 30}" y2="${startY - 120}" stroke="#f1f5f9" stroke-dasharray="3" />
                                              
                                              <text x="50" y="44" text-anchor="end" font-size="9" fill="#64748b">100%</text>
                                              <line x1="60" y1="40" x2="${graphWidth - 30}" y2="40" stroke="#f1f5f9" stroke-dasharray="3" />
                                              
                                              ${barsHTML}
                                            </svg>
                                            <p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 8px;">Figure: ${title}</p>
                                          </div><p></p>
                                        `;
                                        
                                        editor?.chain().focus().insertContent(graphHTML).run();
                                        setInsertPanel(null);
                                      }}
                                      className="px-4 py-2 bg-pastel-accent text-white rounded-xl text-xs font-bold shadow hover-scale"
                                    >
                                      Generate & Insert Graph
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Float selection controls for Image/Table */}
                          {selectedEditorElement && (
                            <div className="w-full max-w-[800px] mb-3 p-3 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-150 dark:border-indigo-950 flex items-center justify-between text-xs font-bold shadow-md animate-fade-in-up">
                              <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                                {selectedElementType === 'img' ? (
                                  <>
                                    <Image className="w-4 h-4" />
                                    <span>Selected Image Figure</span>
                                  </>
                                ) : selectedElementType === 'table' ? (
                                  <>
                                    <Table className="w-4 h-4" />
                                    <span>Selected Grid Table</span>
                                  </>
                                ) : (
                                  <>
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Selected Research Graph</span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {selectedElementType === 'table' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleTableAddRow}
                                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border dark:border-pastel-darkBorder transition-all flex items-center space-x-1"
                                    >
                                      <span>+ Row</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleTableAddCol}
                                      className="px-2.5 py-1 rounded bg-white hover:bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border dark:border-pastel-darkBorder transition-all flex items-center space-x-1"
                                    >
                                      <span>+ Col</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleTableDeleteRow}
                                      className="px-2 py-1 rounded bg-white hover:bg-red-50 text-red-550 border border-red-200 dark:border-red-950 transition-all"
                                      title="Delete last row"
                                    >
                                      - Row
                                    </button>
                                  </>
                                )}
                                
                                <div className="w-[1px] h-4 bg-gray-300 dark:bg-slate-700 mx-1" />
                                
                                <button
                                  type="button"
                                  onClick={selectedElementType === 'img' ? handleImageDelete : selectedElementType === 'table' ? handleTableDeleteTable : handleImageDelete}
                                  className="px-2.5 py-1 rounded bg-red-500 hover:bg-red-650 text-white font-bold transition-all shadow-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Drag Resize Overlay Container */}
                          {selectedEditorElement && getOverlayStyle() && (
                            <div 
                              className="absolute pointer-events-none border-2 border-dashed border-indigo-500 z-30 animate-fade-in"
                              style={getOverlayStyle()}
                            >
                              {/* 8 resizing handles */}
                              {[
                                { dir: 'tl', cursor: 'nwse-resize', style: { top: -5, left: -5 } },
                                { dir: 'tm', cursor: 'ns-resize', style: { top: -5, left: 'calc(50% - 5px)' } },
                                { dir: 'tr', cursor: 'nesw-resize', style: { top: -5, right: -5 } },
                                { dir: 'ml', cursor: 'ew-resize', style: { top: 'calc(50% - 5px)', left: -5 } },
                                { dir: 'mr', cursor: 'ew-resize', style: { top: 'calc(50% - 5px)', right: -5 } },
                                { dir: 'bl', cursor: 'nesw-resize', style: { bottom: -5, left: -5 } },
                                { dir: 'bm', cursor: 'ns-resize', style: { bottom: -5, left: 'calc(50% - 5px)' } },
                                { dir: 'br', cursor: 'nwse-resize', style: { bottom: -5, right: -5 } },
                              ].map(h => (
                                <div
                                  key={h.dir}
                                  onMouseDown={(e) => handleResizeStart(e, h.dir)}
                                  className="absolute w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-sm pointer-events-auto hover:bg-indigo-100 shadow-sm"
                                  style={{ ...h.style, cursor: h.cursor }}
                                />
                              ))}
                            </div>
                          )}

                          {/* MS Word page-like container */}
                          <div 
                            style={{ zoom: editorZoom / 100 }}
                            className={`w-full max-w-[800px] min-h-[1050px] p-12 md:p-16 shadow-xl rounded-sm border flex flex-col transition-all duration-200 ${
                              isDark 
                                ? 'bg-zinc-900 text-zinc-100 border-zinc-800' 
                                : 'bg-white text-gray-900 border-gray-250'
                            }`}
                          >
                            
                            {/* Draft Title Input */}
                            <input
                              type="text"
                              value={draftTitle}
                              onChange={(e) => { setDraftTitle(e.target.value); setSaveStatus('unsaved'); }}
                              placeholder="Draft Title (e.g. My Thesis Draft v1)"
                              className="font-extrabold text-2xl border-none outline-none focus:ring-0 w-full mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800 bg-transparent text-pastel-accent focus:border-pastel-pink/50 focus:outline-none"
                            />

                            {/* Tiptap Rich text editing canvas */}
                            <EditorContent
                              editor={editor}
                              onClick={handleEditorClick}
                              onContextMenu={handleEditorContextMenu}
                              className="editor-content flex-1 text-base leading-relaxed focus:outline-none min-h-[600px] outline-none"
                            />
                            
                            {/* Word Count indicator */}
                            <div className="mt-8 pt-4 border-t border-gray-150 dark:border-zinc-800 flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                              <span>Words: {wordCount}</span>
                              <span>Chars: {charCount}</span>
                            </div>
                          </div>

                          {/* Custom AI Context Menu */}
                          {contextMenu && (
                            <div 
                              className="fixed bg-white dark:bg-slate-900 border dark:border-pastel-darkBorder rounded-2xl shadow-xl p-2 z-50 min-w-[200px] select-none"
                              style={{ top: contextMenu.y, left: contextMenu.x }}
                            >
                              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-3 py-1.5 border-b dark:border-pastel-darkBorder">
                                AI Actions
                              </div>
                              <button onClick={() => handleContextAction('Improve Academic Writing')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Improve Academic Writing</span>
                              </button>
                              <button onClick={() => handleContextAction('Rewrite')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Rewrite</span>
                              </button>
                              <button onClick={() => handleContextAction('Expand')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Expand</span>
                              </button>
                              <button onClick={() => handleContextAction('Shorten')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Shorten</span>
                              </button>
                              <button onClick={() => handleContextAction('Explain')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                                <span>Explain</span>
                              </button>
                              <button onClick={() => handleContextAction('Generate Citation')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Generate Citation</span>
                              </button>
                              <button onClick={() => handleContextAction('Review Paragraph')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Review Paragraph</span>
                              </button>
                              <button onClick={() => handleContextAction('Compare With Papers')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Sparkles className="w-3.5 h-3.5 text-pastel-accent" />
                                <span>Compare With Papers</span>
                              </button>
                              <button onClick={() => handleContextAction('Generate Diagram')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Network className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Generate Diagram</span>
                              </button>
                              <button onClick={() => handleContextAction('Check Novelty')} className="w-full text-left px-3 py-2 text-xs font-bold text-gray-705 dark:text-gray-200 hover:bg-indigo-500 hover:text-white rounded-xl transition-all flex items-center space-x-2">
                                <Sparkles className="w-3.5 h-3.5 text-pastel-accent animate-pulse" />
                                <span>Check Novelty</span>
                              </button>
                            </div>
                          )}

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
                                          <span className="text-[10px] text-gray-400 mt-1">Metadata & AI Evaluation auto-extracted</span>
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
                                      <span className={loadingProgress > 65 ? "text-blue-700" : "text-blue-300"}>Evaluating</span>
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
                                    {paperEvaluation && (
                                      <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                          <span className="font-bold">AI Reference Evaluation Generated</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <span className="font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded text-[9px]">{paperEvaluation.overall_score}% Value</span>
                                        </div>
                                      </div>
                                    )}

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

                              {selectedPaperIds.length > 0 && (
                                <div className="mb-4 p-4 rounded-2xl bg-pastel-accent/10 border border-pastel-accent/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                                  <div className="flex items-center space-x-2 text-xs font-bold text-pastel-accent uppercase tracking-wider">
                                    <Sparkles className="w-4 h-4 text-pastel-accent animate-pulse" />
                                    <span>{selectedPaperIds.length} paper(s) selected</span>
                                    {selectedPaperIds.length > 5 && (
                                      <span className="text-[10px] text-red-500 font-extrabold normal-case leading-none ml-2 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">Max 5 allowed</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPaperIds([])}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${
                                        isDark ? 'text-gray-400 hover:text-white bg-slate-800' : 'text-gray-500 hover:text-gray-700 bg-gray-100'
                                      }`}
                                    >
                                      Clear
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleGenerateComparison}
                                      disabled={selectedPaperIds.length < 2 || selectedPaperIds.length > 5}
                                      className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all hover-scale shadow-sm ${
                                        selectedPaperIds.length < 2 || selectedPaperIds.length > 5
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-400/20'
                                          : 'bg-gradient-to-r from-pastel-pink to-pastel-accent text-white'
                                      }`}
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>Compare Selected Papers</span>
                                    </button>
                                  </div>
                                </div>
                              )}

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
                                      className={`p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer hover-scale flex flex-col justify-between ${
                                        selectedPaperIds.includes(paper.id)
                                          ? (isDark ? 'bg-gradient-to-br from-slate-900 to-pastel-accent/15 border-pastel-accent text-gray-200 shadow-sm' : 'bg-gradient-to-br from-white to-pastel-accent/10 border-pastel-accent text-gray-800 shadow-sm')
                                          : (isDark ? 'bg-gradient-to-br from-slate-900 to-indigo-950/20 border-pastel-darkBorder hover:border-pastel-accent/40 text-gray-200' : 'bg-gradient-to-br from-white to-slate-50 border-gray-100 hover:border-pastel-pink/50 text-gray-800')
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-start space-x-3 flex-1 mr-2">
                                            <input
                                              type="checkbox"
                                              checked={selectedPaperIds.includes(paper.id)}
                                              onChange={(e) => handleTogglePaperSelect(paper.id, e)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="mt-1 h-6 w-6 rounded border-gray-300 text-pastel-accent focus:ring-pastel-accent cursor-pointer"
                                            />
                                            <div className="space-y-1">
                                              <h3 className="font-bold text-sm text-pastel-accent leading-snug">{paper.title}</h3>
                                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {paper.author} &bull; {paper.domain}
                                              </p>
                                            </div>
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

                                      {/* AI Evaluation Button & Rating Row */}
                                      {paper.evaluation && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-pastel-darkBorder flex items-center justify-between">
                                          {renderStars(paper.evaluation.overall_score)}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedEvaluationPaper(paper);
                                            }}
                                            className="px-3 py-1.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg flex items-center space-x-1 transition-all hover-scale"
                                          >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>AI Evaluation Report</span>
                                          </button>
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
                                {selectedChatPaper.evaluation && (
                                  <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-pastel-darkBorder flex items-center justify-between">
                                    <span className="font-bold text-[10px] text-gray-450 uppercase">Research Value</span>
                                    <span className="font-extrabold text-amber-600 dark:text-amber-400">{selectedChatPaper.evaluation.overall_score}%</span>
                                  </div>
                                )}
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

                    {/* PANEL 4: COMPARISON ENGINE WORKSPACE */}
                    {workspaceTab === 'comparison' && (
                      <div className="h-full p-6 flex flex-col overflow-hidden">
                        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                          
                          {/* Left Column: Comparisons History Sidebar */}
                          <div className="w-full lg:w-80 flex flex-col p-5 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm flex-shrink-0">
                            <h3 className="font-extrabold text-sm text-pastel-accent mb-1 uppercase tracking-wider flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-pastel-accent" />
                              <span>Comparison History</span>
                            </h3>
                            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                              Access previous AI comparison reports. Comparisons are generated across multiple reference papers in this project.
                            </p>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                              {loadingComparisons ? (
                                <div className="p-4 text-center text-xs text-gray-400">
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-pastel-accent" />
                                  <span>Loading history...</span>
                                </div>
                              ) : comparisons.length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-pastel-darkBorder rounded-2xl">
                                  <Sparkles className="w-8 h-8 opacity-25 mx-auto mb-2 text-pastel-accent" />
                                  <p className="font-semibold">No reports generated</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">Select papers in the References tab to start.</p>
                                </div>
                              ) : (
                                comparisons.map((comp) => {
                                  // Get list of paper titles in this comparison
                                  const compPapers = papers.filter(p => comp.selected_papers.includes(p.id));
                                  const titlesStr = compPapers.map(p => p.title).join(", ");
                                  const isActive = activeComparison?.id === comp.id;

                                  return (
                                    <div
                                      key={comp.id}
                                      onClick={() => {
                                        if (!generatingComparison) {
                                          setActiveComparison(comp);
                                        }
                                      }}
                                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between hover-scale ${
                                        isActive
                                          ? 'border-pastel-accent bg-pastel-accent/10'
                                          : isDark
                                            ? 'bg-slate-900 border-pastel-darkBorder hover:border-pastel-accent/30'
                                            : 'bg-slate-50/50 border-gray-150 hover:border-pastel-pink/40'
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold uppercase text-gray-400 font-mono">
                                            {new Date(comp.created_at).toLocaleDateString()} &bull; {compPapers.length} papers
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteComparison(comp.id, e)}
                                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <p className="font-bold text-xs text-pastel-accent line-clamp-2 leading-snug">
                                          {titlesStr || "Compared Papers"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right Column: Comparison Report Display */}
                          <div className="flex-1 flex flex-col p-6 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm overflow-hidden h-[600px] lg:h-auto">
                            
                            {generatingComparison ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-pulse">
                                <Loader2 className="w-12 h-12 animate-spin text-pastel-accent" />
                                <div>
                                  <p className="font-bold text-sm text-gray-700 dark:text-gray-300">Evaluating Reference Matrix</p>
                                  <p className="text-xs text-pastel-accent font-semibold mt-1 animate-pulse">
                                    {comparisonMessage}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-2 max-w-xs mx-auto">
                                    Ollama is synthesizing your reference material. This takes 15–30 seconds. Please do not close this workspace.
                                  </p>
                                </div>
                              </div>
                            ) : !activeComparison ? (
                              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                                <Sparkles className="w-16 h-16 mb-4 text-pastel-accent opacity-30" />
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-300">Generate Multi-Paper Comparison</h4>
                                <p className="text-xs text-gray-450 mt-1.5 max-w-md leading-relaxed">
                                  Select **2 to 5 reference papers** using checkboxes in the **References** tab, then click **Compare Selected Papers** to generate a structured synthesis report here.
                                </p>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col overflow-hidden">
                                
                                {/* Jump List Navigation Header */}
                                <div className={`flex-shrink-0 p-3 rounded-2xl border mb-4 flex items-center justify-between gap-3 ${
                                  isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-slate-50 border-gray-150'
                                }`}>
                                  <div className="flex items-center space-x-2">
                                    <Sparkles className="w-4 h-4 text-pastel-accent animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-pastel-accent">
                                      Comparative Review Matrix ({activeComparison.selected_papers.length} Papers)
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-bold">
                                    Generated: {new Date(activeComparison.created_at).toLocaleString()}
                                  </span>
                                </div>

                                {/* Report View Content - Scrollable */}
                                <div className="flex-1 overflow-y-auto space-y-6 pr-2 text-left">
                                  
                                  {/* 1. Overview */}
                                  {activeComparison.comparison_report?.overview && (
                                    <div className={`p-5 rounded-2xl border ${
                                      isDark ? 'bg-slate-900/50 border-pastel-darkBorder' : 'bg-gradient-to-br from-indigo-50/20 to-pastel-pink/10 border-gray-100'
                                    }`}>
                                      <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent mb-3 flex items-center space-x-1">
                                        <span>1. Matrix Overview</span>
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="p-3 bg-white dark:bg-pastel-darkCard rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Papers Count</p>
                                          <p className="text-lg font-black text-pastel-accent">{activeComparison.comparison_report.overview.num_papers}</p>
                                        </div>
                                        <div className="p-3 bg-white dark:bg-pastel-darkCard rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Timeline Scope</p>
                                          <p className="text-xs font-bold text-gray-600 dark:text-gray-200 mt-1 truncate">{activeComparison.comparison_report.overview.timeline}</p>
                                        </div>
                                        <div className="p-3 bg-white dark:bg-pastel-darkCard rounded-xl border border-gray-100 dark:border-slate-800 text-center md:col-span-2">
                                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Research Domain</p>
                                          <p className="text-xs font-bold text-gray-600 dark:text-gray-200 mt-1 truncate">{activeComparison.comparison_report.overview.domain}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        <p><span className="font-bold text-gray-600 dark:text-gray-300">Common objective:</span> {activeComparison.comparison_report.overview.common_objective}</p>
                                        <p><span className="font-bold text-gray-600 dark:text-gray-300">Overall research trend:</span> {activeComparison.comparison_report.overview.overall_trend}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* 2. Paper Summary Table */}
                                  {activeComparison.comparison_report?.paper_table && (
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent flex items-center space-x-1">
                                        <span>2. Paper Summary Grid</span>
                                      </h4>
                                      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-pastel-darkBorder">
                                        <table className="w-full border-collapse text-left text-xs">
                                          <thead>
                                            <tr className={`border-b font-extrabold uppercase text-[9px] tracking-wider text-gray-400 ${
                                              isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-slate-50 border-gray-100'
                                            }`}>
                                              <th className="p-3">Title</th>
                                              <th className="p-3">Year</th>
                                              <th className="p-3">Objective</th>
                                              <th className="p-3">Methodology</th>
                                              <th className="p-3">Dataset</th>
                                              <th className="p-3">Algorithm</th>
                                              <th className="p-3 text-center">Score</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-pastel-darkBorder text-gray-500 dark:text-gray-400 leading-normal">
                                            {activeComparison.comparison_report.paper_table.map((row, i) => (
                                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                                <td className="p-3 font-bold text-pastel-accent min-w-[150px]">{row.title}</td>
                                                <td className="p-3 font-mono font-bold">{row.year}</td>
                                                <td className="p-3 min-w-[150px]">{row.objective}</td>
                                                <td className="p-3 min-w-[120px]">{row.methodology}</td>
                                                <td className="p-3 min-w-[100px]">{row.dataset}</td>
                                                <td className="p-3 min-w-[100px]">{row.algorithm}</td>
                                                <td className="p-3 text-center font-bold">
                                                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black">
                                                    {row.score}%
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* 3. Similarities & 4. Differences */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Similarities */}
                                    {activeComparison.comparison_report?.similarities && (
                                      <div className={`p-4 rounded-2xl border ${
                                        isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-emerald-50/10 border-emerald-100'
                                      }`}>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                                          3. Similarities
                                        </h4>
                                        <ul className="space-y-2.5">
                                          {activeComparison.comparison_report.similarities.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-emerald-500 font-bold mt-0.5">&bull;</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Differences */}
                                    {activeComparison.comparison_report?.differences && (
                                      <div className={`p-4 rounded-2xl border ${
                                        isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-rose-50/10 border-rose-100'
                                      }`}>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3">
                                          4. Differences
                                        </h4>
                                        <ul className="space-y-2.5">
                                          {activeComparison.comparison_report.differences.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-rose-500 font-bold mt-0.5">&bull;</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* 5. Methodology Comparison */}
                                  {activeComparison.comparison_report?.methodology_comparison && (
                                    <div className={`p-5 rounded-2xl border ${
                                      isDark ? 'bg-slate-900/50 border-pastel-darkBorder' : 'bg-slate-50 border-gray-150'
                                    }`}>
                                      <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent mb-3">
                                        5. Methodology Comparison
                                      </h4>
                                      <div className="space-y-3.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        <div>
                                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-gray-400 mb-0.5">Strongest Methodology</p>
                                          <p className="font-medium text-gray-700 dark:text-gray-200">{activeComparison.comparison_report.methodology_comparison.strongest_methodology}</p>
                                        </div>
                                        <div>
                                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-gray-400 mb-0.5">Most Practical for Replication</p>
                                          <p className="font-medium text-gray-700 dark:text-gray-200">{activeComparison.comparison_report.methodology_comparison.most_practical}</p>
                                        </div>
                                        <div>
                                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-gray-400 mb-0.5">Common Methodological Limitations</p>
                                          <p className="font-medium text-gray-700 dark:text-gray-200">{activeComparison.comparison_report.methodology_comparison.common_limitations}</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/50 dark:border-slate-800">
                                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-pastel-accent mb-0.5">Thesis Guidance</p>
                                          <p className="font-medium text-gray-700 dark:text-gray-200">{activeComparison.comparison_report.methodology_comparison.suitability_guidance}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 6. Dataset Comparison & 7. Algorithm Comparison */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    
                                    {/* Dataset Comparison */}
                                    {activeComparison.comparison_report?.dataset_comparison && (
                                      <div className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent">
                                          6. Dataset Comparison
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                          {activeComparison.comparison_report.dataset_comparison.datasets_used.map((ds, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-pastel-pink/20 text-pastel-pink">
                                              {ds}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Frequent Dataset:</span> {activeComparison.comparison_report.dataset_comparison.most_frequent_dataset}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Dataset Sizes/Scope:</span> {activeComparison.comparison_report.dataset_comparison.dataset_sizes}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Advantages:</span> {activeComparison.comparison_report.dataset_comparison.advantages}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-rose-400 block">Limitations:</span> {activeComparison.comparison_report.dataset_comparison.limitations}</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Algorithm Comparison */}
                                    {activeComparison.comparison_report?.algorithm_comparison && (
                                      <div className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent">
                                          7. Algorithm Comparison
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                          {activeComparison.comparison_report.algorithm_comparison.algorithms.map((alg, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                              {alg}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Architectures:</span> {activeComparison.comparison_report.algorithm_comparison.architectures}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Advantages:</span> {activeComparison.comparison_report.algorithm_comparison.advantages}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-rose-400 block">Disadvantages:</span> {activeComparison.comparison_report.algorithm_comparison.disadvantages}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-gray-400 block">Computational Complexity:</span> {activeComparison.comparison_report.algorithm_comparison.complexity}</p>
                                          <p><span className="font-extrabold text-[9px] uppercase tracking-wider text-pastel-accent block">Suitability:</span> {activeComparison.comparison_report.algorithm_comparison.suitability}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* 8. Strengths & 9. Common Limitations (Gaps) */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Strengths */}
                                    {activeComparison.comparison_report?.strengths_across_papers && (
                                      <div className={`p-4 rounded-2xl border ${
                                        isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-emerald-50/10 border-emerald-100'
                                      }`}>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center space-x-1.5">
                                          <Check className="w-4.5 h-4.5 text-emerald-600" />
                                          <span>8. Collective Strengths</span>
                                        </h4>
                                        <ul className="space-y-2">
                                          {activeComparison.comparison_report.strengths_across_papers.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-emerald-500 font-extrabold font-mono mt-0.5">✓</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Common Limitations / Research Gaps */}
                                    {activeComparison.comparison_report?.common_limitations && (
                                      <div className={`p-4 rounded-2xl border ${
                                        isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-amber-500/5 border-amber-500/10'
                                      }`}>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-3 flex items-center space-x-1.5">
                                          <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                                          <span>9. Research Gaps / Limitations</span>
                                        </h4>
                                        <ul className="space-y-2">
                                          {activeComparison.comparison_report.common_limitations.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-amber-500 font-bold mt-0.5">⚠️</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* 10. Research Trends & 11. Future Opportunities */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Trends */}
                                    {activeComparison.comparison_report?.research_trends && (
                                      <div className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent mb-3 flex items-center space-x-1.5">
                                          <Clock className="w-4.5 h-4.5 text-pastel-accent" />
                                          <span>10. Paradigm Trends</span>
                                        </h4>
                                        <ul className="space-y-2.5">
                                          {activeComparison.comparison_report.research_trends.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-pastel-accent font-bold mt-0.5">&bull;</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Future Opportunities */}
                                    {activeComparison.comparison_report?.future_opportunities && (
                                      <div className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent mb-3 flex items-center space-x-1.5">
                                          <Sparkles className="w-4.5 h-4.5 text-pastel-accent animate-pulse" />
                                          <span>11. Future Thesis Opportunities</span>
                                        </h4>
                                        <ul className="space-y-2.5">
                                          {activeComparison.comparison_report.future_opportunities.map((item, i) => (
                                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                                              <span className="text-pastel-accent font-bold mt-0.5">&bull;</span>
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* 12. Recommendation */}
                                  {activeComparison.comparison_report?.recommendations && (
                                    <div className={`p-5 rounded-2xl border ${
                                      isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-gradient-to-r from-amber-500/10 to-pastel-pink/10 border-amber-500/20'
                                    }`}>
                                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-4 flex items-center space-x-1.5">
                                        <Star className="w-4.5 h-4.5 text-amber-500 animate-spin" />
                                        <span>12. AI Thesis Citations & Nominations</span>
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        {Object.entries(activeComparison.comparison_report.recommendations).map(([key, val], i) => (
                                          <div key={i} className="p-3 bg-white dark:bg-pastel-darkCard rounded-xl border border-gray-100 dark:border-slate-800">
                                            <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 mb-0.5">
                                              {key.replace(/_/g, " ")}
                                            </p>
                                            <p className="font-semibold text-gray-700 dark:text-gray-250 leading-relaxed">
                                              {val}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    )}

                    {/* PANEL 5: AI DIAGRAM GENERATOR WORKSPACE */}
                    {workspaceTab === 'diagrams' && (
                      <div className="h-full p-6 flex flex-col overflow-hidden animate-fade-in text-left">
                        {generatingDiagram ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-pastel-accent" />
                            <div>
                              <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Generating Architecture & Flow Diagrams</h4>
                              <p className="text-xs text-pastel-accent font-semibold mt-1 animate-pulse">
                                {diagramMessage}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-2 max-w-xs mx-auto">
                                Ollama is extracting methodologies and laying out visual entities. This takes 10–20 seconds.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden h-[calc(100vh-220px)]">
                            
                            {/* History sidebar */}
                            <div className="w-full lg:w-72 flex flex-col p-4 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm flex-shrink-0">
                              <h3 className="font-extrabold text-xs text-pastel-accent mb-1 uppercase tracking-wider flex items-center space-x-2">
                                <Network className="w-4 h-4 text-pastel-accent animate-pulse" />
                                <span>Diagram History</span>
                              </h3>
                              <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                                Access previously generated research diagrams.
                              </p>
                              
                              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {loadingDiagrams ? (
                                  <div className="py-8 text-center text-xs text-gray-400">
                                    <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto mb-2 text-pastel-accent" />
                                    <span>Retrieving diagrams...</span>
                                  </div>
                                ) : diagramsList.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-pastel-darkBorder rounded-2xl">
                                    <Network className="w-7 h-7 opacity-20 mx-auto mb-1 text-pastel-accent" />
                                    <p className="font-bold">No diagrams created</p>
                                    <p className="text-[9px] text-gray-450 mt-1 leading-relaxed">Highlight text in draft and click "Generate Diagram" to start.</p>
                                  </div>
                                ) : (
                                  diagramsList.map((diag) => {
                                    const isActive = activeDiagram?.id === diag.id;
                                    return (
                                      <div
                                        key={diag.id}
                                        onClick={() => {
                                          setActiveDiagram(diag);
                                          setIsEditingDiagramNode(null);
                                        }}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between hover-scale ${
                                          isActive
                                            ? 'border-pastel-accent bg-pastel-accent/10'
                                            : isDark
                                              ? 'bg-slate-900 border-pastel-darkBorder hover:border-pastel-accent/30'
                                              : 'bg-white border-gray-150 hover:border-pastel-pink/40'
                                        }`}
                                      >
                                        <div className="min-w-0 pr-2">
                                          <p className="font-bold text-[11px] text-gray-700 dark:text-gray-200 truncate">
                                            {diag.name}
                                          </p>
                                          <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">
                                            {diag.diagram_type}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteDiagram(diag.id, e)}
                                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Center visual workspace & controls */}
                            {!activeDiagram ? (
                              <div className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-3xl bg-slate-50/20 dark:bg-slate-900/5 p-8 text-center text-gray-400 h-full">
                                <Network className="w-16 h-16 mb-3 text-pastel-accent opacity-20" />
                                <h4 className="font-bold text-sm text-gray-500 dark:text-gray-300">No Diagram Selected</h4>
                                <p className="text-xs text-gray-450 mt-1 max-w-sm">
                                  Select a generated diagram from the left list, or return to your **Thesis Draft** and highlight a paragraph to generate a flowchart.
                                </p>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden h-full">
                                
                                <div className="flex-1 flex flex-col p-4 rounded-3xl border bg-white dark:bg-slate-900/40 dark:border-pastel-darkBorder shadow-sm relative overflow-hidden h-full">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2.5 text-left">
                                      <span className="text-[10px] font-black bg-pastel-accent/20 text-pastel-accent px-2 py-0.5 rounded uppercase">
                                        Canvas Viewport
                                      </span>
                                      
                                      {/* Zoom controls */}
                                      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border dark:border-pastel-darkBorder shadow-sm">
                                        <button
                                          type="button"
                                          onClick={() => setDiagramZoom(prev => Math.max(50, prev - 10))}
                                          className="px-1.5 py-0.5 text-[10px] font-bold text-gray-550 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded transition-all"
                                          title="Zoom Out"
                                        >
                                          -
                                        </button>
                                        <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-gray-400 px-1">
                                          {diagramZoom}%
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setDiagramZoom(prev => Math.min(250, prev + 10))}
                                          className="px-1.5 py-0.5 text-[10px] font-bold text-gray-550 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded transition-all"
                                          title="Zoom In"
                                        >
                                          +
                                        </button>
                                        <div className="w-[1px] h-3 bg-gray-300 dark:bg-slate-700 mx-0.5" />
                                        <button
                                          type="button"
                                          onClick={() => setDiagramZoom(100)}
                                          className="px-1.5 py-0.5 text-[9px] font-bold text-gray-550 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded transition-all"
                                          title="Reset Zoom"
                                        >
                                          Reset
                                        </button>
                                      </div>

                                      <span className="text-[9px] text-gray-450 font-medium">
                                        * Drag node cards to adjust layout.
                                      </span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                      {activeDiagram.diagram_style}
                                    </span>
                                  </div>

                                  {/* SVG Graph Canvas wrapper */}
                                  <div 
                                    className={`flex-1 rounded-2xl relative overflow-hidden border min-h-[350px] ${
                                      activeDiagram.diagram_style.toLowerCase().includes('dark') 
                                        ? 'bg-slate-950 border-slate-900' 
                                        : activeDiagram.diagram_style.toLowerCase().includes('ieee') 
                                          ? 'bg-white border-black' 
                                          : 'bg-slate-50/50 border-gray-100'
                                    }`}
                                  >
                                    {/* Grid background details */}
                                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{
                                      backgroundImage: 'radial-gradient(#475569 2px, transparent 2px)',
                                      backgroundSize: '24px 24px'
                                    }} />

                                    <svg
                                      id="diagram-svg-canvas"
                                      className="w-full h-full cursor-default select-none"
                                      onMouseMove={handleNodeDragMove}
                                      onMouseUp={handleNodeDragEnd}
                                      onMouseLeave={handleNodeDragEnd}
                                      viewBox={`${(1000 - 1000 * (100 / diagramZoom)) / 2} ${(600 - 600 * (100 / diagramZoom)) / 2} ${1000 * (100 / diagramZoom)} ${600 * (100 / diagramZoom)}`}
                                      preserveAspectRatio="xMidYMid meet"
                                    >
                                      {/* Arrowhead marker definition */}
                                      <defs>
                                        <marker
                                          id="arrow"
                                          viewBox="0 0 10 10"
                                          refX="20"
                                          refY="5"
                                          markerWidth="6"
                                          markerHeight="6"
                                          orient="auto-start-reverse"
                                        >
                                          <path 
                                            d="M 0 0 L 10 5 L 0 10 z" 
                                            fill={
                                              activeDiagram.diagram_style.toLowerCase().includes('dark') 
                                                ? '#cbd5e1' 
                                                : activeDiagram.diagram_style.toLowerCase().includes('ieee')
                                                  ? '#000000'
                                                  : '#94a3b8'
                                            } 
                                          />
                                        </marker>
                                      </defs>

                                      {/* Draw connection edges */}
                                      {activeDiagram.edges?.map((edge) => {
                                        const sourceNode = activeDiagram.nodes.find(n => n.id === edge.source);
                                        const targetNode = activeDiagram.nodes.find(n => n.id === edge.target);
                                        
                                        if (!sourceNode || !targetNode) return null;
                                        
                                        let pathD = `M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`;
                                        
                                        const midX = (sourceNode.x + targetNode.x) / 2;
                                        const midY = (sourceNode.y + targetNode.y) / 2;
                                        
                                        return (
                                          <g key={edge.id} className="group transition-opacity duration-300">
                                            <path
                                              d={pathD}
                                              fill="none"
                                              stroke={
                                                activeDiagram.diagram_style.toLowerCase().includes('ieee') 
                                                  ? '#000000' 
                                                  : activeDiagram.diagram_style.toLowerCase().includes('dark')
                                                    ? '#475569'
                                                    : '#cbd5e1'
                                              }
                                              strokeWidth={activeDiagram.diagram_style.toLowerCase().includes('ieee') ? '1.5' : '2.5'}
                                              markerEnd="url(#arrow)"
                                              className="group-hover:stroke-pastel-accent transition-colors"
                                            />
                                            
                                            {edge.label && (
                                              <g>
                                                <rect
                                                  x={midX - 45}
                                                  y={midY - 9}
                                                  width="90"
                                                  height="18"
                                                  rx="4"
                                                  fill={activeDiagram.diagram_style.toLowerCase().includes('dark') ? '#0f172a' : '#ffffff'}
                                                  stroke={
                                                    activeDiagram.diagram_style.toLowerCase().includes('ieee')
                                                      ? '#000000'
                                                      : activeDiagram.diagram_style.toLowerCase().includes('dark')
                                                        ? '#334155'
                                                        : '#e2e8f0'
                                                  }
                                                  strokeWidth="1"
                                                />
                                                <text
                                                  x={midX}
                                                  y={midY + 3}
                                                  textAnchor="middle"
                                                  className="text-[9px] font-black tracking-wider uppercase select-none pointer-events-none fill-gray-500 dark:fill-gray-400"
                                                >
                                                  {edge.label}
                                                </text>
                                              </g>
                                            )}
                                          </g>
                                        );
                                      })}

                                      {/* Draw nodes */}
                                      {activeDiagram.nodes?.map((node) => {
                                        const isDragging = draggingNodeId === node.id;
                                        const fillHex = node.color || "#6366f1";
                                        
                                        const w = Math.max(160, node.label.length * 8 + 35);
                                        const h = 54;
                                        
                                        return (
                                          <g
                                            key={node.id}
                                            transform={`translate(${node.x}, ${node.y})`}
                                            className="cursor-grab active:cursor-grabbing group"
                                            onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                                          >
                                            {activeDiagram.diagram_style.toLowerCase().includes('ieee') ? (
                                              <rect
                                                x={-w/2}
                                                y={-h/2}
                                                width={w}
                                                height={h}
                                                fill="#ffffff"
                                                stroke="#000000"
                                                strokeWidth="1.5"
                                              />
                                            ) : (
                                              <rect
                                                x={-w/2}
                                                y={-h/2}
                                                width={w}
                                                height={h}
                                                rx="12"
                                                fill={activeDiagram.diagram_style.toLowerCase().includes('dark') ? '#1e293b' : '#ffffff'}
                                                stroke={isDragging ? '#ec4899' : fillHex}
                                                strokeWidth={isDragging ? '3' : '2'}
                                                className="shadow-md hover:shadow-lg transition-shadow duration-200"
                                              />
                                            )}
                                            
                                            {!activeDiagram.diagram_style.toLowerCase().includes('ieee') && (
                                              <circle
                                                cx={-w/2 + 18}
                                                cy="0"
                                                r="5"
                                                fill={fillHex}
                                                className="animate-pulse"
                                              />
                                            )}

                                            <text
                                              x={activeDiagram.diagram_style.toLowerCase().includes('ieee') ? 0 : 8}
                                              y="3"
                                              textAnchor="middle"
                                              className={`text-[10px] font-bold select-none pointer-events-none ${
                                                activeDiagram.diagram_style.toLowerCase().includes('dark') ? 'fill-gray-100' : 'fill-slate-800'
                                              }`}
                                            >
                                              {node.label}
                                            </text>
                                          </g>
                                        );
                                      })}
                                    </svg>
                                  </div>
                                </div>

                                {/* Right control side panel */}
                                <div className="w-full lg:w-72 flex flex-col gap-5 flex-shrink-0 h-full overflow-y-auto pr-1">
                                  
                                  {/* Style selectors */}
                                  <div className="p-4 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm space-y-4">
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Diagram Name</label>
                                      <input
                                        type="text"
                                        value={activeDiagram.name}
                                        onChange={(e) => {
                                          const updated = { ...activeDiagram, name: e.target.value };
                                          setActiveDiagram(updated);
                                          handleSaveActiveDiagram(updated);
                                        }}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-150 dark:border-pastel-darkBorder focus:outline-none text-gray-700 dark:text-gray-250"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Presentation Style</label>
                                      <select
                                        value={activeDiagram.diagram_style}
                                        onChange={(e) => {
                                          const updated = { ...activeDiagram, diagram_style: e.target.value };
                                          setActiveDiagram(updated);
                                          handleSaveActiveDiagram(updated);
                                        }}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border bg-gray-50 dark:bg-slate-800 border-gray-150 dark:border-pastel-darkBorder text-gray-700 dark:text-gray-250 focus:outline-none"
                                      >
                                        <option value="Academic Block Diagram">Academic Block Diagram</option>
                                        <option value="Flowchart">Flowchart</option>
                                        <option value="Horizontal Pipeline">Horizontal Pipeline</option>
                                        <option value="Vertical Pipeline">Vertical Pipeline</option>
                                        <option value="Minimal Theme">Minimal Theme</option>
                                        <option value="IEEE Style">IEEE Style</option>
                                        <option value="Research Paper Style">Research Paper Style</option>
                                        <option value="Presentation Style">Presentation Style</option>
                                        <option value="Dark Theme">Dark Theme</option>
                                        <option value="Light Theme">Light Theme</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Node editor */}
                                  <div className="p-4 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm space-y-3.5">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Node Blocks</label>
                                      <button
                                        type="button"
                                        onClick={handleAddNewNode}
                                        className="px-2.5 py-1 bg-pastel-accent hover:bg-pastel-accent/90 text-white text-[9px] font-black rounded-lg transition-all"
                                      >
                                        + Add Block
                                      </button>
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                      {activeDiagram.nodes?.map((node) => (
                                        <div key={node.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 space-y-1.5 text-xs text-left">
                                          <div className="flex items-center justify-between">
                                            <input
                                              type="text"
                                              value={node.label}
                                              onChange={(e) => handleUpdateNodeLabel(node.id, e.target.value)}
                                              onBlur={() => handleSaveActiveDiagram(activeDiagram)}
                                              className="bg-transparent border-none font-bold text-gray-700 dark:text-gray-200 outline-none p-0 focus:ring-0 truncate w-32"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteNode(node.id)}
                                              className="text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="flex items-center space-x-1.5">
                                            <span className="text-[8px] uppercase font-bold text-gray-450">Color:</span>
                                            {["#6366f1", "#ec4899", "#10b981", "#8b5cf6", "#f97316"].map(c => (
                                              <button
                                                key={c}
                                                type="button"
                                                onClick={() => handleUpdateNodeColor(node.id, c)}
                                                className={`w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 ${
                                                  node.color === c ? 'ring-2 ring-pastel-accent' : ''
                                                }`}
                                                style={{ backgroundColor: c }}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Link edge connector */}
                                  <div className="p-4 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm space-y-3.5">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Add Connection</label>
                                    
                                    <form onSubmit={handleAddNewEdge} className="space-y-2">
                                      <select
                                        required
                                        value={newEdgeSource}
                                        onChange={(e) => setNewEdgeSource(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-slate-50 dark:bg-slate-805 border-gray-150 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-250 focus:outline-none"
                                      >
                                        <option value="">-- Source --</option>
                                        {activeDiagram.nodes?.map(n => (
                                          <option key={n.id} value={n.id}>{n.label}</option>
                                        ))}
                                      </select>
                                      
                                      <select
                                        required
                                        value={newEdgeTarget}
                                        onChange={(e) => setNewEdgeTarget(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-slate-50 dark:bg-slate-805 border-gray-150 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-250 focus:outline-none"
                                      >
                                        <option value="">-- Target --</option>
                                        {activeDiagram.nodes?.map(n => (
                                          <option key={n.id} value={n.id}>{n.label}</option>
                                        ))}
                                      </select>

                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          placeholder="Flow text (opt)"
                                          value={newEdgeLabel}
                                          onChange={(e) => setNewEdgeLabel(e.target.value)}
                                          className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-slate-50 dark:bg-slate-805 border-gray-150 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-250 focus:outline-none"
                                        />
                                        <button
                                          type="submit"
                                          className="px-3 py-1.5 bg-pastel-accent hover:bg-pastel-accent/90 text-white text-xs font-bold rounded-xl transition-all flex-shrink-0"
                                        >
                                          Link
                                        </button>
                                      </div>
                                    </form>

                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-xs">
                                      {activeDiagram.edges?.map((edge) => {
                                        const s = activeDiagram.nodes.find(n => n.id === edge.source)?.label || "Dangling";
                                        const t = activeDiagram.nodes.find(n => n.id === edge.target)?.label || "Dangling";
                                        return (
                                          <div key={edge.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-gray-100 dark:hover:border-slate-800 text-left">
                                            <span className="text-[10px] text-gray-550 truncate w-40">
                                              <strong>{s}</strong> → <strong>{t}</strong>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteEdge(edge.id)}
                                              className="text-gray-400 hover:text-red-500"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Insert & Export Options */}
                                  <div className="p-4 rounded-3xl border bg-white dark:bg-pastel-darkCard dark:border-pastel-darkBorder shadow-sm space-y-3.5">
                                    <button
                                      type="button"
                                      onClick={handleInsertDiagramIntoThesis}
                                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 hover-scale"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>Insert into Thesis</span>
                                    </button>

                                    <div className="grid grid-cols-3 gap-2">
                                      <button
                                        type="button"
                                        onClick={handleExportPNG}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-650 dark:text-gray-300 text-[10px] font-black rounded-lg border border-gray-200 dark:border-pastel-darkBorder transition-all"
                                      >
                                        PNG
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleExportSVG}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-650 dark:text-gray-300 text-[10px] font-black rounded-lg border border-gray-200 dark:border-pastel-darkBorder transition-all"
                                      >
                                        SVG
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleExportJSON}
                                        className="py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-650 dark:text-gray-300 text-[10px] font-black rounded-lg border border-gray-200 dark:border-pastel-darkBorder transition-all"
                                      >
                                        JSON
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            )}

                          </div>
                        )}
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
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-255' : 'bg-white text-gray-850 border-gray-100'
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

      {/* VIEW PAPER MODAL (PDF + Chatbot Split Panel with Tab layout inside Left column) */}
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
                    isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-55 text-gray-505'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Pane: Split tabs containing Summary, AI Evaluation report, and chatbot */}
              <div className="w-full md:w-5/12 overflow-hidden flex flex-col h-full bg-slate-50 dark:bg-slate-900/30 border-r dark:border-pastel-darkBorder">
                
                {/* Left pane inner tab selectors */}
                <div className="flex border-b dark:border-pastel-darkBorder bg-white dark:bg-pastel-darkCard flex-shrink-0">
                  <button
                    onClick={() => setActiveModalTab('summary')}
                    className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                      activeModalTab === 'summary'
                        ? 'border-pastel-accent text-pastel-accent'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                  >
                    Summary & Info
                  </button>
                  {selectedPaper.evaluation && (
                    <button
                      onClick={() => setActiveModalTab('evaluation')}
                      className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                        activeModalTab === 'evaluation'
                          ? 'border-pastel-accent text-pastel-accent'
                          : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                      }`}
                    >
                      AI Evaluation Report
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModalTab('chat')}
                    className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                      activeModalTab === 'chat'
                        ? 'border-pastel-accent text-pastel-accent'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                  >
                    Paper Chat
                  </button>
                </div>

                {/* Left pane inner dynamic views */}
                <div className="flex-1 overflow-y-auto">
                  
                  {/* Tab 1: Info & Summary */}
                  {activeModalTab === 'summary' && (
                    <div className="p-6 space-y-5 animate-fade-in">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Academic Domain</h4>
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-pastel-pink/20 text-pastel-accent border border-pastel-pink/30">
                          {selectedPaper.domain}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Author(s)</h4>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-305">{selectedPaper.author}</p>
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

                      {selectedPaper.abstract && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Abstract</h4>
                          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 text-justify">
                            {selectedPaper.abstract}
                          </p>
                        </div>
                      )}

                      {selectedPaper.summary && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">AI Summary</h4>
                          <div className={`p-4 rounded-2xl border text-xs leading-relaxed text-gray-500 dark:text-gray-400 ${
                            isDark ? 'bg-slate-900/50 border-pastel-darkBorder' : 'bg-white border-gray-150'
                          }`}>
                            {selectedPaper.summary}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: AI Evaluation Report */}
                  {activeModalTab === 'evaluation' && selectedPaper.evaluation && (
                    <div className="p-6 space-y-6 animate-fade-in">
                      
                      {/* Overall Research Score & Rating Card */}
                      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 to-pastel-pink/10 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Research Value</h4>
                            <div className="flex items-center space-x-2 mt-1.5">
                              {renderStars(selectedPaper.evaluation.overall_score)}
                              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                                {selectedPaper.evaluation.overall_score}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contribution</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase inline-block mt-1 ${
                              selectedPaper.evaluation.research_contribution === 'High'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : selectedPaper.evaluation.research_contribution === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-gray-100 text-gray-500'
                            }`}>
                              {selectedPaper.evaluation.research_contribution}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3.5 border-t border-amber-500/15 flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-450">Paper Type:</span>
                          <span className="text-gray-700 dark:text-gray-250 font-bold">{selectedPaper.evaluation.paper_type}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-450">Citation value:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold">{selectedPaper.evaluation.citation_value}</span>
                        </div>
                      </div>

                      {/* Strengths list */}
                      {selectedPaper.evaluation.strengths && selectedPaper.evaluation.strengths.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Strengths</h4>
                          <div className="space-y-2">
                            {selectedPaper.evaluation.strengths.map((str, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs">
                                <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-600 mt-0.5 flex-shrink-0">
                                  <Check className="w-3 h-3" />
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 leading-normal">{str}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weaknesses list */}
                      {selectedPaper.evaluation.weaknesses && selectedPaper.evaluation.weaknesses.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Limitations & Weaknesses</h4>
                          <div className="space-y-2">
                            {selectedPaper.evaluation.weaknesses.map((wk, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs">
                                <div className="p-0.5 rounded-full bg-red-500/10 text-red-500 mt-0.5 flex-shrink-0">
                                  <AlertTriangle className="w-3 h-3" />
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 leading-normal">{wk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Best used for */}
                      {selectedPaper.evaluation.best_for && selectedPaper.evaluation.best_for.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Best Used For</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPaper.evaluation.best_for.map((bf, idx) => (
                              <span 
                                key={idx}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15"
                              >
                                ✔ {bf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Not recommended for */}
                      {selectedPaper.evaluation.not_recommended_for && selectedPaper.evaluation.not_recommended_for.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Not Recommended For</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPaper.evaluation.not_recommended_for.map((nrf, idx) => (
                              <span 
                                key={idx}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15"
                              >
                                ✖ {nrf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Tab 3: Chat with Paper (synced with DB) */}
                  {activeModalTab === 'chat' && (
                    <div className="h-full flex flex-col justify-between">
                      
                      {/* Chat log */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px]">
                        <h4 className="text-[10px] font-bold text-pastel-accent uppercase tracking-wider flex items-center space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-pastel-accent" />
                          <span>Ollama Synced dialogue context</span>
                        </h4>

                        {modalChatHistory.length === 0 ? (
                          <div className="py-12 text-center text-gray-450">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-pastel-accent opacity-30" />
                            <p className="font-bold text-xs">Start a synchronized conversation</p>
                            <p className="text-[9px] text-gray-400/80 mt-0.5">Queries and conversation history save in the database.</p>
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
                              <span>AI is reading paper details...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input panel */}
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
                              : 'bg-slate-55 border-gray-200 text-gray-900'
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
                  )}

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

      {/* AI EVALUATION MODAL (STANDALONE DETAILS DIALOG) */}
      {selectedEvaluationPaper && selectedEvaluationPaper.evaluation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-3xl overflow-hidden p-6 shadow-2xl transition-all duration-300 border flex flex-col ${
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-200' : 'bg-white text-gray-800 border-gray-150'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-5 dark:border-pastel-darkBorder">
              <div className="overflow-hidden mr-4">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                  AI Reference Paper Evaluation
                </span>
                <h3 className="font-extrabold text-sm text-pastel-accent truncate mt-1 leading-snug">
                  {selectedEvaluationPaper.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedEvaluationPaper(null)}
                className={`p-1.5 rounded-lg border hover-scale flex-shrink-0 ${
                  isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-50 text-gray-505'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 overflow-y-auto max-h-[65vh] pr-2">
              
              {/* Score rating panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 to-pastel-pink/10 border border-amber-500/15">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Research Value Score</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    {renderStars(selectedEvaluationPaper.evaluation.overall_score)}
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {selectedEvaluationPaper.evaluation.overall_score}%
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Citation Recommendation</h4>
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block mt-1">
                    {selectedEvaluationPaper.evaluation.citation_value}
                  </span>
                </div>
                <div className="pt-2 border-t border-amber-500/10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Research Type</h4>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mt-0.5">
                    {selectedEvaluationPaper.evaluation.paper_type}
                  </span>
                </div>
                <div className="pt-2 border-t border-amber-500/10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Research Contribution</h4>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mt-0.5">
                    {selectedEvaluationPaper.evaluation.research_contribution}
                  </span>
                </div>
              </div>

              {/* Strengths list */}
              {selectedEvaluationPaper.evaluation.strengths && selectedEvaluationPaper.evaluation.strengths.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Key Strengths</h4>
                  <div className="space-y-2">
                    {selectedEvaluationPaper.evaluation.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs">
                        <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-600 mt-0.5 flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 leading-normal">{str}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses list */}
              {selectedEvaluationPaper.evaluation.weaknesses && selectedEvaluationPaper.evaluation.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Key Limitations</h4>
                  <div className="space-y-2">
                    {selectedEvaluationPaper.evaluation.weaknesses.map((wk, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs">
                        <div className="p-0.5 rounded-full bg-red-500/10 text-red-500 mt-0.5 flex-shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 leading-normal">{wk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best used for */}
              {selectedEvaluationPaper.evaluation.best_for && selectedEvaluationPaper.evaluation.best_for.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Best Used For (Thesis integration)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvaluationPaper.evaluation.best_for.map((bf, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15"
                      >
                        ✔ {bf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Not recommended for */}
              {selectedEvaluationPaper.evaluation.not_recommended_for && selectedEvaluationPaper.evaluation.not_recommended_for.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Not Recommended For</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvaluationPaper.evaluation.not_recommended_for.map((nrf, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/15"
                      >
                        ✖ {nrf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="border-t pt-4 mt-5 flex justify-end dark:border-pastel-darkBorder flex-shrink-0">
              <button
                onClick={() => setSelectedEvaluationPaper(null)}
                className="px-5 py-2.5 text-xs font-bold bg-pastel-accent text-white rounded-xl shadow-sm hover:bg-pastel-accent/90 hover-scale"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESEARCH NOVELTY ANALYZER OVERLAY MODAL */}
      {showNoveltyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-7xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 border ${
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-200' : 'bg-white text-gray-800 border-gray-150'
          }`}>
            
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between dark:border-pastel-darkBorder flex-shrink-0">
              <div className="flex items-center space-x-2 mr-4">
                <Sparkles className="w-5 h-5 text-pastel-accent animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-md text-pastel-accent leading-snug">Research Novelty Analyzer</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Evaluating thesis draft against project reference papers
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleAnalyzeNovelty}
                  disabled={analyzingNovelty}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-pastel-pink to-pastel-accent hover:from-pastel-pink/95 hover:to-pastel-accent/95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex-shrink-0 hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  <span>Run New Analysis</span>
                </button>
                <button 
                  onClick={() => {
                    if (!analyzingNovelty) {
                      setShowNoveltyModal(false);
                    }
                  }}
                  className={`p-2 rounded-xl border hover-scale ${
                    isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-55 text-gray-505'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Column: Historical Runs Sidebar */}
              <div className="w-full md:w-80 overflow-hidden flex flex-col h-full bg-slate-50 dark:bg-slate-900/30 border-r dark:border-pastel-darkBorder p-5 flex-shrink-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent mb-1 flex items-center space-x-1">
                  <span>Analysis History</span>
                </h4>
                <p className="text-[10px] text-gray-400 mb-4 font-medium">
                  Track how your novelty score changes as you update your draft.
                </p>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {loadingNoveltyHistory ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-pastel-accent" />
                      <span>Loading history...</span>
                    </div>
                  ) : noveltyReports.length === 0 ? (
                    <div className="p-5 text-center text-[11px] text-gray-400 border border-dashed border-gray-250 dark:border-pastel-darkBorder rounded-2xl">
                      <Sparkles className="w-6 h-6 opacity-20 mx-auto mb-1.5 text-pastel-accent" />
                      <p className="font-bold">No reports generated</p>
                      <p className="text-[10px] text-gray-455 mt-0.5">Click "Run New Analysis" to evaluate your draft.</p>
                    </div>
                  ) : (
                    noveltyReports.map((report) => {
                      const isActive = activeNoveltyReport?.id === report.id;
                      const dateStr = new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      const timeStr = new Date(report.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div
                          key={report.id}
                          onClick={() => {
                            if (!analyzingNovelty) {
                              setActiveNoveltyReport(report);
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between hover-scale ${
                            isActive
                              ? 'border-pastel-accent bg-pastel-accent/10'
                              : isDark
                                ? 'bg-slate-900 border-pastel-darkBorder hover:border-pastel-accent/30'
                                : 'bg-white border-gray-150 hover:border-pastel-pink/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-gray-400 font-mono">
                              Draft v{report.draft_version}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteNoveltyReport(report.id, e)}
                              className="p-1 rounded text-gray-405 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-end justify-between mt-1.5">
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-350">
                                {dateStr}
                              </p>
                              <p className="text-[9px] text-gray-400">
                                {timeStr}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-pastel-accent">
                                {report.analysis_report?.overall_similarity}%
                              </span>
                              <span className="text-[8px] block uppercase font-bold text-gray-400 tracking-wider">
                                Similarity
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Analysis Details Panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {analyzingNovelty ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-pulse min-h-[400px]">
                    <Loader2 className="w-12 h-12 animate-spin text-pastel-accent" />
                    <div>
                      <p className="font-bold text-sm text-gray-700 dark:text-gray-300">Evaluating Draft Novelty</p>
                      <p className="text-xs text-pastel-accent font-semibold mt-1 animate-pulse">
                        {noveltyMessage}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-2 max-w-xs mx-auto">
                        Ollama is comparing your thesis draft with reference papers. This takes 15–30 seconds. Please do not close this modal.
                      </p>
                    </div>
                  </div>
                ) : !activeNoveltyReport ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8 min-h-[400px]">
                    <Sparkles className="w-16 h-16 mb-4 text-pastel-accent opacity-30 animate-pulse" />
                    <h4 className="font-bold text-sm text-gray-500 dark:text-gray-300">No Analysis Loaded</h4>
                    <p className="text-xs text-gray-450 mt-1.5 max-w-md leading-relaxed">
                      Click **Run New Analysis** in the top right to analyze your current thesis draft against all uploaded reference papers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 text-left animate-fade-in">
                    
                    {/* 1. Overall Similarity Gauge & Callout */}
                    {activeNoveltyReport.analysis_report?.overall_similarity !== undefined && (
                      <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-center gap-5 ${
                        isDark ? 'bg-slate-900/50 border-pastel-darkBorder' : 'bg-gradient-to-r from-indigo-50/20 to-pastel-pink/10 border-gray-100'
                      }`}>
                        {/* Gauge / Circular representation */}
                        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              className="stroke-current text-gray-200 dark:text-gray-800"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              className="stroke-current text-pastel-accent"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={251.2}
                              strokeDashoffset={251.2 - (251.2 * activeNoveltyReport.analysis_report.overall_similarity) / 100}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-pastel-accent">
                              {activeNoveltyReport.analysis_report.overall_similarity}%
                            </span>
                            <span className="text-[7px] uppercase font-bold text-gray-400 tracking-wider">
                              Similarity
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                            1. Overall Similarity Index
                          </h4>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-relaxed">
                            {activeNoveltyReport.analysis_report.interpretation}
                          </p>
                          <p className="text-[10px] text-gray-400 italic">
                            *This similarity index is calculated relative to the reference papers collected in this project.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2. Most Similar Papers */}
                    {activeNoveltyReport.analysis_report?.most_similar_papers && activeNoveltyReport.analysis_report.most_similar_papers.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent">
                          2. Most Similar Papers (Overlap Callouts)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeNoveltyReport.analysis_report?.most_similar_papers?.map((paper, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder flex items-start justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                              <div className="space-y-1 min-w-0">
                                <p className="font-bold text-xs text-gray-700 dark:text-gray-200 truncate">{paper.title}</p>
                                <p className="text-xs text-gray-400 leading-relaxed">{paper.reason}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                                  {paper.similarity}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Common Research Themes */}
                    {activeNoveltyReport.analysis_report?.common_themes && activeNoveltyReport.analysis_report.common_themes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent">
                          3. Common Research Themes
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {activeNoveltyReport.analysis_report?.common_themes?.map((theme, i) => (
                            <span 
                              key={i} 
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-pastel-pink/20 text-pastel-accent border border-pastel-pink/30"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Potential Contributions */}
                    {activeNoveltyReport.analysis_report?.potential_contributions && activeNoveltyReport.analysis_report.potential_contributions.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent">
                          4. Potential Research Contributions
                        </h4>
                        <div className="border border-gray-150 dark:border-pastel-darkBorder rounded-2xl overflow-hidden divide-y divide-gray-150 dark:divide-pastel-darkBorder text-xs">
                          <div className="grid grid-cols-2 font-black uppercase text-[9px] tracking-wider text-gray-400 bg-slate-50 dark:bg-slate-900/40 p-3">
                            <div>Current Reference Papers</div>
                            <div className="border-l border-gray-150 dark:border-pastel-darkBorder pl-3">Your Thesis Draft</div>
                          </div>
                          {activeNoveltyReport.analysis_report?.potential_contributions?.map((item, i) => (
                            <div key={i} className="grid grid-cols-2 p-3.5 leading-relaxed text-gray-500 dark:text-gray-400">
                              <div className="pr-3">{item.current_papers}</div>
                              <div className="border-l border-gray-150 dark:border-pastel-darkBorder pl-3 font-semibold text-pastel-accent">
                                {item.your_research}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Similar Sections & 6. Unique Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Similar Sections */}
                      {activeNoveltyReport.analysis_report?.similar_sections && activeNoveltyReport.analysis_report.similar_sections.length > 0 && (
                        <div className={`p-4 rounded-2xl border ${
                          isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-rose-50/10 border-rose-100'
                        }`}>
                          <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3">
                            5. Sections with High Overlap
                          </h4>
                          <div className="space-y-3">
                            {activeNoveltyReport.analysis_report?.similar_sections?.map((item, i) => (
                              <div key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-500">{item.section}</p>
                                <p>{item.overlap}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unique Sections */}
                      {activeNoveltyReport.analysis_report?.unique_sections && activeNoveltyReport.analysis_report.unique_sections.length > 0 && (
                        <div className={`p-4 rounded-2xl border ${
                          isDark ? 'bg-slate-900/40 border-pastel-darkBorder' : 'bg-emerald-50/10 border-emerald-100'
                        }`}>
                          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                            6. Unique/Differentiated Sections
                          </h4>
                          <div className="space-y-3">
                            {activeNoveltyReport.analysis_report?.unique_sections?.map((item, i) => (
                              <div key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                <p className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-500">{item.section}</p>
                                <p>{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* 7. Missing Contributions */}
                    {activeNoveltyReport.analysis_report?.missing_contributions && activeNoveltyReport.analysis_report.missing_contributions.length > 0 && (
                      <div className={`p-4 rounded-2xl border ${
                        isDark ? 'bg-slate-900/30 border-pastel-darkBorder' : 'bg-rose-500/5 border-rose-500/10'
                      }`}>
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-455 mb-2.5 flex items-center space-x-1.5">
                          <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                          <span>7. Suggested Thesis Extensions (Missing Elements)</span>
                        </h4>
                        <ul className="space-y-2">
                          {activeNoveltyReport.analysis_report?.missing_contributions?.map((item, i) => (
                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex items-start space-x-2">
                              <span className="text-rose-500 font-bold mt-0.5">&bull;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 8. Research Gap Alignment */}
                    {activeNoveltyReport.analysis_report?.gap_alignment && (
                      <div className="p-4 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder space-y-3.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent flex items-center space-x-1.5">
                          <Clock className="w-4.5 h-4.5 text-pastel-accent" />
                          <span>8. Reference Gap Alignment Check</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Gaps Detected */}
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1">
                            <p className="font-extrabold uppercase text-[9px] tracking-wider text-gray-400">Gaps in Literature</p>
                            <ul className="space-y-1 text-gray-550 dark:text-gray-400">
                              {activeNoveltyReport.analysis_report?.gap_alignment?.gaps_detected?.map((g, i) => (
                                <li key={i} className="flex items-start space-x-1.5">
                                  <span className="text-gray-400">•</span>
                                  <span>{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Gaps Addressed */}
                          <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl space-y-1">
                            <p className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-600">Addressed by you</p>
                            <ul className="space-y-1 text-gray-550 dark:text-gray-400">
                              {activeNoveltyReport.analysis_report?.gap_alignment?.addressed?.map((g, i) => (
                                <li key={i} className="flex items-start space-x-1.5">
                                  <span className="text-emerald-500 font-bold">✓</span>
                                  <span className="font-medium text-gray-700 dark:text-gray-255">{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Gaps Missing */}
                          <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl space-y-1">
                            <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-605">Still Missing</p>
                            <ul className="space-y-1 text-gray-550 dark:text-gray-400">
                              {activeNoveltyReport.analysis_report?.gap_alignment?.missing?.map((g, i) => (
                                <li key={i} className="flex items-start space-x-1.5">
                                  <span className="text-rose-500 font-bold">⚠️</span>
                                  <span>{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 9. Improvement Suggestions */}
                    {activeNoveltyReport.analysis_report?.improvement_suggestions && activeNoveltyReport.analysis_report.improvement_suggestions.length > 0 && (
                      <div className="p-5 rounded-2xl border border-gray-150 dark:border-pastel-darkBorder space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-pastel-accent flex items-center space-x-1.5">
                          <Award className="w-4.5 h-4.5 text-pastel-accent" />
                          <span>9. Actionable Thesis Improvement Plan</span>
                        </h4>
                        <div className="space-y-2.5">
                          {activeNoveltyReport.analysis_report?.improvement_suggestions?.map((sug, i) => (
                            <div key={i} className="flex items-start space-x-2.5 text-xs">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-pastel-accent focus:ring-pastel-accent cursor-pointer"
                              />
                              <span className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">{sug}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 10. AI Conclusion */}
                    {activeNoveltyReport.analysis_report?.conclusion && (
                      <div className={`p-5 rounded-3xl border ${
                        isDark ? 'bg-slate-900 border-pastel-darkBorder' : 'bg-gradient-to-r from-amber-500/15 to-pastel-pink/15 border-amber-500/20'
                      }`}>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2 flex items-center space-x-1.5">
                          <Star className="w-4.5 h-4.5 text-amber-500 animate-spin" />
                          <span>10. Academic Synthesis & Advisor Conclusion</span>
                        </h4>
                        <p className="text-xs text-gray-700 dark:text-gray-250 leading-relaxed font-semibold">
                          {activeNoveltyReport.analysis_report.conclusion}
                        </p>
                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t dark:border-pastel-darkBorder flex justify-end flex-shrink-0">
              <button
                type="button"
                disabled={analyzingNovelty}
                onClick={() => setShowNoveltyModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-pastel-accent text-white hover:bg-pastel-accent/95 hover-scale shadow-sm disabled:opacity-50"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI DIAGRAM GENERATION OPTION SELECTION MODAL */}
      {showDiagramModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden p-6 shadow-2xl transition-all duration-300 border flex flex-col ${
            isDark ? 'bg-pastel-darkCard border-pastel-darkBorder text-gray-200' : 'bg-white text-gray-800 border-gray-150'
          }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5 mb-4 dark:border-pastel-darkBorder">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-pastel-accent" />
                <h3 className="font-extrabold text-sm text-pastel-accent leading-snug">
                  Create Research Diagram
                </h3>
              </div>
              <button 
                onClick={() => setShowDiagramModal(false)}
                className={`p-1.5 rounded-lg border hover-scale flex-shrink-0 ${
                  isDark ? 'border-pastel-darkBorder hover:bg-gray-800 text-gray-400' : 'border-gray-150 hover:bg-gray-55 text-gray-505'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection info */}
            {diagramSelectionText ? (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded tracking-wider">
                  Text Excerpt Selected
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic mt-1.5 line-clamp-3">
                  "{diagramSelectionText}"
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
                <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded tracking-wider">
                  No Selection - Using Full Draft
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                  The diagram will be generated by analyzing your entire thesis draft. Highlight a specific paragraph first to target a specific section.
                </p>
              </div>
            )}

            {/* Context recommendations */}
            {recommendedReason && (
              <div className="mb-4 p-3 bg-gradient-to-r from-pastel-pink/10 to-pastel-green/10 border border-pastel-pink/15 rounded-2xl text-left text-xs space-y-1">
                <p className="font-extrabold text-pastel-accent uppercase text-[9px] tracking-wider">Heuristic Recommendation</p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  We suggest generating a <span className="font-bold text-pastel-accent">{recommendedDiagramType}</span>.
                </p>
                <p className="text-[10px] text-gray-400 italic font-medium leading-relaxed">* {recommendedReason}</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Diagram Type</label>
                <select
                  value={diagramType}
                  onChange={(e) => setDiagramType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border bg-slate-50 dark:bg-slate-800 border-gray-150 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-250 focus:outline-none"
                >
                  <option value="System Architecture">System Architecture</option>
                  <option value="Workflow Diagram">Workflow Diagram</option>
                  <option value="Research Pipeline">Research Pipeline</option>
                  <option value="Methodology Flowchart">Methodology Flowchart</option>
                  <option value="Experimental Setup">Experimental Setup</option>
                  <option value="Data Flow Diagram">Data Flow Diagram</option>
                  <option value="Block Diagram">Block Diagram</option>
                  <option value="Sequence Diagram">Sequence Diagram</option>
                  <option value="Class Diagram">Class Diagram</option>
                  <option value="Entity Relationship Diagram (ERD)">Entity Relationship Diagram (ERD)</option>
                  <option value="Network Architecture">Network Architecture</option>
                  <option value="Deployment Architecture">Deployment Architecture</option>
                  <option value="Timeline Diagram">Timeline Diagram</option>
                  <option value="Decision Flowchart">Decision Flowchart</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Visual Presentation Style</label>
                <select
                  value={diagramStyle}
                  onChange={(e) => setDiagramStyle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border bg-slate-50 dark:bg-slate-800 border-gray-150 dark:border-pastel-darkBorder text-gray-750 dark:text-gray-250 focus:outline-none"
                >
                  <option value="Academic Block Diagram">Academic Block Diagram</option>
                  <option value="Flowchart">Flowchart</option>
                  <option value="Horizontal Pipeline">Horizontal Pipeline</option>
                  <option value="Vertical Pipeline">Vertical Pipeline</option>
                  <option value="Minimal Theme">Minimal Theme</option>
                  <option value="IEEE Style">IEEE Style</option>
                  <option value="Research Paper Style">Research Paper Style</option>
                  <option value="Presentation Style">Presentation Style</option>
                  <option value="Dark Theme">Dark Theme</option>
                  <option value="Light Theme">Light Theme</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-2.5 mt-6 border-t pt-4 dark:border-pastel-darkBorder">
              <button
                onClick={() => setShowDiagramModal(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border hover-scale ${
                  isDark ? 'border-pastel-darkBorder text-gray-400 hover:bg-gray-800' : 'border-gray-150 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDiagram}
                className="px-5 py-2 text-xs font-bold bg-pastel-accent hover:bg-pastel-accent/95 text-white rounded-xl shadow-sm hover-scale"
              >
                Generate Diagram
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}