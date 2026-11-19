import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Ambil semua guru
export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, subject, created_at')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, teachers: data || [] })
  } catch (error: any) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Tambah guru baru
export async function POST(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { name, subject } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama guru wajib diisi' }, { status: 400 })
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Mata pelajaran wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert({ 
        name: name.trim(), 
        subject: subject.trim() 
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, teacher: data })
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}