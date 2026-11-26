'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

// ✅ Parser khusus untuk struktur response API Anda: { success: true, data: {...} }
function extractStudent(responseData: any): any {
  if (!responseData) return null

  // Struktur API Anda: { success: true, data: { id, nis, name, class_id, class_name } }
  if (responseData.data && responseData.data.id) {
    return {
      id: responseData.data.id,
      nis: responseData.data.nis,
      name: responseData.data.name,
      class_id: responseData.data.class_id,
      class_name: responseData.data.class_name,
    }
  }

  // Fallback: jika struktur berbeda
  if (responseData.id) {
    return {
      id: responseData.id,
      nis: responseData.nis,
      name: responseData.name,
      class_id: responseData.class_id,
      class_name: responseData.class_name,
    }
  }

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [nis, setNis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getCookie('student_id')) {
      router.push('/dashboard')
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis: nis.trim() })
      })

      const data = await res.json()

      console.log('📦 API Response:', JSON.stringify(data, null, 2))

      if (!res.ok) {
        throw new Error(data.error || 'NIS tidak ditemukan. Hubungi admin sekolah.')
      }

      // ✅ Gunakan parser untuk extract data siswa
      const student = extractStudent(data)

      if (!student || !student.id) {
        console.error('❌ Gagal extract student. Struktur data:', data)
        throw new Error('Data siswa tidak valid. Silakan hubungi admin.')
      }

      console.log('✅ Student extracted:', student)

      // ✅ Set SEMUA cookie termasuk class_id
      setCookie('student_id', String(student.id), 1)
      setCookie('student_nis', String(student.nis || nis.trim()), 1)
      setCookie('student_name', String(student.name || 'Siswa'), 1)
      setCookie('student_class_id', String(student.class_id || ''), 1)
      setCookie('student_class_name', String(student.class_name || 'Kelas tidak diketahui'), 1)

      console.log('✅ Cookies set, redirecting to dashboard...')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('💥 Login error:', err)
      setError(err.message || 'Gagal login. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        
        {/* Logo Al Bayan */}
        <div className="flex justify-center mb-4">
          <img 
            src="https://albayananyer.sch.id/wp-content/uploads/2021/11/cropped-Logo-Al-Baryan-512x512-1.png" 
            alt="Logo SMA Pesantren Unggul Al Bayan"
            className="w-24 h-24 object-contain rounded-full bg-white p-1 shadow-sm"
          />
        </div>

        {/* Judul */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Angket Umpan Balik Siswa</h1>
          <p className="text-gray-500 mt-1 text-sm">SMA Pesantren Unggul Al Bayan</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nomor Induk Siswa (NIS)
            </label>
            <input
              type="text"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              placeholder="Contoh: 262710010"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              required
              disabled={loading}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !nis.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SMA Pesantren Unggul Al Bayan
          </p>
        </div>
      </div>
    </div>
  )
}