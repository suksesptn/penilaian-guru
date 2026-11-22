'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface TeacherScore {
  id: number
  name: string
  subject: string
  student_count: number
  scores: {
    kepribadian: number
    sosial: number
    pedagogik: number
    profesional: number
    total: number
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

const CATEGORY_LABELS: Record<string, string> = {
  kepribadian: 'Kepribadian',
  sosial: 'Sosial',
  pedagogik: 'Pedagogik',
  profesional: 'Profesional'
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Sangat Kurang Baik',
  2: 'Kurang Baik',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik'
}

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Sangat Baik'
  if (score >= 60) return 'Baik'
  if (score >= 40) return 'Cukup'
  return 'Perlu Perbaikan'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<TeacherScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const adminAuth = getCookie('admin_auth')
    if (adminAuth !== 'true') {
      router.push('/admin/login')
      return
    }
    fetchTeachers()
  }, [router])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/teachers')
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Gagal memuat data')
      setTeachers(data.teachers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    document.cookie = 'admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    router.push('/admin/login')
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-blue-100 text-blue-700'
    if (score >= 40) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-yellow-400 text-yellow-900 border-2 border-yellow-600'
    if (index === 1) return 'bg-gray-300 text-gray-800 border-2 border-gray-500'
    if (index === 2) return 'bg-orange-300 text-orange-900 border-2 border-orange-500'
    return 'bg-gray-100 text-gray-700 border border-gray-300'
  }

  // ===== EXPORT EXCEL (REKAP SEMUA GURU) =====
  const handleExportAll = async () => {
    if (teachers.length === 0) {
      alert('Belum ada data untuk diexport')
      return
    }

    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const today = new Date().toLocaleDateString('id-ID')

      // ===== Sheet 1: Rekapitulasi =====
      const rankingRows: any[] = [
        ['REKAPITULASI ANGKET UMPAN BALIK SISWA'], // ✅ JUDUL DIUBAH
        [`Tanggal: ${today}`],
        [],
        ['Rank', 'Nama Guru', 'Mata Pelajaran', 'Responden', 'Kepribadian', 'Sosial', 'Pedagogik', 'Profesional', 'Total']
      ]

      teachers.forEach((t, idx) => {
        rankingRows.push([
          idx + 1,
          t.name,
          t.subject,
          t.student_count,
          t.scores.kepribadian.toFixed(2),
          t.scores.sosial.toFixed(2),
          t.scores.pedagogik.toFixed(2),
          t.scores.profesional.toFixed(2),
          t.scores.total.toFixed(2)
        ])
      })

      const wsRanking = XLSX.utils.aoa_to_sheet(rankingRows)
      wsRanking['!cols'] = [
        { wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 12 },
        { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 10 }
      ]
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Rekapitulasi')

      // ===== Sheet Per Guru =====
      for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i]

        let sheetName = `${i + 1}. ${teacher.name}`
        sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '')
        if (sheetName.length > 31) sheetName = sheetName.substring(0, 31)

        try {
          const res = await fetch(`/api/admin/teachers/${teacher.id}`)
          const data = await res.json()
          if (!res.ok) continue

          const categoryCounts = data.category_counts || {}
          const feedbacks = data.feedbacks || []
          const studentCount = data.student_count || 0

          const rows: any[] = []

          // Header + Info Guru (di bagian atas)
          rows.push(['LAPORAN DETAIL UMPAN BALIK SISWA']) // ✅ JUDUL DIUBAH
          rows.push([])
          rows.push(['Nama Guru', teacher.name])
          rows.push(['Mata Pelajaran', teacher.subject])
          rows.push(['Jumlah Responden', `${studentCount} siswa`])
          rows.push(['Skor Total', teacher.scores.total.toFixed(2)])
          rows.push(['Tanggal Export', today])
          rows.push([])

          // Analisis Skor Per Kategori
          rows.push(['ANALISIS SKOR PER KATEGORI'])
          rows.push(['Kategori', 'Skor', 'Keterangan'])
          rows.push(['Kepribadian', teacher.scores.kepribadian.toFixed(2), getScoreLabel(teacher.scores.kepribadian)])
          rows.push(['Sosial', teacher.scores.sosial.toFixed(2), getScoreLabel(teacher.scores.sosial)])
          rows.push(['Pedagogik', teacher.scores.pedagogik.toFixed(2), getScoreLabel(teacher.scores.pedagogik)])
          rows.push(['Profesional', teacher.scores.profesional.toFixed(2), getScoreLabel(teacher.scores.profesional)])
          rows.push([])

          // Distribusi Jawaban
          rows.push(['DISTRIBUSI JAWABAN'])
          rows.push(['Kategori', 'Tingkat', 'Jumlah', 'Persentase'])

          Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
            rows.push([label, '', '', ''])
            const counts = categoryCounts[key] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            const totalAnswers = Object.values(counts).reduce((a: number, b: any) => a + b, 0)

            for (let s = 5; s >= 1; s--) {
              const count = counts[s as keyof typeof counts] || 0
              const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
              rows.push(['', SCORE_LABELS[s as 1|2|3|4|5], count, `${pct.toFixed(1)}%`])
            }
          })
          rows.push([])

          // ✅ Saran & Masukan (ANONIM - HANYA 2 KOLOM)
          rows.push(['SARAN & MASUKAN SISWA (ANONIM)'])
          rows.push(['No', 'Saran/Masukan'])

          const validFeedbacks = feedbacks.filter((fb: any) => fb.feedback && fb.feedback.trim() !== '')
          if (validFeedbacks.length === 0) {
            rows.push(['', 'Tidak ada saran/masukan dari siswa'])
          } else {
            validFeedbacks.forEach((fb: any, idx: number) => {
              rows.push([idx + 1, fb.feedback.trim()])
            })
          }

          const ws = XLSX.utils.aoa_to_sheet(rows)
          ws['!cols'] = [{ wch: 5 }, { wch: 100 }] // Lebar kolom disesuaikan agar saran terbaca penuh
          XLSX.utils.book_append_sheet(wb, ws, sheetName)

        } catch (err) {
          console.error(`Error exporting teacher ${teacher.name}:`, err)
        }
      }

      const filename = `Rekap_Umpan_Balik_Siswa_${new Date().toISOString().split('T')[0]}`
      XLSX.writeFile(wb, `${filename}.xlsx`)

    } catch (err: any) {
      alert('Gagal export: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const averageScore = teachers.length > 0
    ? (teachers.reduce((sum, t) => sum + t.scores.total, 0) / teachers.length).toFixed(2)
    : '0.00'

  const totalRespondents = teachers.reduce((sum, t) => sum + t.student_count, 0)
  const topTeacher = teachers[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-gray-300">Sistem Penilaian Kinerja Guru</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push('/admin/data')}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition font-medium flex items-center gap-2"
            >
              🗂️ Kelola Data
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              👁️ Lihat sebagai Siswa
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition font-medium"
            >
              🚪 Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-indigo-500">
            <p className="text-sm text-gray-500 mb-1">Total Guru</p>
            <p className="text-3xl font-bold text-gray-900">{teachers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Terdaftar di sistem</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-500 mb-1">Rata-rata Skor</p>
            <p className="text-3xl font-bold text-gray-900">{averageScore}</p>
            <p className="text-xs text-gray-400 mt-1">Dari semua guru</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 mb-1">Guru Terbaik</p>
            <p className="text-base font-bold text-gray-900 truncate">
              {topTeacher ? topTeacher.name : '-'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {topTeacher ? `Skor: ${topTeacher.scores.total.toFixed(2)}` : 'Belum ada data'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-purple-500">
            <p className="text-sm text-gray-500 mb-1">Total Responden</p>
            <p className="text-3xl font-bold text-gray-900">{totalRespondents}</p>
            <p className="text-xs text-gray-400 mt-1">Siswa yang sudah menilai</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={fetchTeachers}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
            >
              🔄 Coba Lagi
            </button>
          </div>
        )}

        {/* Tabel Ranking */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">🏆 Ranking Guru Berdasarkan Skor Total</h2>
              <p className="text-sm text-gray-500 mt-1">Klik nama guru untuk melihat detail analisis</p>
            </div>
            <button
              onClick={handleExportAll}
              disabled={exporting || teachers.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? '⏳ Memproses...' : '📥 Export Semua ke Excel'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
              <p className="text-gray-500 mt-3">Memuat data...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-3">📊</p>
              <p className="text-gray-500 text-lg">Belum ada data penilaian</p>
              <p className="text-sm text-gray-400 mt-1">Data akan muncul setelah siswa mengisi angket</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nama Guru</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Mapel</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Responden</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Kepribadian</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Sosial</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pedagogik</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Profesional</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teachers.map((teacher, index) => (
                    <tr
                      key={teacher.id}
                      onClick={() => router.push(`/admin/guru/${teacher.id}`)}
                      className="hover:bg-indigo-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${getRankBadge(index)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{teacher.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{teacher.subject}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">{teacher.student_count}</td>
                      <td className={`px-4 py-3 text-center font-bold ${getScoreColor(teacher.scores.kepribadian)}`}>
                        {teacher.scores.kepribadian.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${getScoreColor(teacher.scores.sosial)}`}>
                        {teacher.scores.sosial.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${getScoreColor(teacher.scores.pedagogik)}`}>
                        {teacher.scores.pedagogik.toFixed(1)}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${getScoreColor(teacher.scores.profesional)}`}>
                        {teacher.scores.profesional.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(teacher.scores.total)}`}>
                          {teacher.scores.total.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>💡 Tip: Klik baris guru untuk melihat analisis detail per kategori</p>
          <p className="mt-1">Terakhir diupdate: {new Date().toLocaleString()}</p>
        </div>
      </main>
    </div>
  )
}