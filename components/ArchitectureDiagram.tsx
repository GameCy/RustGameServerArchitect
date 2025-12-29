import React from 'react';
import { Database, Server, Cpu, Layers, ArrowRight, ShieldCheck, FileText, KeyRound } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">System Architecture: Session-Aware gRPC</h2>
      
      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 h-auto">
        
        {/* Client Side */}
        <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="text-purple-600" />
            <h3 className="font-bold text-lg text-gray-700">Authenticated Client</h3>
          </div>
          
          <div className="space-y-4">
             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
               <div className="text-sm font-semibold text-gray-500 mb-1">State Management</div>
               <div className="text-xs text-gray-600 italic">Stores: access_token, refresh_token</div>
             </div>
             
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
               <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2">
                 <ShieldCheck className="w-4 h-4" />
                 Signed Requests
               </div>
               <div className="text-xs text-blue-600">
                 All RPCs include JWT in metadata for validation.
               </div>
             </div>
          </div>
        </div>

        {/* Connection Arrow */}
        <div className="flex flex-col items-center justify-center gap-2">
           <ArrowRight className="text-gray-400 w-8 h-8 hidden lg:block" />
           <div className="lg:hidden rotate-90 my-2"><ArrowRight className="text-gray-400 w-8 h-8" /></div>
        </div>

        {/* Server Side */}
        <div className="flex-[2] bg-slate-50 border-2 border-slate-300 rounded-xl p-6 relative">
          <div className="absolute -top-3 left-6 bg-slate-700 text-white px-3 py-1 text-sm rounded-full font-bold">
            Rust Game Server Core
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 h-full">
            
            {/* Service Layer */}
            <div className="flex flex-col gap-4">
               <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="text-indigo-600" />
                    <h4 className="font-bold text-gray-700">Tonic Service Trait</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 font-mono">
                      1. JWT.verify(RS256)
                    </div>
                    <div className="text-[10px] bg-orange-50 text-orange-700 p-2 rounded border border-orange-100 font-mono">
                      2. DB.check_session(token)
                    </div>
                  </div>
               </div>
            </div>

            {/* Data Layer */}
            <div className="flex flex-col gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col">
                 <div className="flex items-center gap-2 mb-3">
                    <Database className="text-green-600" />
                    <h4 className="font-bold text-gray-700">Persistence (SQLite)</h4>
                 </div>
                 <div className="space-y-2 mt-auto">
                    <div className="bg-slate-900 text-slate-300 p-3 rounded font-mono text-[9px]">
                      <span className="text-purple-400">TABLE</span> users (...)<br/>
                      <span className="text-purple-400">TABLE</span> sessions (<br/>
                      &nbsp;&nbsp;id, user_id,<br/>
                      &nbsp;&nbsp;<span className="text-emerald-400">access_token</span>,<br/>
                      &nbsp;&nbsp;<span className="text-emerald-400">refresh_token</span><br/>
                      )
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 italic">
                      <KeyRound className="w-3 h-3" /> Token Whitelisting Enabled
                    </div>
                 </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};