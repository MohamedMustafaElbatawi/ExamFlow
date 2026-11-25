import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Lock,
  Edit,
  Trash2,
  FileSpreadsheet,
  Eye,
  Key,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { AddStudentModal } from '../../components/students/AddStudentModal';
import { EditStudentModal } from '../../components/students/EditStudentModal';
import { ResetPasswordModal } from '../../components/students/ResetPasswordModal';
import { StudentDetailsModal } from '../../components/students/StudentDetailsModal';
import { formatDate } from '../../utils/formatters';

export const StudentManagement = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Confirmation Modals
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'toggle_status' | 'deactivate', student }

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentService.getStudents({
        search,
        category: categoryFilter,
        status: statusFilter,
        includeDeleted: statusFilter === 'deactivated' || statusFilter === 'all',
        page,
        limit: 15,
      });
      if (res.success) {
        setStudents(res.students);
        setTotalPages(res.totalPages);
        setTotalStudents(res.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل تحميل بيانات الطلاب' : 'Failed to fetch student directory'));
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page, isAr]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleStatusToggle = async (student) => {
    const nextStatus = student.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await studentService.updateStatus(student._id, nextStatus);
      if (res.success) {
        showToast(
          isAr
            ? `تم ${nextStatus === 'active' ? 'تفعيل' : 'تعليق'} حساب الطالب بنجاح`
            : `Student account ${nextStatus} successfully`
        );
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل تعديل حالة الطالب' : 'Failed to change student status'));
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeactivate = async (student) => {
    try {
      const res = await studentService.deleteStudent(student._id);
      if (res.success) {
        showToast(
          isAr
            ? 'تم تعطيل الطالب بنجاح مع الاحتفاظ بكافة سجلاته الامتحانية'
            : 'Student successfully deactivated (historical records preserved)'
        );
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || (isAr ? 'فشل تعطيل حساب الطالب' : 'Failed to deactivate student'));
    } finally {
      setConfirmAction(null);
    }
  };

  // Metrics calculation from current list
  const activeCount = students.filter((s) => s.status === 'active').length;
  const pmpCount = students.filter((s) => s.category === 'PMP' || s.category === 'Both').length;
  const mpaCount = students.filter((s) => s.category === 'MPA' || s.category === 'Both').length;
  const suspendedCount = students.filter((s) => s.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 rtl:space-x-reverse border border-emerald-500/30 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {t('instructor.students.title')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('instructor.students.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Add Student Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('instructor.students.addStudentBtn')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.students.totalStudentsCount')}</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{totalStudents}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.students.pmpTrackCount')}</span>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{pmpCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.students.mpaTrackCount')}</span>
          <h3 className="text-xl font-bold text-purple-600 mt-1">{mpaCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">{t('instructor.students.suspendedCount')}</span>
          <h3 className="text-xl font-bold text-amber-600 mt-1">{suspendedCount}</h3>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 left-3 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('instructor.students.searchPlaceholder')}
            className="w-full pl-9 pr-9 rtl:pl-9 rtl:pr-9 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-2.5 right-3 rtl:right-auto rtl:left-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">{t('instructor.students.allTracks')}</option>
            <option value="PMP">PMP</option>
            <option value="MPA">MPA</option>
            <option value="Both">Both (PMP & MPA)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">{t('instructor.students.allStatuses')}</option>
            <option value="active">{t('common.statuses.active')}</option>
            <option value="suspended">{t('common.statuses.suspended')}</option>
            <option value="deactivated">{t('common.statuses.deactivated')}</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs">
          <span>{error}</span>
          <button onClick={fetchStudents} className="font-bold underline hover:text-red-900">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">{t('instructor.students.colName')}</th>
                <th className="px-5 py-3.5">{t('instructor.students.colTrack')}</th>
                <th className="px-5 py-3.5">{t('instructor.students.colPhone')}</th>
                <th className="px-5 py-3.5">{t('instructor.students.colStatus')}</th>
                <th className="px-5 py-3.5">{t('instructor.students.colAttempts')}</th>
                <th className="px-5 py-3.5">{t('instructor.students.colJoined')}</th>
                <th className="px-5 py-3.5 text-center">{t('instructor.students.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>{t('common.loading')}</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      {t('common.noData')}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-[11px] text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Track */}
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        student.category === 'PMP'
                          ? 'bg-blue-100 text-blue-800'
                          : student.category === 'MPA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {student.category}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {student.phone || '—'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        student.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : student.status === 'suspended'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          student.status === 'active'
                            ? 'bg-emerald-500'
                            : student.status === 'suspended'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`} />
                        <span>
                          {student.status === 'active'
                            ? t('common.statuses.active')
                            : student.status === 'suspended'
                            ? t('common.statuses.suspended')
                            : t('common.statuses.deactivated')}
                        </span>
                      </span>
                    </td>

                    {/* Attempts */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs">
                        {student.attemptCount || 0}
                      </span>
                    </td>

                    {/* Enrolled Date */}
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(student.createdAt, i18n.language)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1 rtl:space-x-reverse">
                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('instructor.students.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Toggle Status */}
                        <button
                          onClick={() => setConfirmAction({ type: 'toggle_status', student })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            student.status === 'active'
                              ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            student.status === 'active'
                              ? t('instructor.students.suspend')
                              : t('instructor.students.activate')
                          }
                        >
                          {student.status === 'active' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsResetPassModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={t('instructor.students.resetPassword')}
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Deactivate / Soft Delete */}
                        {student.status !== 'deactivated' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'deactivate', student })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('instructor.students.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
            </span>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
              >
                {t('common.previous')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 font-medium"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              confirmAction.type === 'deactivate'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-600'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {confirmAction.type === 'deactivate'
                ? t('instructor.students.delete')
                : confirmAction.student.status === 'active'
                ? t('instructor.students.suspend')
                : t('instructor.students.activate')}
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {confirmAction.type === 'deactivate'
                ? t('instructor.students.confirmDelete')
                : confirmAction.student.status === 'active'
                ? t('instructor.students.confirmSuspend')
                : t('instructor.students.confirmActivate')}
            </p>

            <div className="mt-6 flex items-center justify-center space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'deactivate') {
                    handleDeactivate(confirmAction.student);
                  } else {
                    handleStatusToggle(confirmAction.student);
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow transition-colors ${
                  confirmAction.type === 'deactivate'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchStudents();
        }}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        onSuccess={(msg) => {
          showToast(msg);
          fetchStudents();
        }}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        student={selectedStudent}
        onSuccess={(msg) => {
          showToast(msg);
        }}
      />

      {/* Student Details / Exam History Modal */}
      <StudentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        studentId={selectedStudent?._id}
      />
    </div>
  );
};
