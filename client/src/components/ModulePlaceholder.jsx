import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ModulePlaceholder = ({ title, moduleName, phase }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl p-10 border border-slate-200 text-center max-w-2xl mx-auto my-8 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
        {phase || 'P'}
      </div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="text-slate-500 text-sm mt-2">
        The <span className="font-semibold text-slate-700">{moduleName}</span> module is scheduled for implementation in <strong>{phase || 'upcoming phase'}</strong> according to the project roadmap.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-6 inline-flex items-center space-x-2 text-sm text-brand-600 font-semibold hover:text-brand-700"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
