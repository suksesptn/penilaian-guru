'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Teacher {
  id: number
  name: string
  subject: string
  is_filled: boolean
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function getInitials(name: string): string {
  const cleanName = name.replace(/^(Pak|Bu)\s+/i, '').trim()
  const words = cleanName.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return words[0].substring(0, 2).toUpperCase()
}

export default function DashboardPage() {
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const studentId = getCookie('student_id')
    const studentNis = getCookie('student_nis')
    const studentName = getCookie('student_name')
    const studentClassName = getCookie('student_class_name')

    if (!studentId) {
      router.push('/')
      return
    }

    setStudent({
      id: studentId,
      nis: studentNis,
      name: studentName || 'Siswa',
      class_name: studentClassName || 'Kelas tidak diketahui'
    })

    fetchTeachers()
  }, [router])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/teachers')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat data guru')
      }

      setTeachers(data.teachers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    const cookies = ['student_id', 'student_nis', 'student_name', 'student_class_id', 'student_class_name']
    cookies.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    })
    router.push('/')
  }

  const handleCardClick = (teacherId: number, isFilled: boolean) => {
    if (isFilled) {
      alert('Anda sudah mengisi angket untuk guru ini. Tidak bisa diisi ulang.')
      return
    }
    router.push(`/angket/${teacherId}`)
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Memuat...</p>
      </div>
    )
  }

  const filledCount = teachers.filter(t => t.is_filled).length
  const unfilledCount = teachers.length - filledCount
  const progressPercent = teachers.length > 0 ? (filledCount / teachers.length) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Siswa</h1>
            <p className="text-sm text-gray-600">Selamat datang, <span className="font-semibold">{student.name}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-medium"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* ===== PETUNJUK PENGISIAN ===== */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-r-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                📋 Petunjuk Pengisian
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                Diharapkan seluruh siswa dapat mengisi penilaian kinerja guru ini dengan <strong className="text-indigo-700">jujur dan bertanggung jawab</strong>. 
                Tidak perlu khawatir akan adanya dampak terhadap nilai atau hubungan di kelas, karena data bersifat <strong className="text-indigo-700">anonim</strong>—
                laporan yang diterima guru tidak akan mencantumkan identitas maupun nama siswa. 
                Hasil penilaian ini murni digunakan sebagai bahan evaluasi demi <strong className="text-indigo-700">perbaikan mutu pembelajaran dan pelayanan sekolah</strong>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200">
                  🔒 Data Anonim
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200">
                  ✍️ Jujur & Objektif
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200">
                  🎯 Untuk Evaluasi Sekolah
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Siswa */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informasi Siswa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">Nama</p>
              <p className="font-bold text-gray-900 text-lg">{student.name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">NIS</p>
              <p className="font-bold text-gray-900 text-lg">{student.nis}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">Kelas</p>
              <p className="font-bold text-gray-900 text-lg">{student.class_name}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-900">Progress Pengisian</h2>
            <span className="text-sm font-semibold text-indigo-600">
              {filledCount} / {teachers.length} guru
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {filledCount === teachers.length && teachers.length > 0
              ? '🎉 Semua angket sudah diisi! Terima kasih.'
              : `Masih ada ${unfilledCount} guru yang belum dinilai`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Daftar Guru */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Daftar Guru Penilai</h2>
          
          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 mt-2">Memuat daftar guru...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">Tidak ada guru untuk kelas ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => handleCardClick(teacher.id, teacher.is_filled)}
                  className={`bg-white rounded-lg shadow border-2 p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                    teacher.is_filled
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar Inisial */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                      teacher.is_filled ? 'bg-green-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}>
                      {getInitials(teacher.name)}
                    </div>

                    {/* Info Guru */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{teacher.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{teacher.subject}</p>
                      
                      {/* Status Badge */}
                      <div className="mt-2">
                        {teacher.is_filled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            ✅ Sudah Diisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            ⏳ Belum Diisi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}