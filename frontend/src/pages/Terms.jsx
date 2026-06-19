import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Shield } from 'lucide-react';
import logo from '../assets/Logo.PNG';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between relative overflow-hidden">
      {/* Soft background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pastel-pink/10 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pastel-green/10 rounded-full blur-[120px] -z-10"></div>

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link to="/login" className="flex items-center space-x-3.5">
          <img src={logo} alt="ResearchMate AI Logo" className="w-9 h-9 object-contain" />
          <span className="font-extrabold text-xl bg-gradient-to-r from-pastel-accent to-pink-500 bg-clip-text text-transparent tracking-tight">
            ResearchMateAI
          </span>
        </Link>
        <Link 
          to="/login" 
          className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-pastel-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-3xl mx-auto px-6 py-8 flex-1 flex flex-col justify-center z-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-12 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center space-x-3.5 mb-6">
            <div className="p-2.5 rounded-xl bg-pastel-pink/20 text-pastel-accent">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Terms and Conditions</h1>
          </div>

          <p className="text-xs text-gray-400 font-semibold mb-6">Last Updated: June 19, 2026</p>

          <div className="space-y-6 text-sm text-gray-600 leading-relaxed max-h-[50vh] overflow-y-auto pr-4">
            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base">1. Acceptance of Terms</h3>
              <p>
                By creating an account or logging into ResearchMate AI, you agree to comply with and be bound by these Terms and Conditions. If you do not accept these terms, you may not access or use the application services.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base">2. User Privacy and Security</h3>
              <p>
                ResearchMate AI values data confidentiality. All user credentials, document structures, and session activity logs are secured using AES-256 database-level encryption. You are responsible for safeguarding your login credentials.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base">3. Acceptable Use of Thesis Workspace</h3>
              <p>
                Users are permitted to upload academic papers, write abstracts, and manage active sessions within their secure workspace. Uploading malicious programs, copyright-violating files, or attempting unauthorized database modifications is strictly prohibited.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base">4. Session Management</h3>
              <p>
                Active sessions are tracked in real-time. Unused sessions expire automatically in 7 days. ResearchMate AI allows users to view and manually revoke sessions from other devices to protect account integrity.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-base">5. Changes to the Service</h3>
              <p>
                We reserve the right to modify or withdraw features of ResearchMate AI, including future AI assistance subsystems, thesis building templates, and cloud storage properties, without prior notification.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Complies with security audits</span>
            </div>
            <Link 
              to="/login"
              className="py-3 px-6 bg-pastel-accent hover:bg-pastel-accent/90 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-pastel-pink/20 hover-scale text-center"
            >
              Understand & Return
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-gray-400 font-medium z-10">
        &copy; {new Date().getFullYear()} ResearchMateAI &bull; Secure Academic Workspace.
      </footer>
    </div>
  );
}
