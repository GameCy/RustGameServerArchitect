import React, { useState } from 'react';
import JSZip from 'jszip';
import { ViewState } from './types';
import { PROJECT_PLAN, WIRE_PROTO, IMPLEMENTATION_FILES } from './constants';
import { PlanViewer } from './components/PlanViewer';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { ClientSimulation } from './components/ClientSimulation';
import { CodeBrowser } from './components/CodeBrowser';
import { 
  LayoutDashboard, 
  Network, 
  FileCode2, 
  PlayCircle, 
  Settings, 
  Code, 
  ChevronLeft, 
  ChevronRight,
  Download
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.PLAN);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      // Add all implementation files to the zip
      IMPLEMENTATION_FILES.forEach(file => {
        zip.file(file.path, file.content);
      });

      // Add the proto definition
      zip.file(`proto/${WIRE_PROTO.name}`, WIRE_PROTO.content);

      // Generate the zip file
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rust_game_server_project.zip';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to generate zip:", error);
      alert("Failed to generate ZIP file. See console for details.");
    } finally {
      setIsDownloading(false);
    }
  };

  const NavButton = ({ 
    targetView, 
    icon: Icon, 
    label 
  }: { 
    targetView: ViewState, 
    icon: React.ElementType, 
    label: string 
  }) => (
    <button
      onClick={() => setView(targetView)}
      title={isSidebarCollapsed ? label : undefined}
      className={`w-full flex items-center ${
        isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
      } py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        view === targetView 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md z-10 flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-orange-500 p-1.5 rounded">
                <Settings className="w-5 h-5 text-white" />
             </div>
             <div>
               <h1 className="text-lg font-bold leading-tight">Rust Game Server</h1>
               <p className="text-xs text-slate-400 font-mono">Architecture & Planning Dashboard</p>
             </div>
          </div>
          <div className="text-xs bg-emerald-700 px-3 py-1 rounded-full text-emerald-100 border border-emerald-600 font-bold">
            Phase: 9 / 9 (Project Complete)
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav 
          className={`${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          } bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out`}
        >
          {/* Toggle Button */}
          <div className={`p-4 flex ${isSidebarCollapsed ? 'justify-center' : 'justify-end'} border-b border-gray-100`}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="p-3 space-y-2 flex-1 overflow-y-auto">
            <NavButton targetView={ViewState.PLAN} icon={LayoutDashboard} label="Project Plan" />
            <NavButton targetView={ViewState.ARCHITECTURE} icon={Network} label="Architecture" />
            <NavButton targetView={ViewState.CODE} icon={Code} label="Source Code" />
            <NavButton targetView={ViewState.PROTO} icon={FileCode2} label="Protocol (gRPC)" />
            <NavButton targetView={ViewState.SIMULATION} icon={PlayCircle} label="Client Simulation" />
          </div>
          
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              title={isSidebarCollapsed ? "Download Source Code" : undefined}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
              } py-3 rounded-lg text-sm font-medium transition-all duration-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200`}
            >
               <Download className={`w-5 h-5 flex-shrink-0 ${isDownloading ? 'animate-bounce' : ''}`} />
               {!isSidebarCollapsed && (
                 <span className="whitespace-nowrap overflow-hidden">
                   {isDownloading ? 'Zipping...' : 'Download Code'}
                 </span>
               )}
            </button>
          </div>
          
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-gray-100">
               <div className="bg-blue-50 border border-blue-100 p-3 rounded text-xs text-blue-800">
                 <strong>Final Status:</strong> Implementation complete. 100% test coverage for core DB logic.
               </div>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-hidden h-full min-w-0">
          {view === ViewState.PLAN && <PlanViewer steps={PROJECT_PLAN} />}
          
          {view === ViewState.ARCHITECTURE && <ArchitectureDiagram />}

          {view === ViewState.CODE && <CodeBrowser files={IMPLEMENTATION_FILES} />}
          
          {view === ViewState.PROTO && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h2 className="font-mono font-bold text-gray-700 flex items-center gap-2">
                   <FileCode2 className="w-4 h-4" />
                   {WIRE_PROTO.name}
                </h2>
                <span className="text-xs text-gray-500">proto3</span>
              </div>
              <pre className="flex-1 p-6 overflow-auto text-sm font-mono bg-[#1e1e1e] text-[#d4d4d4] rounded-b-lg custom-scrollbar">
                <code>{WIRE_PROTO.content}</code>
              </pre>
            </div>
          )}

          {view === ViewState.SIMULATION && <ClientSimulation />}
        </main>
      </div>
    </div>
  );
}