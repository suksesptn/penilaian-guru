import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Ambil semua kelas
export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, created_at')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, classes: data || [] })
  } catch (error: any) {
    console.error('Error fetching classes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Tambah kelas baru
export async function POST(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, class: data })
  } catch (error: any) {
    console.error('Error creating class:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}