import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const { nis, name, class_id } = await request.json()

    if (!nis || !name || !class_id) {
      return NextResponse.json({ error: 'NIS, nama, dan kelas wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('students')
      .update({ nis: nis.trim(), name: name.trim(), class_id: parseInt(class_id) })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, student: data })
  } catch (error: any) {
    console.error('Error updating student:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params

    const { count } = await supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus siswa. Masih ada ${count} data penilaian.` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}