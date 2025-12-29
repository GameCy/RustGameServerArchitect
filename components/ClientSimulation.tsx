import React, { useState, useEffect, useRef } from 'react';
import { Send, Upload, Terminal, ShieldCheck, Key, RefreshCw, FileText, CheckCircle, Loader2, Lock, Database, AlertCircle, Trash2, LogOut, Terminal as CliIcon } from 'lucide-react';
import { MockLog, FileUploadStatus } from '../types';

export const ClientSimulation: React.FC = () => {
  const [logs, setLogs] = useState<MockLog[]>([]);
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [username, setUsername] = useState('GameDev_01');
  const [message, setMessage] = useState('');
  const [sessionInDb, setSessionInDb] = useState(false);
  const [isCliMode, setIsCliMode] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<FileUploadStatus>({
    fileName: '',
    progress: 0,
    status: 'IDLE'
  });
  
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: MockLog['type'] = 'INFO', source: MockLog['source'] = 'CLIENT') => {
    const newLog: MockLog = {
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleLogin = () => {
    if (!username) return;
    if (isCliMode) addLog(`$ ./test_client login --username ${username} --pass *****`, 'INFO', 'CLIENT');
    addLog(`Handshake: LoginRequest for ${username}`, 'INFO');
    
    setTimeout(() => {
      addLog('DB: Found user record.', 'INFO', 'DB');
      addLog('JWT: Issued RS256 token pair.', 'INFO', 'SERVER');
      addLog('DB: Whitelisted session mapping.', 'INFO', 'DB');
      
      const mockAccess = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({sub: "123", exp: Math.floor(Date.now()/1000) + 1800, type: "access"}))}.signature`;
      const mockRefresh = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({sub: "123", exp: Math.floor(Date.now()/1000) + 1209600, type: "refresh"}))}.signature`;
      
      setTokens({ access: mockAccess, refresh: mockRefresh });
      setSessionInDb(true);
      if (isCliMode) addLog('Success: LoginResponse { access_token: "..." }', 'SUCCESS', 'SERVER');
      addLog('Session active.', 'SUCCESS', 'CLIENT');
    }, 1000);
  };

  const handleRefreshToken = () => {
    if (!tokens || isRefreshing) return;
    setIsRefreshing(true);
    if (isCliMode) addLog(`$ ./test_client refresh --token ${tokens.refresh.slice(0, 8)}...`, 'INFO', 'CLIENT');
    
    setTimeout(() => {
      if (!sessionInDb) {
        addLog('SERVER: 401 Unauthenticated - Revoked session.', 'ERROR', 'SERVER');
        setIsRefreshing(false);
        return;
      }
      const newAccess = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({sub: "123", exp: Math.floor(Date.now()/1000) + 1800, type: "access", rot: "R1"}))}.sig`;
      setTokens(prev => prev ? { ...prev, access: newAccess } : null);
      addLog('DB: Atomically rotated tokens.', 'SUCCESS', 'DB');
      setIsRefreshing(false);
    }, 1200);
  };

  const handleLogout = () => {
     if (!tokens) return;
     addLog(`RPC: Logout(...)`, 'INFO', 'CLIENT');
     setTimeout(() => {
       addLog('DB: Mapping deleted.', 'INFO', 'DB');
       setTokens(null);
       setSessionInDb(false);
       addLog('Session purged.', 'WARN', 'SERVER');
     }, 600);
  };

  const handleSendMessage = () => {
    if (!message || !tokens) return;
    if (isCliMode) addLog(`$ ./test_client send --token ${tokens.access.slice(0, 8)}... --msg "${message}"`, 'INFO', 'CLIENT');
    
    setTimeout(() => {
      if (!sessionInDb) {
        addLog('DB: Revoked token detected.', 'ERROR', 'DB');
      } else {
        addLog('Msg Recv: ' + message, 'SUCCESS', 'SERVER');
        setMessage('');
      }
    }, 600);
  };

  return (
    <div className="flex h-full gap-6">
      <div className="w-2/5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar text-gray-800">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Database className="w-4 h-4 text-emerald-600" />
              Integration Suite
            </h3>
            <button 
              onClick={() => setIsCliMode(!isCliMode)}
              className={`text-[9px] px-2 py-1 rounded flex items-center gap-1 font-bold border transition ${
                isCliMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <CliIcon className="w-3 h-3" />
              CLI LOGS: {isCliMode ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {!tokens ? (
            <div className="space-y-3">
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleLogin}
                className="w-full bg-slate-800 text-white rounded py-2 text-sm font-medium hover:bg-slate-900 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Initialize Connection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Key className="w-3 h-3" /> Live JWT
                  </span>
                  <span className={`text-[9px] font-bold ${sessionInDb ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {sessionInDb ? 'WHITELISTED' : 'REVOKED'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono truncate bg-white p-1 rounded border border-slate-100">
                  {tokens.access}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleRefreshToken}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 rounded py-2 text-[10px] font-bold hover:bg-slate-200 transition"
                >
                  {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  REFRESH
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 bg-rose-50 text-rose-700 border border-rose-100 rounded py-2 text-[10px] font-bold hover:bg-rose-100 transition"
                >
                  <LogOut className="w-3 h-3" /> LOGOUT
                </button>
              </div>

              {sessionInDb && (
                <button 
                  onClick={() => setSessionInDb(false)}
                  className="w-full flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 text-[9px] font-bold p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> FORCE REMOTE REVOCATION
                </button>
              )}
            </div>
          )}
        </div>

        <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex-1 ${!tokens ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
           <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-blue-600" />
            Integration Commands
          </h3>
          
          <div className="space-y-4">
             <div>
               <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Send Message RPC</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                   placeholder="Payload..."
                   className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                 />
                 <button 
                   onClick={handleSendMessage}
                   className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
                 >
                   <Send className="w-4 h-4" />
                 </button>
               </div>
             </div>

             <button 
                onClick={() => {
                  addLog('RPC: UploadFile(Stream) requested.', 'INFO');
                  setTimeout(() => addLog('Asset package streaming via test_client...', 'INFO', 'CLIENT'), 500);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Upload className="w-4 h-4" />
                RUN UPLOAD SMOKE TEST
              </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-lg shadow-xl border border-slate-800 p-4 font-mono text-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
           <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <CliIcon className="w-3 h-3" /> Integrated Console Output
           </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
           {logs.map(log => (
             <div key={log.id} className="flex gap-3 text-[11px] leading-tight">
               <span className="text-slate-700 shrink-0 select-none">[{log.timestamp}]</span>
               <span className={`shrink-0 font-bold w-12 text-center rounded-[2px] px-1 ${
                  log.source === 'CLIENT' ? 'bg-blue-500/10 text-blue-400' : 
                  log.source === 'DB' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
               }`}>
                 {log.source}
               </span>
               <span className={`${
                 log.type === 'SUCCESS' ? 'text-emerald-400 font-medium' : 
                 log.type === 'ERROR' ? 'text-rose-400 font-bold' :
                 log.type === 'WARN' ? 'text-amber-300 font-medium italic' : 'text-slate-400'
               }`}>
                 {log.message}
               </span>
             </div>
           ))}
           <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};