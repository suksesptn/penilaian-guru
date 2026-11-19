import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Ambil kelas yang diajar guru tertentu
export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const teacherId = request.nextUrl.searchParams.get('teacher_id')
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id wajib' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('teacher_classes')
      .select('class_id')
      .eq('teacher_id', parseInt(teacherId))

    if (error) throw error

    const classIds = (data || []).map(tc => tc.class_id)
    return NextResponse.json({ success: true, class_ids: classIds })
  } catch (error: any) {
    console.error('Error fetching teacher classes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Update korelasi guru-kelas (replace semua)
export async function POST(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { teacher_id, class_ids } = await request.json()

    if (!teacher_id || !Array.isArray(class_ids)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    // Hapus semua korelasi lama guru ini
    await supabase
      .from('teacher_classes')
      .delete()
      .eq('teacher_id', teacher_id)

    // Insert korelasi baru
    if (class_ids.length > 0) {
      const rows = class_ids.map((classId: number) => ({
        teacher_id: teacher_id,
        class_id: classId
      }))

      const { error } = await supabase
        .from('teacher_classes')
        .insert(rows)

      if (error) throw error
    }

    return NextResponse.json({ success: true, count: class_ids.length })
  } catch (error: any) {
    console.error('Error saving teacher classes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}