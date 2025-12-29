import React, { useState } from 'react';
import { CodeFile } from '../types';
import { FileCode, Folder, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface CodeBrowserProps {
  files: CodeFile[];
}

export const CodeBrowser: React.FC<CodeBrowserProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(files[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group files by simplified folder structure for display (flat list with visual nesting)
  const renderFileList = () => {
    return (
      <div className="space-y-1">
        {files.map((file) => {
          const isSelected = selectedFile.path === file.path;
          return (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                isSelected 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <FileCode className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
              <span className="font-mono truncate">{file.name}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-gray-900 text-gray-300 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-bold text-gray-100 flex items-center gap-2">
            <Folder className="w-5 h-5 text-yellow-500" />
            Project Files
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {renderFileList()}
        </div>
      </div>

      {/* Code Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-400">{selectedFile.path}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-[#1e1e1e] p-6 custom-scrollbar">
          <pre className="font-mono text-sm leading-relaxed text-[#d4d4d4]">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};