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
      <header className="bg-gradient-to-r from-indigo-700 to-purple-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">ANGKET UMPAN BALIK (FEEDBACK) SISWA</h1>
            <p className="text-sm text-indigo-100 mt-1">SMA Pesantren Unggul Al Bayan • Tahun 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-white hidden sm:block">
              Halo, <span className="font-semibold">{student.name}</span>
            </p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-medium backdrop-blur-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ===== PETUNJUK PENGISIAN ===== */}
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-l-4 border-indigo-600 rounded-r-xl shadow-md p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 hidden sm:block">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-indigo-900 mb-2">
                📣 Selamat datang di Angket Umpan Balik (Feedback) Siswa
              </h2>
              <p className="text-sm sm:text-base text-indigo-800 font-semibold mb-3">
                SMA Pesantren Unggul Al Bayan Tahun 2026
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Suaramu sangat berarti bagi kemajuan sekolah kita. Melalui angket singkat ini, kami ingin mengajakmu berpartisipasi secara aktif untuk:
              </p>

              <div className="space-y-2.5 mb-4">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Meningkatkan Kualitas Belajar</p>
                    <p className="text-sm text-gray-700">
                      Masukanmu bertujuan membantu Bapak/Ibu Guru menghadirkan pembelajaran yang lebih efektif, menarik, dan mudah kamu pahami di kelas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Membangun Perubahan Nyata</p>
                    <p className="text-sm text-gray-700">
                      Kami sangat mengharapkan kamu mengisi angket ini dengan <strong>jujur, objektif, dan apa adanya</strong>. Jawabanmu yang jujur adalah kunci utama agar perbaikan pembelajaran benar-benar sesuai dengan kebutuhanmu.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">100% Aman dan Rahasia</p>
                    <p className="text-sm text-gray-700">
                      Jangan ragu atau takut! Identitasmu dirahasiakan sepenuhnya dan penilaianmu <strong>tidak akan memengaruhi nilai akademik</strong> maupun hubunganmu dengan Bapak/Ibu Guru.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 border border-indigo-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-indigo-900 font-medium">
                  💙 Terima kasih atas partisipasi dan kontribusimu untuk membuat proses belajar di sekolah kita menjadi jauh lebih baik!
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200 shadow-sm">
                  🔒 100% Rahasia
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200 shadow-sm">
                  ✍️ Jujur & Objektif
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200 shadow-sm">
                  🎯 Untuk Perubahan Nyata
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Siswa */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">👤 Informasi Siswa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Nama</p>
              <p className="font-bold text-gray-900 text-lg">{student.name}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">NIS</p>
              <p className="font-bold text-gray-900 text-lg">{student.nis}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Kelas</p>
              <p className="font-bold text-gray-900 text-lg">{student.class_name}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900">📊 Progress Pengisian</h2>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {filledCount} / {teachers.length} guru
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {filledCount === teachers.length && teachers.length > 0
              ? '🎉 Semua angket sudah diisi! Terima kasih atas partisipasimu.'
              : `⏳ Masih ada ${unfilledCount} guru yang belum dinilai`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Daftar Guru */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">👨‍🏫 Daftar Guru Penilai</h2>
          
          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 mt-2">Memuat daftar guru...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-6xl mb-3">📭</p>
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
                      ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                      : 'border-gray-200 hover:border-indigo-400 hover:from-indigo-50 hover:to-purple-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar Inisial */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md ${
                      teacher.is_filled ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}>
                      {getInitials(teacher.name)}
                    </div>

                    {/* Info Guru */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{teacher.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">📚 {teacher.subject}</p>
                      
                      {/* Status Badge */}
                      <div className="mt-2">
                        {teacher.is_filled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            ✅ Sudah Diisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
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

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 pb-4">
          <p>© 2026 SMA Pesantren Unggul Al Bayan • Angket Umpan Balik Siswa</p>
        </div>
      </main>
    </div>
  )
}