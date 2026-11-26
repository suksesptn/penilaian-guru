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

// Helper: rata-tengahkan sel judul (merge + center)
function centerTitle(ws: XLSX.WorkSheet, rowIdx: number, colStart: number, colEnd: number, text: string) {
  const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colStart })
  ws[addr] = { t: 's', v: text }
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: rowIdx, c: colStart }, e: { r: rowIdx, c: colEnd } })
  ws[addr] = { ...ws[addr], s: { alignment: { horizontal: 'center' } } }
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

  // ===== EXPORT EXCEL (REVISI: REKAP + PER KELAS + DETAIL PER KELAS) =====
  const handleExportAll = async () => {
    if (teachers.length === 0) {
      alert('Belum ada data untuk diexport')
      return
    }

    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const today = new Date().toLocaleDateString('id-ID')

      // ---------- Fetch detail semua guru (untuk sheet per kelas + detail) ----------
      const teacherDetails: { teacher: TeacherScore; data: any }[] = []
      for (const teacher of teachers) {
        try {
          const res = await fetch(`/api/admin/teachers/${teacher.id}`)
          const data = await res.json()
          if (res.ok) teacherDetails.push({ teacher, data })
        } catch (err) {
          console.error(`Error fetch detail ${teacher.name}:`, err)
        }
      }

      // ============================================================
      // SHEET 1: REKAPITULASI SEMUA GURU
      // ============================================================
      const rekapRows: any[] = [
        [], // row 0: diisi judul via centerTitle
        [`Tanggal: ${today}`],
        [`Total Guru: ${teachers.length} | Total Responden: ${teachers.reduce((s, t) => s + t.student_count, 0)} siswa`],
        [],
        ['No', 'Nama Guru', 'Mata Pelajaran', 'Kepribadian', 'Sosial', 'Pedagogik', 'Profesional', 'Skor Total', 'Keterangan'],
      ]

      const sortedAll = [...teachers].sort((a, b) => b.scores.total - a.scores.total)
      sortedAll.forEach((t, idx) => {
        rekapRows.push([
          idx + 1,
          t.name,
          t.subject,
          `${t.scores.kepribadian.toFixed(1)}%`,
          `${t.scores.sosial.toFixed(1)}%`,
          `${t.scores.pedagogik.toFixed(1)}%`,
          `${t.scores.profesional.toFixed(1)}%`,
          `${t.scores.total.toFixed(2)}%`,
          getScoreLabel(t.scores.total),
        ])
      })

      const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows)
      centerTitle(wsRekap, 0, 0, 8, 'REKAPITULASI ANGKET UMPAN BALIK SISWA — SEMUA GURU')
      wsRekap['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 22 }, { wch: 13 }, { wch: 10 },
        { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekapitulasi Guru')

      // ============================================================
      // SHEET 2: REKAPITULASI PER KELAS
      // ============================================================
      const perClassRows: any[] = [
        [], // judul via centerTitle
        [`Tanggal: ${today}`],
        [],
        ['No', 'Nama Guru', 'Mata Pelajaran', 'Kelas', 'Kepribadian', 'Sosial', 'Pedagogik', 'Profesional', 'Skor Total', 'Keterangan'],
      ]

      const perClassList: any[] = []
      for (const { teacher, data } of teacherDetails) {
        const classes = data.classes || []
        const scoresByClass = data.scores_by_class || {}
        const countByClass = data.student_count_by_class || {}

        if (classes.length === 0) {
          perClassList.push({
            name: teacher.name, subject: teacher.subject, kelas: '-',
            scores: { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 },
            count: 0,
          })
        } else {
          for (const cls of classes) {
            perClassList.push({
              name: teacher.name, subject: teacher.subject, kelas: cls.name,
              scores: scoresByClass[String(cls.id)] || { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 },
              count: countByClass[String(cls.id)] || 0,
            })
          }
        }
      }

      perClassList.sort((a, b) => b.scores.total - a.scores.total)
      perClassList.forEach((r, idx) => {
        perClassRows.push([
          idx + 1, r.name, r.subject, r.kelas,
          `${r.scores.kepribadian.toFixed(1)}%`,
          `${r.scores.sosial.toFixed(1)}%`,
          `${r.scores.pedagogik.toFixed(1)}%`,
          `${r.scores.profesional.toFixed(1)}%`,
          `${r.scores.total.toFixed(2)}%`,
          getScoreLabel(r.scores.total),
        ])
      })

      const wsPerClass = XLSX.utils.aoa_to_sheet(perClassRows)
      centerTitle(wsPerClass, 0, 0, 9, 'REKAPITULASI ANGKET UMPAN BALIK SISWA — PER KELAS')
      wsPerClass['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 22 }, { wch: 12 }, { wch: 13 },
        { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, wsPerClass, 'Rekapitulasi Per Kelas')

      // ============================================================
      // SHEET 3+: DETAIL PER GURU + KELAS (format sama dengan PDF)
      // ============================================================
      let sheetNum = 1

      for (const { teacher, data } of teacherDetails) {
        const classes = data.classes || []
        const scoresByClass = data.scores_by_class || {}
        const countsByClass = data.category_counts_by_class || {}
        const feedbacksByClass = data.feedbacks_by_class || {}
        const countByClass = data.student_count_by_class || {}

        const classList = classes.length > 0 ? classes : [{ id: 0, name: 'Semua Kelas' }]

        for (const cls of classList) {
          const cid = String(cls.id)
          const scores = scoresByClass[cid] || data.scores || { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 }
          const catCounts = countsByClass[cid] || data.category_counts || {
            kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          }
          const fbs = feedbacksByClass[cid] || data.feedbacks || []
          const count = countByClass[cid] ?? data.student_count ?? 0

          const rows: any[] = []

          // --- Judul (row 0 & 1, akan di-merge center) ---
          rows.push([]) // judul
          rows.push([]) // tanggal
          rows.push([])

          // --- Informasi Guru (sejajar: label, titik dua, nilai) ---
          rows.push(['Informasi Guru', '', ''])
          rows.push(['Nama', ':', teacher.name])
          rows.push(['Mata Pelajaran', ':', teacher.subject])
          rows.push(['Kelas', ':', cls.name])
          rows.push(['Jumlah Responden', ':', `${count} siswa`])
          rows.push(['Skor Total', ':', `${scores.total.toFixed(2)}% (${getScoreLabel(scores.total)})`])
          rows.push([])

          // --- Analisis Skor Per Kategori (tanpa kolom Jumlah) ---
          rows.push(['ANALISIS SKOR PER KATEGORI', '', '', ''])
          rows.push(['Kategori', 'Pertanyaan', 'Skor', 'Keterangan'])
          rows.push(['Kepribadian', '1-3', `${scores.kepribadian.toFixed(2)}%`, getScoreLabel(scores.kepribadian)])
          rows.push(['Sosial', '4-6', `${scores.sosial.toFixed(2)}%`, getScoreLabel(scores.sosial)])
          rows.push(['Pedagogik', '7-9', `${scores.pedagogik.toFixed(2)}%`, getScoreLabel(scores.pedagogik)])
          rows.push(['Profesional', '10-12', `${scores.profesional.toFixed(2)}%`, getScoreLabel(scores.profesional)])
          rows.push([])

          // --- Distribusi Jawaban 2 kolom (kiri: Kepribadian+Sosial, kanan: Pedagogik+Profesional) ---
          rows.push(['DISTRIBUSI JAWABAN', '', '', '', '', '', '', ''])
          rows.push(['Kategori', 'Tingkat Penilaian', 'Persentase', '', 'Kategori', 'Tingkat Penilaian', 'Persentase'])

          const buildSide = (keys: string[]) => {
            const out: any[] = []
            keys.forEach(key => {
              const label = CATEGORY_LABELS[key]
              const c = catCounts[key] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              const tot = Object.values(c).reduce((a: number, b: any) => a + b, 0)
              out.push([label, '', ''])
              for (let s = 5; s >= 1; s--) {
                const cnt = c[s as keyof typeof c] || 0
                const pct = tot > 0 ? (cnt / tot) * 100 : 0
                out.push(['', SCORE_LABELS[s as 1 | 2 | 3 | 4 | 5], `${pct.toFixed(1)}%`])
              }
            })
            return out
          }

          const left = buildSide(['kepribadian', 'sosial'])
          const right = buildSide(['pedagogik', 'profesional'])
          const maxLen = Math.max(left.length, right.length)
          for (let i = 0; i < maxLen; i++) {
            const l = left[i] || ['', '', '']
            const r = right[i] || ['', '', '']
            rows.push([l[0], l[1], l[2], '', r[0], r[1], r[2]])
          }
          rows.push([])

          // --- Saran & Masukan per kelas (ANONIM) ---
          rows.push([`SARAN & MASUKAN SISWA (ANONIM) — KELAS ${cls.name}`, '', ''])
          rows.push(['No', 'Saran/Masukan', ''])

          const validFbs = fbs.filter((fb: any) => fb.feedback && fb.feedback.trim() !== '')
          if (validFbs.length === 0) {
            rows.push(['', 'Tidak ada saran/masukan dari siswa di kelas ini', ''])
          } else {
            validFbs.forEach((fb: any, idx: number) => {
              rows.push([idx + 1, fb.feedback.trim(), ''])
            })
          }

          const ws = XLSX.utils.aoa_to_sheet(rows)
          centerTitle(ws, 0, 0, 7, 'LAPORAN ANGKET UMPAN BALIK SISWA')
          centerTitle(ws, 1, 0, 7, `Tanggal: ${today}`)
          ws['!cols'] = [
            { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 4 },
            { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 20 },
          ]

          let sheetName = `${sheetNum}. ${teacher.name} - ${cls.name}`
          sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '')
          if (sheetName.length > 31) sheetName = sheetName.substring(0, 31)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
          sheetNum++
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
          <p>💡 Export Excel berisi: Rekap Semua Guru, Rekap Per Kelas, dan Detail Laporan per Guru+Kelas</p>
          <p className="mt-1">Terakhir diupdate: {new Date().toLocaleString()}</p>
        </div>
      </main>
    </div>
  )
}