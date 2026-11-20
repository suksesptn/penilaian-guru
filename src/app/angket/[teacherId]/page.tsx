'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Teacher {
  id: number
  name: string
  subject: string
}

interface Question {
  no: number
  text: string
}

// 12 Pertanyaan Baru
const QUESTIONS: Question[] = [
  { no: 1, text: 'Menunjukkan keteladanan dalam kedisiplinan, ketepatan waktu dan mengarahkan siswa untuk mentaati aturan yang berlaku' },
  { no: 2, text: 'Mampu mengendalikan emosi, bersikap adil, menghargai siswa dan memperlakukan semua siswa dengan baik' },
  { no: 3, text: 'Menunjukkan kesholehan, keistiqomahan, adab yang Islami dan ketaatan beribadah' },
  { no: 4, text: 'Berkomunikasi dengan siswa secara sopan, ramah dan terbuka' },
  { no: 5, text: 'Menunjukkan sikap peduli, empati, dan kesediaan membantu siswa ketika menghadapi kesulitan' },
  { no: 6, text: 'Membangun hubungan yang baik dengan siswa, menjalin keakraban, hangat dan berinteraksi secara baik dengan siswa' },
  { no: 7, text: 'Menjelaskan materi pelajaran dengan jelas, sistematis, dan mudah dipahami oleh siswa' },
  { no: 8, text: 'Pembelajarannya menarik, kondusif, bervariasi, melibatkan siswa dan tidak membosankan' },
  { no: 9, text: 'Memberikan penilaian yang adil, terbuka, transparan dan ada umpan balik serta tindak lanjut' },
  { no: 10, text: 'Menguasai materi, berwawasan luas dan memberikan jawaban dengan memuaskan' },
  { no: 11, text: 'Mampu menghubungkan materi pelajaran dengan penerapan dalam kehidupan nyata serta perkembangan IPTEK' },
  { no: 12, text: 'Mampu menginspirasi siswa dalam mengembangkan potensi, minat dan bakat pada pelajaran yang diajarkannya' },
]

// Opsi Skala (Nilai backend tetap 1-5 agar perhitungan skor tidak rusak)
const SCALE_OPTIONS = [
  { value: 1, label: 'Sangat Tidak Setuju' },
  { value: 2, label: 'Tidak Setuju' },
  { value: 3, label: 'Ragu-ragu' },
  { value: 4, label: 'Setuju' },
  { value: 5, label: 'Sangat Setuju' },
]

export default function AngketPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.teacherId as string

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [openFeedback, setOpenFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchTeacher()
  }, [teacherId])

  const fetchTeacher = async () => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeacher(data.teacher)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionNo: number, score: number) => {
    setAnswers(prev => ({ ...prev, [questionNo]: score }))
  }

  const isComplete = () => {
    return QUESTIONS.every(q => answers[q.no] !== undefined)
  }

  const handleSubmit = async () => {
    if (!isComplete()) {
      setError('Mohon jawab semua pertanyaan sebelum submit.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: parseInt(teacherId),
          answers: QUESTIONS.map(q => ({
            question_no: q.no,
            score: answers[q.no]
          })),
          open_feedback: openFeedback
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 mt-4">Memuat data guru...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <p className="text-red-600 mb-4">{error || 'Guru tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Berhasil Disimpan!</h2>
          <p className="text-gray-600">Terima kasih atas penilaian Anda untuk <strong>{teacher.name}</strong>.</p>
          <p className="text-sm text-gray-500 mt-4">Mengalihkan ke dashboard...</p>
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = QUESTIONS.length

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <span className="text-sm font-semibold text-indigo-600">
              {answeredCount} / {totalQuestions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Teacher Info */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
          <p className="text-sm opacity-90 mb-1">Penilaian untuk Guru</p>
          <h1 className="text-2xl font-bold">{teacher.name}</h1>
          <p className="text-lg opacity-90 mt-1">📚 {teacher.subject}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
          <p className="text-sm text-blue-900">
            <strong>📝 Petunjuk:</strong> Berikan penilaian untuk setiap pernyataan di bawah ini dengan memilih salah satu dari 5 pilihan jawaban yang tersedia.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {QUESTIONS.map((q) => (
            <div key={q.no} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="font-medium text-gray-900 mb-6 flex items-start gap-3">
                <span className="text-indigo-600 font-bold flex-shrink-0">
                  {q.no}.
                </span>
                <span className="leading-relaxed">{q.text}</span>
              </p>

              {/* Scale Options - Clean Layout */}
              <div className="ml-0 sm:ml-8">
                <div className="grid grid-cols-5 gap-1 sm:gap-4">
                  {SCALE_OPTIONS.map(option => {
                    const isSelected = answers[q.no] === option.value
                    return (
                      <label key={option.value} className="flex flex-col items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={`q-${q.no}`}
                          value={option.value}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(q.no, option.value)}
                          className="sr-only"
                        />
                        {/* Radio Button Circle */}
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all mb-1 sm:mb-2 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 shadow-md'
                            : 'border-gray-400 group-hover:border-indigo-400 bg-white'
                        }`}>
                          {isSelected && (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white"></div>
                          )}
                        </div>
                        {/* Full Label Below */}
                        <div className="text-[10px] sm:text-xs text-gray-700 text-center leading-tight font-medium px-1">
                          {option.label}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Open Feedback */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>💬</span>
            Harapan & Masukan
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Tuliskan harapan kamu terhadap guru ini secara singkat dibawah ini (Jika ada) :
          </p>
          <textarea
            value={openFeedback}
            onChange={(e) => setOpenFeedback(e.target.value)}
            rows={5}
            maxLength={1000}
            placeholder="Contoh: Semoga Bapak/Ibu guru selalu sehat dan semakin semangat mengajar..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-gray-900 placeholder-gray-400"
            style={{ color: '#111827' }}
          ></textarea>
          <p className="text-xs text-gray-500 mt-2 text-right">
            {openFeedback.length} / 1000 karakter
          </p>
        </div>
      </div>

      {/* Submit Button (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isComplete()}
            className={`w-full py-3.5 rounded-lg font-bold text-white transition-all ${
              !isComplete()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md'
            }`}
          >
            {submitting ? 'Mengirim...' : isComplete() ? '✅ KIRIM PENILAIAN' : `Jawab ${totalQuestions - answeredCount} pertanyaan lagi`}
          </button>
        </div>
      </div>
    </div>
  )
}