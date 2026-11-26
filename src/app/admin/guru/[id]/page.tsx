'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

interface ClassInfo {
  id: number
  name: string
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

  // Data per kelas
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [scoresByClass, setScoresByClass] = useState<Record<string, any>>({})
  const [categoryCountsByClass, setCategoryCountsByClass] = useState<Record<string, Record<string, CategoryCount>>>({})
  const [feedbacksByClass, setFeedbacksByClass] = useState<Record<string, Feedback[]>>({})
  const [studentCountByClass, setStudentCountByClass] = useState<Record<string, number>>({})

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

      setClasses(data.classes || [])
      setScoresByClass(data.scores_by_class || {})
      setCategoryCountsByClass(data.category_counts_by_class || {})
      setFeedbacksByClass(data.feedbacks_by_class || {})
      setStudentCountByClass(data.student_count_by_class || {})
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

  // ===== Helper: bangun baris distribusi untuk daftar kategori tertentu =====
  const buildDistRows = (
    countsObj: Record<string, CategoryCount>,
    keys: string[]
  ): string[][] => {
    const rows: string[][] = []
    keys.forEach(key => {
      const label = CATEGORY_LABELS[key]
      const counts = countsObj[key] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)
      rows.push([label, '', ''])
      for (let s = 5; s >= 1; s--) {
        const count = counts[s as keyof CategoryCount] || 0
        const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        rows.push(['', SCORE_LABELS[s as 1 | 2 | 3 | 4 | 5], `${pct.toFixed(1)}%`])
      }
    })
    return rows
  }

  // ===== EXPORT PDF (1 FILE, SEMUA KELAS) =====
  const handleExportPDF = () => {
    if (!teacher || !scores) return

    const doc = new jsPDF()

    // Daftar kelas (fallback: 1 entri gabungan)
    const classList: ClassInfo[] =
      classes.length > 0 ? classes : [{ id: 0, name: 'Semua Kelas' }]

    const distHead = [['Kategori', 'Tingkat', 'Persentase']]
    const distStyles = {
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' as const },
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' as const },
        1: { cellWidth: 40 },
        2: { cellWidth: 20, halign: 'right' as const },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      tableWidth: 86,
    }

    classList.forEach((cls, clsIndex) => {
      // Halaman baru untuk setiap kelas setelah kelas pertama
      if (clsIndex > 0) doc.addPage()

      const cid = String(cls.id)
      const classScores = scoresByClass[cid] || scores
      const classCounts = categoryCountsByClass[cid] || categoryCounts || {}
      const classFeedbacks = feedbacksByClass[cid] || feedbacks || []
      const classStudentCount = studentCountByClass[cid] ?? studentCount

      // ===== HEADER: judul rata tengah =====
      doc.setFontSize(16)
      doc.setTextColor(79, 70, 229)
      doc.setFont(undefined, 'bold')
      doc.text('LAPORAN ANGKET UMPAN BALIK SISWA', 105, 18, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.setFont(undefined, 'normal')
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 105, 25, { align: 'center' })

      // ===== INFO GURU: sejajar rapi =====
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Informasi Guru', 14, 38)

      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      const labelWidth = 45
      const colonX = 14 + labelWidth - 5
      const valueX = 14 + labelWidth
      let y = 45

      doc.text('Nama', 14, y); doc.text(':', colonX, y); doc.text(teacher.name, valueX, y); y += 6
      doc.text('Mata Pelajaran', 14, y); doc.text(':', colonX, y); doc.text(teacher.subject, valueX, y); y += 6
      doc.text('Kelas', 14, y); doc.text(':', colonX, y); doc.text(cls.name, valueX, y); y += 6
      doc.text('Jumlah Responden', 14, y); doc.text(':', colonX, y); doc.text(`${classStudentCount} siswa`, valueX, y); y += 6
      doc.text('Skor Total', 14, y); doc.text(':', colonX, y)
      doc.text(`${classScores.total.toFixed(2)} (${getScoreLabel(classScores.total)})`, valueX, y)
      y += 10

      // ===== TABEL ANALISIS KATEGORI =====
      const categoryRows = Object.entries(CATEGORY_LABELS).map(([key, label]) => [
        label,
        key === 'kepribadian' ? '1-3' : key === 'sosial' ? '4-6' : key === 'pedagogik' ? '7-9' : '10-12',
        classScores[key].toFixed(2),
        getScoreLabel(classScores[key]),
      ])

      autoTable(doc, {
        startY: y,
        head: [['Kategori', 'Pertanyaan', 'Skor', 'Keterangan']],
        body: categoryRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      // ===== DISTRIBUSI JAWABAN: 2 KOLOM (kiri 2 kategori, kanan 2 kategori) =====
      y = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Distribusi Jawaban', 14, y)

      const distStartY = y + 4
      const leftRows = buildDistRows(classCounts, ['kepribadian', 'sosial'])
      const rightRows = buildDistRows(classCounts, ['pedagogik', 'profesional'])

      // Tabel kiri
      autoTable(doc, {
        ...distStyles,
        startY: distStartY,
        head: distHead,
        body: leftRows,
        margin: { left: 14, right: 110, top: 10, bottom: 10 },
      })

      // Tabel kanan (startY sama agar sejajar)
      autoTable(doc, {
        ...distStyles,
        startY: distStartY,
        head: distHead,
        body: rightRows,
        margin: { left: 110, right: 14, top: 10, bottom: 10 },
      })

      // ===== HALAMAN BARU: SARAN & MASUKAN KELAS INI =====
      doc.addPage()
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text(`Saran & Masukan Siswa - ${cls.name} (Anonim)`, 105, 20, { align: 'center' })

      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.setFont(undefined, 'normal')
      doc.text(`${teacher.name} • ${teacher.subject}`, 105, 27, { align: 'center' })

      let yPos = 38
      const validFeedbacks = classFeedbacks.filter(
        (fb: any) => fb.feedback && fb.feedback.trim() !== ''
      )

      if (validFeedbacks.length === 0) {
        doc.setTextColor(150, 150, 150)
        doc.setFont(undefined, 'italic')
        doc.text('Tidak ada saran/masukan dari siswa di kelas ini.', 14, yPos)
      } else {
        doc.setTextColor(100, 100, 100)
        doc.text(`Total ${validFeedbacks.length} masukan dari siswa:`, 14, yPos)
        yPos += 8

        validFeedbacks.forEach((fb: any, idx: number) => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 20
          }
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(9)
          doc.setFont(undefined, 'normal')
          const splitFeedback = doc.splitTextToSize(`${idx + 1}. ${fb.feedback.trim()}`, 180)
          doc.text(splitFeedback, 14, yPos)
          yPos += splitFeedback.length * 4.5 + 4
        })
      }
    })

    // ===== FOOTER: anonim + nomor halaman (diisi sekali untuk semua halaman) =====
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont(undefined, 'italic')
      doc.text('* Data bersifat anonim - identitas siswa tidak ditampilkan', 14, 287)
      doc.text(`Halaman ${i} dari ${totalPages}`, 196, 287, { align: 'right' })
    }

    // ===== DOWNLOAD: 1 file saja =====
    const teacherName = teacher.name.replace(/\s+/g, '_')
    const filename = `Laporan_Umpan_Balik_${teacherName}_${new Date().toISOString().split('T')[0]}`
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
          <h1 className="text-2xl font-bold">Detail Umpan Balik Siswa</h1>
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

        {/* Daftar Kelas yang Dinilai */}
        {classes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🏫 Kelas yang Menilai Guru Ini</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {classes.map((cls) => {
                const cid = String(cls.id)
                const s = scoresByClass[cid]
                const c = studentCountByClass[cid] ?? 0
                return (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4 text-center hover:border-indigo-300 transition">
                    <p className="font-bold text-gray-900">{cls.name}</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      s && s.total >= 80 ? 'text-green-600' :
                      s && s.total >= 60 ? 'text-blue-600' :
                      s && s.total >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {s ? s.total.toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{c} siswa</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Skor per Kategori */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Analisis Skor per Kategori</h2>

          {studentCount === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada data umpan balik untuk guru ini
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
                ? 'Belum ada umpan balik untuk guru ini'
                : 'Belum ada siswa yang memberikan saran/masukan'}
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((fb, idx) => (
                <div key={idx} className="border-l-4 border-indigo-400 bg-gray-50 p-4 rounded-r-lg">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    <span className="font-semibold text-indigo-700">#{idx + 1}</span> {fb.feedback}
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
              onClick={handleExportPDF}
              disabled={!teacher || !scores}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              📄 Export PDF
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 PDF berisi laporan lengkap untuk <strong>semua kelas</strong> yang menilai guru ini dalam 1 file.
            Untuk laporan Excel gabungan semua guru, gunakan tombol Export di Dashboard.
          </p>
        </div>
      </main>
    </div>
  )
}