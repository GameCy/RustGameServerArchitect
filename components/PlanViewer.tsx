import React from 'react';
import { ProjectStep } from '../types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface PlanViewerProps {
  steps: ProjectStep[];
}

export const PlanViewer: React.FC<PlanViewerProps> = ({ steps }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Implementation Plan</h2>
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className="relative pl-8 border-l-2 border-gray-200 last:border-0 pb-6">
             <div className="absolute -left-[9px] top-0 bg-white">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : index === 2 ? ( // Mocking current step
                  <Clock className="w-5 h-5 text-blue-500" />
                ) : (
                   <Circle className="w-5 h-5 text-gray-300" />
                )}
             </div>
             <div className="flex flex-col">
                <h3 className={`text-lg font-semibold ${step.completed ? 'text-gray-800 line-through decoration-gray-400' : 'text-gray-800'}`}>
                  {step.id}. {step.title}
                </h3>
                <ul className="mt-2 space-y-1">
                  {step.details.map((detail, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                   {step.completed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                   ) : index === 2 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        In Progress
                      </span>
                   ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Pending
                      </span>
                   )}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};