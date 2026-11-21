import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  HelpCircle,
  FileSpreadsheet,
  GraduationCap,
  PlusCircle,
  FileUp,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { title: 'Enrolled Students', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', change: '+4 this week' },
    { title: 'Questions in Bank', value: '185', icon: HelpCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', change: 'PMP: 120 | MPA: 65' },
    { title: 'Active Exams', value: '3', icon: FileSpreadsheet, color: 'text-purple-600', bg: 'bg-purple-50', change: '2 PMP, 1 MPA' },
    { title: 'Pending Grading', value: '5', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50', change: 'Requires review' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/30 text-brand-200 border border-brand-400/30">
              Instructor Administration
            </span>
            <h1 className="text-2xl font-bold mt-2">Welcome back, {user?.name || 'Instructor'}!</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Manage your PMP and MPA questions, schedule live examination sessions, review answers, and monitor cohort performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/instructor/exams/create')}
              className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Exam</span>
            </button>
            <button
              onClick={() => navigate('/instructor/import')}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/20 transition-colors"
            >
              <FileUp className="w-4 h-4" />
              <span>Import Word / Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module 1: Questions */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Question Bank Management</h4>
            <p className="text-xs text-slate-600 mt-1">
              Author single-choice, multiple-choice, and essay questions with bilingual English & Arabic explanations.
            </p>
          </div>
          <button
            onClick={() => navigate('/instructor/questions')}
            className="mt-4 flex items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            <span>Open Question Bank</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 2: File Import */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <FileUp className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Batch Question Import</h4>
            <p className="text-xs text-slate-600 mt-1">
              Upload .docx or .xlsx files, validate parsed questions, edit mistakes directly in table preview, and bulk import.
            </p>
          </div>
          <button
            onClick={() => navigate('/instructor/import')}
            className="mt-4 flex items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            <span>Import Questions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 3: Exam Builder */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Exam Builder & Scheduling</h4>
            <p className="text-xs text-slate-600 mt-1">
              Construct timed exams with manual selection or random pool generation, pass thresholds, and attempt limits.
            </p>
          </div>
          <button
            onClick={() => navigate('/instructor/exams')}
            className="mt-4 flex items-center justify-between text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            <span>Manage Exams</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
