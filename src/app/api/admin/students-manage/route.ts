import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('students')
      .select('id, nis, name, class_id, created_at')
      .order('nis', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, students: data || [] })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { nis, name, class_id } = await request.json()

    if (!nis || !name || !class_id) {
      return NextResponse.json({ error: 'NIS, nama, dan kelas wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('students')
      .insert({ nis: nis.trim(), name: name.trim(), class_id: parseInt(class_id) })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, student: data })
  } catch (error: any) {
    console.error('Error creating student:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}