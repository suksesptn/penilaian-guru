'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

// ===== INTERFACES =====
interface ClassItem {
  id: number
  name: string
  created_at: string
}

interface TeacherItem {
  id: number
  name: string
  subject: string
  created_at: string
}

interface StudentItem {
  id: string
  nis: string
  name: string
  class_id: number
  created_at: string
}

// ===== HELPER =====
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

export default function AdminDataPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'kelas' | 'guru' | 'siswa' | 'korelasi'>('kelas')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  // ===== STATE KELAS =====
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [newClassName, setNewClassName] = useState('')
  const [editingClassId, setEditingClassId] = useState<number | null>(null)
  const [editingClassName, setEditingClassName] = useState('')

  // ===== STATE GURU =====
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherSubject, setNewTeacherSubject] = useState('')
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null)
  const [editingTeacherName, setEditingTeacherName] = useState('')
  const [editingTeacherSubject, setEditingTeacherSubject] = useState('')

  // ===== STATE SISWA =====
  const [students, setStudents] = useState<StudentItem[]>([])
  const [newStudentNis, setNewStudentNis] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentClassId, setNewStudentClassId] = useState<number | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingStudentNis, setEditingStudentNis] = useState('')
  const [editingStudentName, setEditingStudentName] = useState('')
  const [editingStudentClassId, setEditingStudentClassId] = useState<number | null>(null)

  // ===== STATE KORELASI =====
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<number[]>([])

  // ===== STATE IMPORT =====
  const [importType, setImportType] = useState<'classes' | 'teachers' | 'students' | 'teacher_classes'>('classes')
  const [importData, setImportData] = useState<any[]>([])
  const [importMode, setImportMode] = useState<'insert' | 'upsert' | 'replace'>('insert')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; error: number; errors: string[] } | null>(null)

  // ===== AUTH CHECK =====
  useEffect(() => {
    const adminAuth = getCookie('admin_auth')
    if (adminAuth !== 'true') {
      router.push('/admin/login')
      return
    }
    if (activeTab === 'kelas') fetchClasses()
    if (activeTab === 'guru') fetchTeachers()
    if (activeTab === 'siswa') {
      fetchClasses()
      fetchStudents()
    }
    if (activeTab === 'korelasi') {
      fetchClasses()
      fetchTeachers()
    }
  }, [activeTab, router])

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  // ===== KELAS CRUD =====
  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/admin/classes')
      const data = await res.json()
      if (res.ok) setClasses(data.classes || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addClass = async () => {
    if (!newClassName.trim()) {
      showMessage('Nama kelas wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Kelas "${data.class.name}" berhasil ditambahkan`)
        setNewClassName('')
        fetchClasses()
      } else {
        showMessage(data.error || 'Gagal menambah kelas', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateClass = async (id: number) => {
    if (!editingClassName.trim()) {
      showMessage('Nama kelas wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingClassName })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Kelas berhasil diubah menjadi "${data.class.name}"`)
        setEditingClassId(null)
        setEditingClassName('')
        fetchClasses()
      } else {
        showMessage(data.error || 'Gagal mengupdate kelas', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteClass = async (id: number, name: string) => {
    if (!confirm(`Yakin ingin menghapus kelas "${name}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Kelas "${name}" berhasil dihapus`)
        fetchClasses()
      } else {
        showMessage(data.error || 'Gagal menghapus kelas', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== GURU CRUD =====
  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/teachers-manage')
      const data = await res.json()
      if (res.ok) setTeachers(data.teachers || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherSubject.trim()) {
      showMessage('Nama guru dan mata pelajaran wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/teachers-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeacherName, subject: newTeacherSubject })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Guru "${data.teacher.name}" berhasil ditambahkan`)
        setNewTeacherName('')
        setNewTeacherSubject('')
        fetchTeachers()
      } else {
        showMessage(data.error || 'Gagal menambah guru', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateTeacher = async (id: number) => {
    if (!editingTeacherName.trim() || !editingTeacherSubject.trim()) {
      showMessage('Nama guru dan mata pelajaran wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teachers-manage/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTeacherName, subject: editingTeacherSubject })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Guru "${data.teacher.name}" berhasil diupdate`)
        setEditingTeacherId(null)
        setEditingTeacherName('')
        setEditingTeacherSubject('')
        fetchTeachers()
      } else {
        showMessage(data.error || 'Gagal mengupdate guru', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteTeacher = async (id: number, name: string) => {
    if (!confirm(`Yakin ingin menghapus guru "${name}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teachers-manage/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Guru "${name}" berhasil dihapus`)
        fetchTeachers()
      } else {
        showMessage(data.error || 'Gagal menghapus guru', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== SISWA CRUD =====
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students-manage')
      const data = await res.json()
      if (res.ok) setStudents(data.students || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addStudent = async () => {
    if (!newStudentNis.trim() || !newStudentName.trim() || !newStudentClassId) {
      showMessage('NIS, nama, dan kelas wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/students-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis: newStudentNis, name: newStudentName, class_id: newStudentClassId })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Siswa "${data.student.name}" berhasil ditambahkan`)
        setNewStudentNis('')
        setNewStudentName('')
        setNewStudentClassId(null)
        fetchStudents()
      } else {
        showMessage(data.error || 'Gagal menambah siswa', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateStudent = async (id: string) => {
    if (!editingStudentNis.trim() || !editingStudentName.trim() || !editingStudentClassId) {
      showMessage('NIS, nama, dan kelas wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/students-manage/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis: editingStudentNis, name: editingStudentName, class_id: editingStudentClassId })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Siswa "${data.student.name}" berhasil diupdate`)
        setEditingStudentId(null)
        setEditingStudentNis('')
        setEditingStudentName('')
        setEditingStudentClassId(null)
        fetchStudents()
      } else {
        showMessage(data.error || 'Gagal mengupdate siswa', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus siswa "${name}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/students-manage/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Siswa "${name}" berhasil dihapus`)
        fetchStudents()
      } else {
        showMessage(data.error || 'Gagal menghapus siswa', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== KORELASI GURU-KELAS =====
  const fetchTeacherClasses = async (teacherId: number) => {
    try {
      const res = await fetch(`/api/admin/teacher-classes?teacher_id=${teacherId}`)
      const data = await res.json()
      if (res.ok) {
        setTeacherClasses(data.class_ids || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTeacherSelect = (teacherId: number) => {
    setSelectedTeacherId(teacherId)
    fetchTeacherClasses(teacherId)
  }

  const toggleClass = (classId: number) => {
    setTeacherClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    )
  }

  const saveTeacherClasses = async () => {
    if (!selectedTeacherId) {
      showMessage('Pilih guru terlebih dahulu', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/teacher-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: selectedTeacherId,
          class_ids: teacherClasses
        })
      })
      const data = await res.json()
      if (res.ok) {
        showMessage(`Korelasi guru berhasil disimpan (${teacherClasses.length} kelas)`)
      } else {
        showMessage(data.error || 'Gagal menyimpan korelasi', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ===== IMPORT CSV =====
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setImportData(results.data as any[])
          setImportResult(null)
        },
        error: (err) => {
          showMessage(`Error membaca CSV: ${err.message}`, 'error')
        }
      })
    } else {
      showMessage('Format file tidak didukung. Gunakan CSV.', 'error')
      e.target.value = ''
    }
  }

  const executeImport = async () => {
    if (importData.length === 0) {
      showMessage('Tidak ada data untuk diimport', 'error')
      return
    }
    if (!confirm(`Yakin ingin mengimport ${importData.length} data ${importType}?`)) return

    setImporting(true)
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          data: importData,
          mode: importMode
        })
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult({
          success: data.successCount,
          error: data.errorCount,
          errors: data.errors || []
        })
        setImportData([])
        if (importType === 'classes') fetchClasses()
        else if (importType === 'teachers') fetchTeachers()
        else if (importType === 'students') fetchStudents()
        else if (importType === 'teacher_classes') {
          // Refresh jika guru sedang dipilih
          if (selectedTeacherId) fetchTeacherClasses(selectedTeacherId)
        }
        showMessage(`Import selesai! ${data.successCount} berhasil, ${data.errorCount} gagal`)
      } else {
        showMessage(data.error || 'Gagal mengimport', 'error')
      }
    } catch (err) {
      showMessage('Terjadi kesalahan', 'error')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = (type: 'classes' | 'teachers' | 'students' | 'teacher_classes') => {
    let csv = ''
    if (type === 'classes') {
      csv = 'name\nKelas X IPA 3\nKelas X IPS 2\nKelas XI IPA 3'
    } else if (type === 'teachers') {
      csv = 'name,subject\nPak Guru Baru, S.Pd,Matematika\nBu Guru Baru, S.Pd,Bahasa Indonesia'
    } else if (type === 'students') {
      csv = 'nis,name,class_id\n2024099,Siswa Baru,1\n2024100,Siswa Baru 2,2'
    } else if (type === 'teacher_classes') {
      csv = 'teacher_name,class_name\nPak Bambang Suryadi, S.Pd,Kelas X\nPak Bambang Suryadi, S.Pd,Kelas XI IPA\nBu Dewi Kartika, S.Si,Kelas X'
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template_${type}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = () => {
    document.cookie = 'admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    router.push('/admin/login')
  }

  const tabs = [
    { id: 'kelas', label: '🏫 Kelas', badge: classes.length },
    { id: 'guru', label: '👨‍🏫 Guru', badge: teachers.length },
    { id: 'siswa', label: '👨‍🎓 Siswa', badge: students.length },
    { id: 'korelasi', label: '🔗 Korelasi', badge: `${teachers.length} guru` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Kelola Data</h1>
            <p className="text-sm text-gray-300">Sistem Penilaian Kinerja Guru</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium text-sm transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* ===== TAB KELAS ===== */}
        {activeTab === 'kelas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-gray-900">➕ Tambah Kelas Baru</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportType('classes')
                      setImportMode('insert')
                      setImportData([])
                      setImportResult(null)
                      setShowImportModal(true)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
                  >
                    📤 Import CSV
                  </button>
                  <button
                    onClick={() => downloadTemplate('classes')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    📥 Template
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addClass()}
                  placeholder="Contoh: Kelas X IPA 3"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                />
                <button
                  onClick={addClass}
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
                >
                  {loading ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">📋 Daftar Kelas ({classes.length})</h2>
              </div>
              {classes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Belum ada kelas.</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {classes.map(cls => (
                    <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      {editingClassId === cls.id ? (
                        <div className="flex-1 flex gap-3">
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateClass(cls.id)}
                            className="flex-1 px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            autoFocus
                          />
                          <button onClick={() => updateClass(cls.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Simpan</button>
                          <button onClick={() => { setEditingClassId(null); setEditingClassName('') }} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Batal</button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-semibold text-gray-900 text-base">{cls.name}</p>
                            <p className="text-xs text-gray-500 mt-1">ID: {cls.id} • Dibuat: {new Date(cls.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingClassId(cls.id); setEditingClassName(cls.name) }} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition">✏️ Edit</button>
                            <button onClick={() => deleteClass(cls.id, cls.name)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">🗑️ Hapus</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB GURU ===== */}
        {activeTab === 'guru' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-gray-900">➕ Tambah Guru Baru</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportType('teachers')
                      setImportMode('insert')
                      setImportData([])
                      setImportResult(null)
                      setShowImportModal(true)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
                  >
                    📤 Import CSV
                  </button>
                  <button
                    onClick={() => downloadTemplate('teachers')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    📥 Template
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Nama guru (contoh: Pak Bambang Suryadi, S.Pd)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                />
                <input
                  type="text"
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeacher()}
                  placeholder="Mata pelajaran (contoh: Matematika)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                />
              </div>
              <button
                onClick={addTeacher}
                disabled={loading}
                className="mt-3 w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
              >
                {loading ? 'Menyimpan...' : 'Tambah Guru'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">📋 Daftar Guru ({teachers.length})</h2>
              </div>
              {teachers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Belum ada guru.</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {teachers.map(teacher => (
                    <div key={teacher.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      {editingTeacherId === teacher.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingTeacherName}
                            onChange={(e) => setEditingTeacherName(e.target.value)}
                            placeholder="Nama guru"
                            className="px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingTeacherSubject}
                            onChange={(e) => setEditingTeacherSubject(e.target.value)}
                            placeholder="Mata pelajaran"
                            className="px-3 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                          />
                          <div className="md:col-span-2 flex gap-2">
                            <button onClick={() => updateTeacher(teacher.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Simpan</button>
                            <button onClick={() => { setEditingTeacherId(null); setEditingTeacherName(''); setEditingTeacherSubject('') }} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Batal</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-semibold text-gray-900 text-base">{teacher.name}</p>
                            <p className="text-sm text-gray-700 mt-1">📚 {teacher.subject}</p>
                            <p className="text-xs text-gray-500 mt-1">ID: {teacher.id} • Dibuat: {new Date(teacher.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingTeacherId(teacher.id); setEditingTeacherName(teacher.name); setEditingTeacherSubject(teacher.subject) }} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition">✏️ Edit</button>
                            <button onClick={() => deleteTeacher(teacher.id, teacher.name)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">🗑️ Hapus</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB SISWA ===== */}
        {activeTab === 'siswa' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-gray-900">➕ Tambah Siswa Baru</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportType('students')
                      setImportMode('insert')
                      setImportData([])
                      setImportResult(null)
                      setShowImportModal(true)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
                  >
                    📤 Import CSV
                  </button>
                  <button
                    onClick={() => downloadTemplate('students')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    📥 Template
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newStudentNis}
                  onChange={(e) => setNewStudentNis(e.target.value)}
                  placeholder="NIS (contoh: 2024099)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                />
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Nama siswa"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                />
                <select
                  value={newStudentClassId || ''}
                  onChange={(e) => setNewStudentClassId(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addStudent}
                disabled={loading}
                className="mt-3 w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
              >
                {loading ? 'Menyimpan...' : 'Tambah Siswa'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">📋 Daftar Siswa ({students.length})</h2>
              </div>
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Belum ada siswa.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">NIS</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nama</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kelas</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          {editingStudentId === student.id ? (
                            <>
                              <td className="px-4 py-3">
                                <input type="text" value={editingStudentNis} onChange={(e) => setEditingStudentNis(e.target.value)} className="w-full px-2 py-1 border border-indigo-300 rounded text-gray-900" autoFocus />
                              </td>
                              <td className="px-4 py-3">
                                <input type="text" value={editingStudentName} onChange={(e) => setEditingStudentName(e.target.value)} className="w-full px-2 py-1 border border-indigo-300 rounded text-gray-900" />
                              </td>
                              <td className="px-4 py-3">
                                <select value={editingStudentClassId || ''} onChange={(e) => setEditingStudentClassId(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-2 py-1 border border-indigo-300 rounded text-gray-900">
                                  <option value="">-- Pilih --</option>
                                  {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => updateStudent(student.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Simpan</button>
                                  <button onClick={() => { setEditingStudentId(null); setEditingStudentNis(''); setEditingStudentName(''); setEditingStudentClassId(null) }} className="px-2 py-1 bg-gray-400 text-white rounded text-xs">Batal</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{student.nis}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-800 font-medium">{classes.find(c => c.id === student.class_id)?.name || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => { setEditingStudentId(student.id); setEditingStudentNis(student.nis); setEditingStudentName(student.name); setEditingStudentClassId(student.class_id) }} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs">✏️ Edit</button>
                                  <button onClick={() => deleteStudent(student.id, student.name)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">🗑️ Hapus</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB KORELASI ===== */}
        {activeTab === 'korelasi' && (
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Cara Cepat:</strong> Gunakan <strong>Import CSV</strong> untuk mengatur korelasi banyak guru sekaligus. Format: <code className="bg-white px-2 py-0.5 rounded text-xs">teacher_name,class_name</code>
              </p>
            </div>

            {/* Import CSV untuk Korelasi */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-gray-900">📤 Import Korelasi Massal via CSV</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportType('teacher_classes')
                      setImportMode('replace')
                      setImportData([])
                      setImportResult(null)
                      setShowImportModal(true)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
                  >
                    📤 Import CSV Korelasi
                  </button>
                  <button
                    onClick={() => downloadTemplate('teacher_classes')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                  >
                    📥 Template
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Upload CSV dengan format: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">teacher_name,class_name</code>. Satu baris = satu korelasi. Guru yang sama bisa muncul di beberapa baris untuk kelas berbeda.
              </p>
            </div>

            {/* Manual Edit per Guru */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">✏️ Atur Korelasi Manual (Per Guru)</h2>
              <p className="text-sm text-gray-600 mb-4">
                Pilih guru, kemudian centang kelas-kelas yang diajar oleh guru tersebut.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Guru:</label>
                <select
                  value={selectedTeacherId || ''}
                  onChange={(e) => handleTeacherSelect(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                  ))}
                </select>
              </div>

              {selectedTeacherId && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Kelas yang diajar oleh <strong className="text-indigo-700">{teachers.find(t => t.id === selectedTeacherId)?.name}</strong>:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {classes.map(cls => (
                      <label key={cls.id} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                        teacherClasses.includes(cls.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={teacherClasses.includes(cls.id)}
                          onChange={() => toggleClass(cls.id)}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-gray-900">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Dipilih: <strong className="text-indigo-700">{teacherClasses.length}</strong> dari {classes.length} kelas
                    </p>
                    <button
                      onClick={saveTeacherClasses}
                      disabled={loading}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Menyimpan...' : '💾 Simpan Korelasi'}
                    </button>
                  </div>
                </div>
              )}

              {!selectedTeacherId && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p className="text-4xl mb-2">👆</p>
                  <p>Pilih guru di atas untuk mulai mengatur kelas yang diajar</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== MODAL IMPORT CSV ===== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                📤 Import {
                  importType === 'classes' ? 'Kelas' :
                  importType === 'teachers' ? 'Guru' :
                  importType === 'students' ? 'Siswa' : 'Korelasi Guru-Kelas'
                } dari CSV
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Format Info */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-900 font-semibold mb-1">📋 Format CSV:</p>
                {importType === 'classes' && (
                  <pre className="text-xs text-blue-800 mt-2 bg-white p-2 rounded font-mono">name
Kelas X IPA 3
Kelas X IPS 2</pre>
                )}
                {importType === 'teachers' && (
                  <pre className="text-xs text-blue-800 mt-2 bg-white p-2 rounded font-mono">name,subject
Pak Guru, S.Pd,Matematika
Bu Guru, S.Pd,Bahasa Indonesia</pre>
                )}
                {importType === 'students' && (
                  <pre className="text-xs text-blue-800 mt-2 bg-white p-2 rounded font-mono">nis,name,class_id
2024099,Siswa Baru,1
2024100,Siswa Baru 2,2

* class_id = ID kelas (lihat di tab Kelas)</pre>
                )}
                {importType === 'teacher_classes' && (
                  <pre className="text-xs text-blue-800 mt-2 bg-white p-2 rounded font-mono">teacher_name,class_name
Pak Bambang Suryadi, S.Pd,Kelas X
Pak Bambang Suryadi, S.Pd,Kelas XI IPA
Bu Dewi Kartika, S.Si,Kelas X

* Bisa pakai nama lengkap atau ID
* Satu guru bisa muncul di beberapa baris</pre>
                )}
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih File CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">💡 Dari Excel: File → Save As → CSV (Comma delimited)</p>
              </div>

              {/* Mode Import */}
              {importType !== 'teacher_classes' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode Import</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`border-2 rounded-lg p-3 cursor-pointer transition ${importMode === 'insert' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                      <input type="radio" name="importMode" value="insert" checked={importMode === 'insert'} onChange={(e) => setImportMode(e.target.value as any)} className="sr-only" />
                      <p className="font-semibold text-gray-900">➕ Insert Saja</p>
                      <p className="text-xs text-gray-600 mt-1">Tambah data baru, skip yang sudah ada</p>
                    </label>
                    <label className={`border-2 rounded-lg p-3 cursor-pointer transition ${importMode === 'upsert' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                      <input type="radio" name="importMode" value="upsert" checked={importMode === 'upsert'} onChange={(e) => setImportMode(e.target.value as any)} className="sr-only" />
                      <p className="font-semibold text-gray-900">🔄 Insert + Update</p>
                      <p className="text-xs text-gray-600 mt-1">Update data yang sudah ada</p>
                    </label>
                  </div>
                </div>
              )}

              {importType === 'teacher_classes' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-900">
                    <strong>⚠️ Mode Replace:</strong> Import korelasi akan <strong>menghapus semua korelasi lama</strong> guru yang ada di CSV, lalu mengganti dengan data baru. Guru yang tidak ada di CSV tidak terpengaruh.
                  </p>
                </div>
              )}

              {/* Preview */}
              {importData.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">📊 Preview ({importData.length} baris):</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {Object.keys(importData[0]).map(key => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-b">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            {Object.values(row).map((val: any, vIdx) => (
                              <td key={vIdx} className="px-3 py-2 text-gray-900">{String(val).substring(0, 30)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 10 && (
                      <p className="text-xs text-gray-500 p-2 bg-gray-50 text-center">... dan {importData.length - 10} baris lainnya</p>
                    )}
                  </div>
                </div>
              )}

              {/* Hasil Import */}
              {importResult && (
                <div className={`p-4 rounded-lg ${importResult.error === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className="font-semibold text-gray-900 mb-2">✅ Hasil Import:</p>
                  <p className="text-sm text-gray-700">✓ Berhasil: <strong>{importResult.success}</strong> data</p>
                  <p className="text-sm text-gray-700">✗ Gagal: <strong>{importResult.error}</strong> data</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-red-700 mb-1">Detail Error (max 20):</p>
                      <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition">Tutup</button>
              <button onClick={executeImport} disabled={importing || importData.length === 0} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 font-medium">
                {importing ? 'Mengimport...' : `Import ${importData.length} Data`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}