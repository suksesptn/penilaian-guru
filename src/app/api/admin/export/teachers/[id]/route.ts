import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    if (isNaN(teacherId)) {
      return NextResponse.json({ error: 'ID guru tidak valid' }, { status: 400 })
    }

    // 1. Ambil data guru
    const { data: teacher, error: tError } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (tError || !teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil evaluations
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const studentCount = evaluations?.length || 0

    // 3. Ambil answers
    let answers: any[] = []
    if (studentCount > 0) {
      const evalIds = evaluations!.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      answers = data || []
    }

    // 4. Hitung skor
    const categoryScores = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 }
    const categoryCounts = {
      kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    answers.forEach(a => {
      let category: keyof typeof categoryScores
      if (a.question_no >= 1 && a.question_no <= 3) category = 'kepribadian'
      else if (a.question_no >= 4 && a.question_no <= 6) category = 'sosial'
      else if (a.question_no >= 7 && a.question_no <= 9) category = 'pedagogik'
      else category = 'profesional'

      categoryScores[category] += a.score
      categoryCounts[category][a.score as 1|2|3|4|5]++
    })

    const maxPerCategory = studentCount * 3 * 5
    const scores = {
      kepribadian: studentCount > 0 ? (categoryScores.kepribadian / maxPerCategory) * 100 : 0,
      sosial: studentCount > 0 ? (categoryScores.sosial / maxPerCategory) * 100 : 0,
      pedagogik: studentCount > 0 ? (categoryScores.pedagogik / maxPerCategory) * 100 : 0,
      profesional: studentCount > 0 ? (categoryScores.profesional / maxPerCategory) * 100 : 0,
    }
    const total = (scores.kepribadian + scores.sosial + scores.pedagogik + scores.profesional) / 4

    // ===== BUAT EXCEL =====
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistem Penilaian Guru'
    workbook.created = new Date()

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }

    const cellBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }

    // Sheet 1: Info Guru
    const sheet1 = workbook.addWorksheet('Info Guru')
    sheet1.columns = [{ width: 25 }, { width: 40 }]
    sheet1.addRow(['LAPORAN PENILAIAN KINERJA GURU']).font = { bold: true, size: 14 }
    sheet1.addRow([])
    sheet1.addRow(['Nama Guru', teacher.name])
    sheet1.addRow(['Mata Pelajaran', teacher.subject])
    sheet1.addRow(['Jumlah Responden', `${studentCount} siswa`])
    sheet1.addRow(['Tanggal Export', new Date().toLocaleDateString('id-ID')])
    sheet1.addRow([])
    sheet1.addRow(['SKOR TOTAL', total.toFixed(2)]).font = { bold: true, size: 14 }

    // Sheet 2: Analisis Kategori
    const sheet2 = workbook.addWorksheet('Analisis Kategori')
    sheet2.columns = [{ width: 20 }, { width: 20 }, { width: 15 }, { width: 50 }]
    sheet2.addRow(['Kategori', 'Pertanyaan', 'Skor', 'Keterangan']).forEach(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = cellBorder
    })

    const categories = [
      { key: 'kepribadian', label: 'Kepribadian', range: '1-3' },
      { key: 'sosial', label: 'Sosial', range: '4-6' },
      { key: 'pedagogik', label: 'Pedagogik', range: '7-9' },
      { key: 'profesional', label: 'Profesional', range: '10-12' },
    ]

    categories.forEach(cat => {
      const score = scores[cat.key as keyof typeof scores]
      const row = sheet2.addRow([
        cat.label,
        `Pertanyaan ${cat.range}`,
        score.toFixed(2),
        score >= 80 ? 'Sangat Baik' : score >= 60 ? 'Baik' : score >= 40 ? 'Cukup' : 'Kurang'
      ])
      row.eachCell(cell => {
        cell.border = cellBorder
        cell.alignment = { vertical: 'middle' }
      })
    })

    // Sheet 3: Distribusi Jawaban
    const sheet3 = workbook.addWorksheet('Distribusi Jawaban')
    sheet3.columns = [{ width: 20 }, { width: 20 }, { width: 15 }, { width: 15 }]
    sheet3.addRow(['Kategori', 'Tingkat Penilaian', 'Jumlah', 'Persentase']).forEach(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = cellBorder
    })

    const scoreLabels: Record<number, string> = {
      1: 'Sangat Kurang Baik',
      2: 'Kurang Baik',
      3: 'Cukup',
      4: 'Baik',
      5: 'Sangat Baik'
    }

    categories.forEach(cat => {
      sheet3.addRow([cat.label, '', '', '']).eachCell(c => {
        c.font = { bold: true }
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
        c.border = cellBorder
      })

      const counts = categoryCounts[cat.key as keyof typeof categoryCounts]
      const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)

      for (let s = 5; s >= 1; s--) {
        const count = counts[s as 1|2|3|4|5]
        const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        const row = sheet3.addRow(['', scoreLabels[s as 1|2|3|4|5], count, `${pct.toFixed(1)}%`])
        row.eachCell(cell => {
          cell.border = cellBorder
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        })
      }
    })

    // Sheet 4: Saran Masukan
    const sheet4 = workbook.addWorksheet('Saran Masukan')
    sheet4.columns = [{ width: 8 }, { width: 25 }, { width: 15 }, { width: 25 }, { width: 60 }]
    sheet4.addRow(['No', 'Nama Siswa', 'NIS', 'Tanggal', 'Saran/Masukan']).forEach(cell => {
      cell.font = headerStyle.font
      cell.fill = headerStyle.fill
      cell.alignment = headerStyle.alignment
      cell.border = cellBorder
    })

    const feedbacks = (evaluations || [])
      .filter(e => e.open_feedback)
      .map(e => ({
        student_name: e.students?.name || 'Anonim',
        nis: e.students?.nis || '-',
        feedback: e.open_feedback,
        submitted_at: e.submitted_at
      }))

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
        cell.alignment = { vertical: 'top', wrapText: true }
      })
    })

    if (feedbacks.length === 0) {
      sheet4.addRow(['', '', '', '', 'Tidak ada saran/masukan dari siswa']).eachCell(c => {
        c.font = { italic: true, color: { argb: 'FF9CA3AF' } }
      })
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Gagal mengexport data: ' + error.message },
      { status: 500 }
    )
  }
}