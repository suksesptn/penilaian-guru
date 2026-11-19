'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface CategoryCount {
  1: number
  2: number
  3: number
  4: number
  5: number
}

interface Feedback {
  student_name: string
  nis: string
  feedback: string
  submitted_at: string
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

const CATEGORY_ICONS: Record<string, string> = {
  kepribadian: '👤',
  sosial: '🤝',
  pedagogik: '📖',
  profesional: '⭐'
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Sangat Kurang Baik',
  2: 'Kurang Baik',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik'
}

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700 border-red-300',
  2: 'bg-orange-100 text-orange-700 border-orange-300',
  3: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  4: 'bg-blue-100 text-blue-700 border-blue-300',
  5: 'bg-green-100 text-green-700 border-green-300'
}

export default function TeacherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.id as string

  const [teacher, setTeacher] = useState<any>(null)
  const [scores, setScores] = useState<any>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, CategoryCount> | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const adminAuth = getCookie('admin_auth')
    if (adminAuth !== 'true') {
      router.push('/admin/login')
      return
    }
    fetchDetail()
  }, [teacherId, router])

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/teachers/${teacherId}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setTeacher(data.teacher)
      setScores(data.scores)
      setCategoryCounts(data.category_counts)
      setFeedbacks(data.feedbacks || [])
      setStudentCount(data.student_count)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Sangat Baik'
    if (score >= 60) return 'Baik'
    if (score >= 40) return 'Cukup'
    return 'Perlu Perbaikan'
  }

  // ===== EXPORT EXCEL =====
  const handleExportExcel = () => {
    if (!teacher || !scores) return

    const wb = XLSX.utils.book_new()

    // Sheet 1: Info Guru
    const infoData = [
      { Field: 'Nama Guru', Value: teacher.name },
      { Field: 'Mata Pelajaran', Value: teacher.subject },
      { Field: 'Jumlah Responden', Value: `${studentCount} siswa` },
      { Field: 'Skor Total', Value: scores.total.toFixed(2) },
      { Field: 'Tanggal Export', Value: new Date().toLocaleString('id-ID') },
    ]
    const wsInfo = XLSX.utils.json_to_sheet(infoData)
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Guru')

    // Sheet 2: Analisis Kategori
    const categoryData = [
      { Kategori: 'Kepribadian', Pertanyaan: '1-3', Skor: scores.kepribadian.toFixed(2), Keterangan: getScoreLabel(scores.kepribadian) },
      { Kategori: 'Sosial', Pertanyaan: '4-6', Skor: scores.sosial.toFixed(2), Keterangan: getScoreLabel(scores.sosial) },
      { Kategori: 'Pedagogik', Pertanyaan: '7-9', Skor: scores.pedagogik.toFixed(2), Keterangan: getScoreLabel(scores.pedagogik) },
      { Kategori: 'Profesional', Pertanyaan: '10-12', Skor: scores.profesional.toFixed(2), Keterangan: getScoreLabel(scores.profesional) },
    ]
    const wsCategory = XLSX.utils.json_to_sheet(categoryData)
    wsCategory['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsCategory, 'Analisis Kategori')

    // Sheet 3: Distribusi Jawaban
    const distData: any[] = []
    if (categoryCounts) {
      Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
        const counts = categoryCounts[key]
        const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)
        distData.push({ Kategori: label, 'Tingkat Penilaian': '', Jumlah: '', Persentase: '' })
        for (let s = 5; s >= 1; s--) {
          const count = counts[s as keyof CategoryCount] || 0
          const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          distData.push({
            Kategori: '',
            'Tingkat Penilaian': SCORE_LABELS[s as 1|2|3|4|5],
            Jumlah: count,
            Persentase: `${pct.toFixed(1)}%`
          })
        }
      })
    }
    const wsDist = XLSX.utils.json_to_sheet(distData)
    wsDist['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, wsDist, 'Distribusi Jawaban')

    // Sheet 4: Saran Masukan
    const feedbackData = feedbacks.map((fb, idx) => ({
      No: idx + 1,
      'Nama Siswa': fb.student_name,
      NIS: fb.nis,
      Tanggal: new Date(fb.submitted_at).toLocaleString('id-ID'),
      'Saran/Masukan': fb.feedback
    }))
    if (feedbackData.length === 0) {
      feedbackData.push({ No: 1, 'Nama Siswa': '', NIS: '', Tanggal: '', 'Saran/Masukan': 'Tidak ada saran/masukan dari siswa' })
    }
    const wsFeedback = XLSX.utils.json_to_sheet(feedbackData)
    wsFeedback['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsFeedback, 'Saran Masukan')

    // Download
    const filename = `Laporan_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  // ===== EXPORT PDF =====
  const handleExportPDF = () => {
    if (!teacher || !scores) return

    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.setTextColor(79, 70, 229)
    doc.text('LAPORAN PENILAIAN KINERJA GURU', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Tanggal: ${new Date().toLocaleString('id-ID')}`, 14, 22)

    // Info Guru
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Informasi Guru', 14, 30)
    doc.setFontSize(10)
    doc.text(`Nama: ${teacher.name}`, 14, 36)
    doc.text(`Mata Pelajaran: ${teacher.subject}`, 14, 42)
    doc.text(`Jumlah Responden: ${studentCount} siswa`, 14, 48)
    doc.text(`Skor Total: ${scores.total.toFixed(2)} (${getScoreLabel(scores.total)})`, 14, 54)

    // Tabel Analisis Kategori
    const categoryRows = Object.entries(CATEGORY_LABELS).map(([key, label]) => [
      label,
      key === 'kepribadian' ? '1-3' : key === 'sosial' ? '4-6' : key === 'pedagogik' ? '7-9' : '10-12',
      scores[key].toFixed(2),
      getScoreLabel(scores[key])
    ])

    autoTable(doc, {
      startY: 60,
      head: [['Kategori', 'Pertanyaan', 'Skor', 'Keterangan']],
      body: categoryRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    // Tabel Distribusi Jawaban
    const distRows: string[][] = []
    if (categoryCounts) {
      Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
        const counts = categoryCounts[key]
        const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)
        distRows.push([label, '', '', '', ''])
        for (let s = 5; s >= 1; s--) {
          const count = counts[s as keyof CategoryCount] || 0
          const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          distRows.push(['', SCORE_LABELS[s as 1|2|3|4|5], String(count), `${pct.toFixed(1)}%`, ''])
        }
      })
    }

    autoTable(doc, {
      head: [['Kategori', 'Tingkat Penilaian', 'Jumlah', 'Persentase', '']],
      body: distRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    // Saran Masukan
    const lastY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Saran & Masukan dari Siswa', 14, lastY)

    if (feedbacks.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text('Tidak ada saran/masukan dari siswa', 14, lastY + 8)
    } else {
      let yPos = lastY + 8
      feedbacks.forEach((fb, idx) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text(`${idx + 1}. ${fb.student_name} (NIS: ${fb.nis})`, 14, yPos)
        yPos += 5
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(9)
        const splitFeedback = doc.splitTextToSize(fb.feedback, 180)
        doc.text(splitFeedback, 14, yPos)
        yPos += splitFeedback.length * 5 + 5
      })
    }

    // Download
    const filename = `Laporan_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    doc.save(`${filename}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-gray-500 mt-4">Memuat detail guru...</p>
        </div>
      </div>
    )
  }

  if (!teacher || !scores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <p className="text-red-600 mb-4">{error || 'Data tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-300 hover:text-white flex items-center gap-1 text-sm mb-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Dashboard
          </button>
          <h1 className="text-2xl font-bold">Detail Penilaian Guru</h1>
          <p className="text-gray-300 mt-1">
            {teacher.name} • {teacher.subject}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nama Guru</p>
              <p className="font-bold text-gray-900 text-lg">{teacher.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mata Pelajaran</p>
              <p className="font-bold text-gray-900 text-lg">{teacher.subject}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Jumlah Responden</p>
              <p className="font-bold text-gray-900 text-lg">{studentCount} siswa</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Skor Total</p>
              <p className={`font-bold text-2xl ${
                scores.total >= 80 ? 'text-green-600' :
                scores.total >= 60 ? 'text-blue-600' :
                scores.total >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {scores.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Skor per Kategori */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Analisis Skor per Kategori</h2>
          
          {studentCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada data penilaian untuk guru ini
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const score = scores[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CATEGORY_ICONS[key]}</span>
                        <span className="font-semibold text-gray-900">{label}</span>
                        <span className="text-xs text-gray-500">(Pertanyaan {
                          key === 'kepribadian' ? '1-3' :
                          key === 'sosial' ? '4-6' :
                          key === 'pedagogik' ? '7-9' : '10-12'
                        })</span>
                      </div>
                      <span className={`font-bold text-lg ${
                        score >= 80 ? 'text-green-600' :
                        score >= 60 ? 'text-blue-600' :
                        score >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {score.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${getBarColor(score)} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tabel Frekuensi per Kategori */}
        {studentCount > 0 && categoryCounts && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Distribusi Jawaban per Kategori</h2>
            <p className="text-sm text-gray-500 mb-4">
              Menunjukkan berapa banyak siswa yang memilih setiap tingkat penilaian
            </p>

            <div className="space-y-4">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const counts = categoryCounts[key]
                const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)
                
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>{CATEGORY_ICONS[key]}</span>
                      {label}
                    </h3>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {[5, 4, 3, 2, 1].map(score => {
                        const count = counts[score as keyof CategoryCount] || 0
                        const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
                        return (
                          <div key={score} className={`rounded-lg border p-3 text-center ${SCORE_COLORS[score]}`}>
                            <div className="text-xs font-semibold mb-1">
                              {SCORE_LABELS[score]}
                            </div>
                            <div className="text-2xl font-bold mb-1">
                              {count}
                            </div>
                            <div className="text-xs">
                              {percentage.toFixed(0)}%
                            </div>
                            <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
                              <div
                                className="bg-current h-1.5 rounded-full opacity-60"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Jawaban Terbuka Siswa */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💬 Saran & Masukan dari Siswa</h2>
          
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {studentCount === 0 
                ? 'Belum ada penilaian untuk guru ini'
                : 'Belum ada siswa yang memberikan saran/masukan'}
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb, idx) => (
                <div key={idx} className="border-l-4 border-indigo-400 bg-gray-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{fb.student_name}</p>
                      <p className="text-xs text-gray-500">NIS: {fb.nis}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(fb.submitted_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {fb.feedback}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tombol Export */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📥 Export Laporan</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={!teacher || !scores}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              📊 Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!teacher || !scores}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              📄 Export PDF
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 File akan langsung terdownload di browser Anda. Excel memiliki 4 sheet: Info, Analisis, Distribusi, dan Saran Masukan.
          </p>
        </div>
      </main>
    </div>
  )
}