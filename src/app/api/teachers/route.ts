import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Ambil class_id dari cookies
    const classId = request.cookies.get('student_class_id')?.value

    if (!classId) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    console.log('📚 Fetching teachers for class_id:', classId)

    // 1. Ambil daftar guru yang mengajar di kelas ini
    const { data: teacherClasses, error: tcError } = await supabase
      .from('teacher_classes')
      .select('teacher_id')
      .eq('class_id', classId)

    if (tcError) {
      console.error('❌ Error fetching teacher_classes:', tcError)
      return NextResponse.json(
        { error: 'Gagal mengambil data guru' },
        { status: 500 }
      )
    }

    const teacherIds = teacherClasses.map(tc => tc.teacher_id)

    if (teacherIds.length === 0) {
      return NextResponse.json({ teachers: [] })
    }

    // 2. Ambil detail guru
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .in('id', teacherIds)
      .order('name', { ascending: true })

    if (teachersError) {
      console.error('❌ Error fetching teachers:', teachersError)
      return NextResponse.json(
        { error: 'Gagal mengambil data guru' },
        { status: 500 }
      )
    }

    // 3. Ambil student_id dari cookies untuk cek status pengisian
    const studentId = request.cookies.get('student_id')?.value

    // 4. Cek angket mana yang sudah diisi siswa ini
    let filledTeacherIds: number[] = []
    if (studentId) {
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('teacher_id')
        .eq('student_id', studentId)
        .in('teacher_id', teacherIds)

      if (evaluations) {
        filledTeacherIds = evaluations.map(e => e.teacher_id)
      }
    }

    // 5. Gabungkan data guru dengan status pengisian
    const teachersWithStatus = teachers.map(teacher => ({
      ...teacher,
      is_filled: filledTeacherIds.includes(teacher.id)
    }))

    console.log(`✅ Found ${teachersWithStatus.length} teachers, ${filledTeacherIds.length} filled`)

    return NextResponse.json({
      success: true,
      teachers: teachersWithStatus,
      total: teachersWithStatus.length,
      filled: filledTeacherIds.length
    })
  } catch (error) {
    console.error('💥 Error in teachers API:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}