import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateScores } from '@/lib/export'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(id)

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const studentCount = evaluations?.length || 0
    let answers: any[] = []

    if (studentCount > 0) {
      const evalIds = evaluations!.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      answers = data || []
    }

    const scoreResult = calculateScores(answers, studentCount)

    const categoryCounts = {
      kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
    answers.forEach(a => {
      if (a.question_no >= 1 && a.question_no <= 3) categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 4 && a.question_no <= 6) categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 7 && a.question_no <= 9) categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistem Penilaian Guru'
    workbook.created = new Date()

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    }

    const cellBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    }

    const sheet1 = workbook.addWorksheet('Info Guru')
    sheet1.columns = [
      { width: 25 },
      { width: 40 },
    ]

    sheet1.addRow(['LAPORAN PENILAIAN KINERJA GURU']).font = { bold: true, size: 14 }
    sheet1.addRow([])
    sheet1.addRow(['Nama Guru', teacher.name])
    sheet1.addRow(['Mata Pelajaran', teacher.subject])
    sheet1.addRow(['Jumlah Responden', `${studentCount} siswa`])
    sheet1.addRow(['Tanggal Export', new Date().toLocaleDateString('id-ID')])
    sheet1.addRow([])
    sheet1.addRow(['SKOR TOTAL', scoreResult.total.toFixed(2)]).font = { bold: true, size: 14, color: { argb: scoreResult.total >= 80 ? 'FF16A34A' : 'FFDC2626' } }
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateScores } from '@/lib/export'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(id)

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const studentCount = evaluations?.length || 0
    let answers: any[] = []

    if (studentCount > 0) {
      const evalIds = evaluations!.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
const sheet2 = workbook.addWorksheet('Analisis Kategori')
    sheet2.columns = [
      { width: 20 },
      { width: 20 },
      { width: 15 },
      { width: 50 },
    ]

    sheet2.addRow(['Kategori', 'Pertanyaan', 'Skor', 'Keterangan']).eachCell(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = headerStyle.border
    })

    const categories = [
      { key: 'kepribadian', label: 'Kepribadian', range: '1-3' },
      { key: 'sosial', label: 'Sosial', range: '4-6' },
      { key: 'pedagogik', label: 'Pedagogik', range: '7-9' },
      { key: 'profesional', label: 'Profesional', range: '10-12' },
    ]

    categories.forEach(cat => {
      const score = scoreResult[cat.key as keyof typeof scoreResult]
      const row = sheet2.addRow([
        cat.label,
        `Pertanyaan ${cat.range}`,
        score.toFixed(2),
        score >= 80 ? 'Sangat Baik' : score >= 60 ? 'Baik' : score >= 40 ? 'Cukup' : 'Kurang'
      ])
      row.eachCell(cell => {
        cell.border = cellBorder
        cell.alignment = { vertical: 'middle' as const }
      })
    })

    const sheet3 = workbook.addWorksheet('Distribusi Jawaban')
    sheet3.columns = [
      { width: 20 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
    ]

    sheet3.addRow(['Kategori', 'Tingkat Penilaian', 'Jumlah', 'Persentase']).eachCell(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = headerStyle.border
    })

    const scoreLabels = { 1: 'Sangat Kurang Baik', 2: 'Kurang Baik', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' }

    categories.forEach(cat => {
      sheet3.addRow([cat.label, '', '', '']).eachCell(c => {
        c.font = { bold: true }
const sheet4 = workbook.addWorksheet('Saran Masukan')
    sheet4.columns = [
      { width: 8 },
      { width: 25 },
      { width: 15 },
      { width: 25 },
      { width: 60 },
    ]

    sheet4.addRow(['No', 'Nama Siswa', 'NIS', 'Tanggal', 'Saran/Masukan']).eachCell(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = headerStyle.border
    })

    const feedbacks = evaluations?.filter(e => e.open_feedback).map(e => ({
      student_name: e.students?.[0]?.name || 'Anonim',
      nis: e.students?.[0]?.nis || '-',
      feedback: e.open_feedback,
      submitted_at: e.submitted_at
    })) || []

    feedbacks.forEach((fb, idx) => {
      const row = sheet4.addRow([
        idx + 1,
        fb.student_name,
        fb.nis,
        new Date(fb.submitted_at).toLocaleString('id-ID'),
        fb.feedback
      ])
      row.eachCell(cell => {
        cell.border = cellBorder
        cell.alignment = { vertical: 'top' as const, wrapText: true }
      })
    })

    if (feedbacks.length === 0) {
      sheet4.addRow(['', '', '', '', 'Tidak ada saran/masukan dari siswa']).eachCell(c => {
        c.font = { italic: true, color: { argb: 'FF9CA3AF' } }
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Gagal mengexport data' },
      { status: 500 }
    )
  }
}
        c.fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } }
        c.border = cellBorder
      })

      const counts = categoryCounts[cat.key as keyof typeof categoryCounts]
      const totalAnswers = Object.values(counts).reduce((a: number, b: number) => a + b, 0)

      for (let s = 5; s >= 1; s--) {
        const count = counts[s as 1 | 2 | 3 | 4 | 5]
        const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        const row = sheet3.addRow([
          '',
          scoreLabels[s as 1 | 2 | 3 | 4 | 5],
          count,
          `${pct.toFixed(1)}%`
        ])
        row.eachCell(cell => {
          cell.border = cellBorder
          cell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const }
        })
      }
    })
      answers = data || []
    }

    const scoreResult = calculateScores(answers, studentCount)

    const categoryCounts = {
      kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
    answers.forEach(a => {
      if (a.question_no >= 1 && a.question_no <= 3) categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 4 && a.question_no <= 6) categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 7 && a.question_no <= 9) categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistem Penilaian Guru'
    workbook.created = new Date()

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    }

    const cellBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    }

    const sheet1 = workbook.addWorksheet('Info Guru')
    sheet1.columns = [
      { width: 25 },
      { width: 40 },
    ]

    sheet1.addRow(['LAPORAN PENILAIAN KINERJA GURU']).font = { bold: true, size: 14 }
    sheet1.addRow([])
    sheet1.addRow(['Nama Guru', teacher.name])
    sheet1.addRow(['Mata Pelajaran', teacher.subject])
    sheet1.addRow(['Jumlah Responden', `${studentCount} siswa`])
    sheet1.addRow(['Tanggal Export', new Date().toLocaleDateString('id-ID')])
    sheet1.addRow([])
    sheet1.addRow(['SKOR TOTAL', scoreResult.total.toFixed(2)]).font = { bold: true, size: 14, color: { argb: scoreResult.total >= 80 ? 'FF16A34A' : 'FFDC2626' } }
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateScores } from '@/lib/export'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(id)

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const studentCount = evaluations?.length || 0
    let answers: any[] = []

    if (studentCount > 0) {
      const evalIds = evaluations!.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      answers = data || []
    }

    const scoreResult = calculateScores(answers, studentCount)
    const categoryCounts = {
      kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
    answers.forEach(a => {
      if (a.question_no >= 1 && a.question_no <= 3) categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.kepribadian[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 4 && a.question_no <= 6) categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.sosial[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else if (a.question_no >= 7 && a.question_no <= 9) categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.pedagogik[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
      else categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts.profesional[a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistem Penilaian Guru'
    workbook.created = new Date()

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const },
      },
    }

    const cellBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    }

    const sheet1 = workbook.addWorksheet('Info Guru')
    sheet1.columns = [
      { width: 25 },
      { width: 40 },
    ]

    sheet1.addRow(['LAPORAN PENILAIAN KINERJA GURU']).font = { bold: true, size: 14 }
    sheet1.addRow([])
    sheet1.addRow(['Nama Guru', teacher.name])
    sheet1.addRow(['Mata Pelajaran', teacher.subject])
    sheet1.addRow(['Jumlah Responden', `${studentCount} siswa`])
    sheet1.addRow(['Tanggal Export', new Date().toLocaleDateString('id-ID')])
    sheet1.addRow([])
    sheet1.addRow(['SKOR TOTAL', scoreResult.total.toFixed(2)]).font = { bold: true, size: 14, color: { argb: scoreResult.total >= 80 ? 'FF16A34A' : 'FFDC2626' } }

