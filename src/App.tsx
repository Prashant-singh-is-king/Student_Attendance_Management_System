/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckCircle, 
  BarChart3, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit, 
  Search,
  UserPlus,
  Calendar,
  Download,
  ChevronRight,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

import { User, Student, Class, AttendanceRecord } from './types';

// --- Components ---

const Sidebar = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/classes', label: 'Classes', icon: BookOpen },
    { path: '/attendance', label: 'Attendance', icon: CheckCircle },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  if (user.role === 'admin') {
    navItems.splice(3, 0, { path: '/teachers', label: 'Teachers', icon: UserPlus });
  }

  return (
    <div className={`bg-slate-900 text-white h-screen transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-6 flex items-center justify-between">
        {isOpen && <h1 className="text-xl font-bold tracking-tight text-emerald-400">Attendify</h1>}
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-slate-800 rounded">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="flex-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-4 transition-colors ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Icon size={20} />
              {isOpen && <span className="ml-4 font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            {user.name.charAt(0)}
          </div>
          {isOpen && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center w-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <LogOut size={20} />
          {isOpen && <span className="ml-4">Logout</span>}
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, presentToday: 0, overallPercentage: 0 });
  const [classStats, setClassStats] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stats').then(res => setStats(res.data));
    axios.get('/api/classes').then(async (res) => {
      const classes = res.data;
      const classData = await Promise.all(classes.map(async (c: any) => {
        const attRes = await axios.get(`/api/attendance?class_id=${c.id}`);
        const present = attRes.data.filter((a: any) => a.status === 'present').length;
        const total = attRes.data.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { name: c.name, percentage };
      }));
      setClassStats(classData);
    });
  }, []);

  const data = [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.totalStudents - stats.presentToday },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="p-8 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Welcome back to your attendance overview.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
          { label: 'Total Classes', value: stats.totalClasses, icon: BookOpen, color: 'bg-purple-500' },
          { label: 'Present Today', value: stats.presentToday, icon: CheckCircle, color: 'bg-emerald-500' },
          { label: 'Overall Attendance', value: `${stats.overallPercentage}%`, icon: BarChart3, color: 'bg-orange-500' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center"
          >
            <div className={`${stat.color} p-4 rounded-xl text-white mr-4`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Today's Attendance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-8 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2" />
              <span className="text-sm text-slate-600">Present</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              <span className="text-sm text-slate-600">Absent</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Class-wise Attendance (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="percentage" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/attendance" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center text-center">
              <CheckCircle className="text-emerald-500 mb-2" />
              <span className="text-sm font-medium">Mark Attendance</span>
            </Link>
            <Link to="/students" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center text-center">
              <UserPlus className="text-blue-500 mb-2" />
              <span className="text-sm font-medium">Add Student</span>
            </Link>
            <Link to="/reports" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center text-center">
              <BarChart3 className="text-purple-500 mb-2" />
              <span className="text-sm font-medium">View Reports</span>
            </Link>
            <Link to="/classes" className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col items-center text-center">
              <BookOpen className="text-orange-500 mb-2" />
              <span className="text-sm font-medium">Manage Classes</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = () => {
    axios.get('/api/students').then(res => setStudents(res.data));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStudent.id) {
      axios.put(`/api/students/${currentStudent.id}`, currentStudent).then(() => {
        fetchStudents();
        setIsModalOpen(false);
      });
    } else {
      axios.post('/api/students', currentStudent).then(() => {
        fetchStudents();
        setIsModalOpen(false);
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this student?')) {
      axios.delete(`/api/students/${id}`).then(fetchStudents);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Students</h2>
          <p className="text-slate-500">Manage your student records.</p>
        </div>
        <button
          onClick={() => { setCurrentStudent({}); setIsModalOpen(true); }}
          className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-emerald-600 transition-colors"
        >
          <Plus size={20} className="mr-2" /> Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-bottom border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Photo</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                <td className="px-6 py-4 text-slate-600">{student.roll_number}</td>
                <td className="px-6 py-4 text-slate-600">{student.email}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => { setCurrentStudent(student); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">{currentStudent.id ? 'Edit Student' : 'Add New Student'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={currentStudent.name || ''}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number</label>
                  <input
                    required
                    type="text"
                    value={currentStudent.roll_number || ''}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, roll_number: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={currentStudent.email || ''}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Photo URL (Optional)</label>
                  <input
                    type="text"
                    value={currentStudent.photo_url || ''}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, photo_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    {currentStudent.id ? 'Save Changes' : 'Add Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<{id: number, name: string}[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({ name: '', teacher_id: '' });
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClasses();
    axios.get('/api/teachers').then(res => setTeachers(res.data));
    axios.get('/api/students').then(res => setStudents(res.data));
  }, []);

  const fetchClasses = () => {
    axios.get('/api/classes').then(res => setClasses(res.data));
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post('/api/classes', newClass).then(() => {
      fetchClasses();
      setIsModalOpen(false);
      setNewClass({ name: '', teacher_id: '' });
    });
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || selectedStudentIds.length === 0) return;
    axios.post(`/api/classes/${selectedClass.id}/enroll-bulk`, { student_ids: selectedStudentIds }).then(() => {
      setIsEnrollModalOpen(false);
      setSelectedStudentIds([]);
      alert('Students enrolled successfully!');
    }).catch(err => alert(err.response.data.error));
  };

  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Classes</h2>
          <p className="text-slate-500">Manage courses and student enrollments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-emerald-600 transition-colors"
        >
          <Plus size={20} className="mr-2" /> Create Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={cls.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                <p className="text-sm text-slate-500">Teacher: {cls.teacher_name || 'Unassigned'}</p>
              </div>
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                <BookOpen size={20} />
              </div>
            </div>
            <button
              onClick={() => { setSelectedClass(cls); setIsEnrollModalOpen(true); }}
              className="w-full mt-4 py-2 border-2 border-slate-100 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              <UserPlus size={18} className="mr-2" /> Enroll Student
            </button>
          </motion.div>
        ))}
      </div>

      {/* Create Class Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">Create New Class</h3>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                  <input
                    required
                    type="text"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Computer Science 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Teacher</label>
                  <select
                    required
                    value={newClass.teacher_id}
                    onChange={(e) => setNewClass({ ...newClass, teacher_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Create Class</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enroll Modal */}
      <AnimatePresence>
        {isEnrollModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Enroll Students in {selectedClass?.name}</h3>
                <button onClick={() => setIsEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">{selectedStudentIds.length} students selected</span>
                  <button 
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All Students'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl mb-6">
                <div className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <div 
                      key={student.id} 
                      className={`flex items-center p-4 hover:bg-slate-50 transition-colors cursor-pointer ${selectedStudentIds.includes(student.id) ? 'bg-emerald-50/50' : ''}`}
                      onClick={() => toggleStudentSelection(student.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => {}} // Handled by div click
                        className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 mr-4"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.roll_number}</p>
                      </div>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No students found.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsEnrollModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleEnroll}
                  disabled={selectedStudentIds.length === 0}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  Save Enrollment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Attendance = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    axios.get('/api/classes').then(res => setClasses(res.data));
  }, []);

  const handleFetchStudents = () => {
    if (!selectedClassId) return;
    setLoading(true);
    setIsSaved(false);
    axios.get(`/api/classes/${selectedClassId}/students`).then(res => {
      setStudents(res.data);
      // Fetch existing attendance for this date
      axios.get(`/api/attendance?class_id=${selectedClassId}&date=${date}`).then(attRes => {
        const attMap: Record<number, 'present' | 'absent'> = {};
        attRes.data.forEach((rec: any) => {
          attMap[rec.student_id] = rec.status;
        });
        // Default others to absent if not marked (as per checkbox logic: unchecked = absent)
        res.data.forEach((s: Student) => {
          if (!attMap[s.id]) attMap[s.id] = 'absent';
        });
        setAttendance(attMap);
        setLoading(false);
      });
    });
  };

  const handleMarkAllPresent = () => {
    const newAtt = { ...attendance };
    students.forEach(s => {
      newAtt[s.id] = 'present';
    });
    setAttendance(newAtt);
  };

  const handleToggle = (studentId: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = () => {
    const records = Object.entries(attendance).map(([student_id, status]) => ({
      student_id: parseInt(student_id),
      status
    }));
    axios.post('/api/attendance', { class_id: selectedClassId, date, records }).then(() => {
      setIsSaved(true);
      setStudents([]);
    });
  };

  const handleTakeAgain = () => {
    setIsSaved(false);
    setSelectedClassId('');
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Attendance</h2>
        <p className="text-slate-500">Mark daily attendance for your classes.</p>
      </div>

      {!isSaved ? (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Choose a class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <button
              onClick={handleFetchStudents}
              className="bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Load Students
            </button>
          </div>

          {students.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">{students.length} Students Enrolled</span>
                <button
                  onClick={handleMarkAllPresent}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center"
                >
                  <CheckCircle size={16} className="mr-1" /> Mark All Present
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-bottom border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Present?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{student.roll_number}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={attendance[student.id] === 'present'}
                            onChange={() => handleToggle(student.id)}
                            className="w-6 h-6 rounded-lg border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-slate-50 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-emerald-500 text-white px-8 py-2 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Save Attendance
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Attendance Saved Successfully</h3>
          <p className="text-slate-500">The attendance records have been stored in the database.</p>
          <button
            onClick={handleTakeAgain}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors font-bold"
          >
            Take Attendance Again
          </button>
        </motion.div>
      )}
    </div>
  );
};

const Reports = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date().setDate(1), 'yyyy-MM-dd')); // Start of month
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/classes').then(res => setClasses(res.data));
  }, []);

  const generateReport = () => {
    if (!selectedClassId) return;
    axios.get(`/api/classes/${selectedClassId}/students`).then(studentsRes => {
      const students = studentsRes.data;
      axios.get('/api/attendance?class_id=' + selectedClassId).then(attRes => {
        // Filter by date range
        const filteredAtt = attRes.data.filter((a: any) => {
          return a.date >= startDate && a.date <= endDate;
        });

        const data = students.map((s: Student) => {
          const studentAtt = filteredAtt.filter((a: any) => a.student_id === s.id);
          const present = studentAtt.filter((a: any) => a.status === 'present').length;
          const total = studentAtt.length;
          const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
          return {
            roll_number: s.roll_number,
            name: s.name,
            present,
            total,
            percentage: percentage + '%'
          };
        });
        setReportData(data);
      });
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, "Attendance_Report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    (doc as any).autoTable({
      startY: 20,
      head: [['Roll No', 'Name', 'Present', 'Total Days', 'Percentage']],
      body: reportData.map(r => [r.roll_number, r.name, r.present, r.total, r.percentage]),
    });
    doc.save("Attendance_Report.pdf");
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Reports</h2>
        <p className="text-slate-500">Generate and export attendance reports.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Choose a class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <button
          onClick={generateReport}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          Generate Report
        </button>
      </div>

      {reportData.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end space-x-3">
            <button onClick={exportExcel} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
              <Download size={18} className="mr-2" /> Excel
            </button>
            <button onClick={exportPDF} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
              <Download size={18} className="mr-2" /> PDF
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-bottom border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Present</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Days</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{row.roll_number}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
                    <td className="px-6 py-4 text-slate-600">{row.present}</td>
                    <td className="px-6 py-4 text-slate-600">{row.total}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        parseFloat(row.percentage) < 75 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {row.percentage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const Teachers = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ username: '', password: '', name: '' });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = () => {
    axios.get('/api/teachers').then(res => setTeachers(res.data));
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this teacher?')) {
      axios.delete(`/api/teachers/${id}`).then(fetchTeachers);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post('/api/teachers', newTeacher).then(() => {
      fetchTeachers();
      setIsModalOpen(false);
      setNewTeacher({ username: '', password: '', name: '' });
    }).catch(err => alert(err.response.data.error));
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Teachers</h2>
          <p className="text-slate-500">Manage teacher accounts and access.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center hover:bg-emerald-600 transition-colors"
        >
          <Plus size={20} className="mr-2" /> Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-bottom border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{teacher.name}</td>
                <td className="px-6 py-4 text-slate-600">#{teacher.id}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(teacher.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6">Add New Teacher</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    required
                    type="text"
                    value={newTeacher.username}
                    onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    required
                    type="password"
                    value={newTeacher.password}
                    onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">Add Teacher</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { username, password });
      onLogin(res.data);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Attendify</h1>
          <p className="text-slate-500">Sign in to manage attendance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              required
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Forgot your password? Please contact the administrator.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            {user.role === 'admin' && <Route path="/teachers" element={<Teachers />} />}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
