'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface AllowedPhone {
  id: string
  phoneNumber: string
  groupName: string | null
  addedAt: string
}

export default function AllowedPhonesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [phones, setPhones] = useState<AllowedPhone[]>([])
  const [newPhone, setNewPhone] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [bulkNumbers, setBulkNumbers] = useState('')
  const [bulkGroup, setBulkGroup] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [cleanupLoading, setCleanupLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
    } else {
      fetchPhones()
    }
  }, [session, status, router])

  const fetchPhones = async () => {
    try {
      const response = await fetch('/api/admin/allowed-phones')
      const data = await response.json()

      if (response.ok) {
        setPhones(data)
        setSelectedIds([])
        setError('')
      } else {
        setPhones([])
        setError(data.error || 'No se pudieron cargar los números')
      }
    } catch (err) {
      setError('Error al cargar números permitidos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeduplicate = async () => {
    if (!confirm('Esto eliminará números duplicados y conservará el más reciente por número. ¿Continuar?')) return

    setCleanupLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/allowed-phones/cleanup', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        setSuccess(`Duplicados eliminados: ${data.removed}`)
        fetchPhones()
      } else {
        setError(data.error || 'Error al eliminar duplicados')
      }
    } catch (err) {
      setError('Error de conexión al eliminar duplicados')
    } finally {
      setCleanupLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === phones.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(phones.map(p => p.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`¿Eliminar ${selectedIds.length} número(s) seleccionado(s)?`)) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/allowed-phones/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Se eliminaron ${data.deleted} número(s)`) 
        setSelectedIds([])
        fetchPhones()
      } else {
        setError(data.error || 'Error al eliminar números')
      }
    } catch (err) {
      setError('Error de conexión al eliminar')
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/allowed-phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone, groupName: newGroup || null })
      })

      if (response.ok) {
        setSuccess('Número añadido correctamente')
        setNewPhone('')
        setNewGroup('')
        fetchPhones()
      } else {
        const data = await response.json()
        setError(data.error || 'Error al añadir número')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este número permitido?')) return

    try {
      const response = await fetch(`/api/admin/allowed-phones?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('Número eliminado')
        setSelectedIds(prev => prev.filter(item => item !== id))
        fetchPhones()
      } else {
        setError('Error al eliminar')
      }
    } catch (err) {
      setError('Error de conexión')
    }
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBulkLoading(true)

    try {
      const numberList = bulkNumbers
        .split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0)

      if (numberList.length === 0) {
        setError('Por favor ingresa al menos un número')
        setBulkLoading(false)
        return
      }

      const response = await fetch('/api/admin/allowed-phones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          numbers: numberList, 
          groupName: bulkGroup || null 
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`✅ ${data.added} números añadidos, ${data.duplicates} duplicados`)
        setBulkNumbers('')
        setBulkGroup('')
        fetchPhones()
      } else {
        setError(data.error || 'Error al importar números')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setBulkLoading(false)
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">📱 Números de Teléfono Permitidos</h1>
          <p className="text-gray-600 mb-4">
            Solo los números en esta lista podrán registrarse en la plataforma
          </p>

          {/* Información sobre numeración española */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información Importante</h3>
            <p className="text-sm text-blue-800">
              <strong>Numeración española válida:</strong> Los números móviles en España aceptan múltiples formatos:
            </p>
            <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc">
              <li><code className="bg-white px-1 rounded">+346XXXXXXXX</code> - Rango tradicional</li>
              <li><code className="bg-white px-1 rounded">+347XXXXXXXX</code> - Nuevo rango ampliado</li>
              <li>Otros rangos españoles válidos (+348, +349, etc.)</li>
            </ul>
            <p className="text-sm text-blue-800 mt-2">
              ⚠️ <strong>Importante:</strong> Debes añadir CADA número exacto que quieras autorizar. Los números +346 y +347 son diferentes.
            </p>
          </div>

          {/* Contador de números permitidos */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">Total de Números Permitidos</h3>
                <p className="text-sm text-green-700">Números autorizados para registro</p>
              </div>
              <div className="text-4xl font-bold text-green-600">{phones.length}</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleAdd} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              ➕ Añadir Nuevo Número
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Formatos válidos: <code className="bg-white px-1 rounded">+34600123456</code>, 
              <code className="bg-white px-1 ml-1 rounded">+34 600 123 456</code>, 
              <code className="bg-white px-1 ml-1 rounded">+34-600-123-456</code>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="tel"
                placeholder="+34 600 000 000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Grupo WhatsApp (opcional)"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Añadir
              </button>
            </div>
          </form>

          <form onSubmit={handleBulkImport} className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h3 className="font-semibold mb-3 text-green-900">📋 Carga Masiva de Números</h3>
            <p className="text-sm text-gray-700 mb-3">Pega múltiples números (uno por línea)</p>
            <textarea
              placeholder="34600000001&#10;34600000002&#10;34600000003&#10;+34 600 000 004&#10;+34-600-000-005"
              value={bulkNumbers}
              onChange={(e) => setBulkNumbers(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg font-mono text-sm mb-3"
              rows={6}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Grupo para todos estos números (opcional)"
                value={bulkGroup}
                onChange={(e) => setBulkGroup(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <button
                type="submit"
                disabled={bulkLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {bulkLoading ? 'Importando...' : 'Importar Números'}
              </button>
            </div>
          </form>

          {phones.length > 0 && (
            <div className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 mb-3">
              <div className="text-sm text-gray-700">
                Seleccionados: <span className="font-semibold">{selectedIds.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeduplicate}
                  disabled={cleanupLoading}
                  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:bg-gray-200"
                >
                  {cleanupLoading ? 'Eliminando duplicados...' : 'Eliminar duplicados históricos'}
                </button>
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  {selectedIds.length === phones.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm"
                >
                  Eliminar seleccionados
                </button>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3">
              <h3 className="text-white font-semibold">📋 Listado de Números Permitidos ({phones.length})</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">
                    <input
                      type="checkbox"
                      checked={phones.length > 0 && selectedIds.length === phones.length}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Número de Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {phones.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl">📵</div>
                        <p>No hay números permitidos todavía</p>
                        <p className="text-sm">Añade números usando el formulario de arriba</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  phones.map((phone) => (
                    <tr key={phone.id} className="border-t hover:bg-blue-50 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(phone.id)}
                          onChange={() => toggleSelect(phone.id)}
                          aria-label={`Seleccionar ${phone.phoneNumber}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono font-semibold">{phone.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {phone.groupName ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {phone.groupName}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(phone.addedAt).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(phone.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition font-semibold text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <strong>💡 Consejo:</strong> También puedes cargar números masivamente usando el archivo{' '}
              <code className="bg-white px-2 py-1 rounded">allowed-phones.txt</code> y ejecutando{' '}
              <code className="bg-white px-2 py-1 rounded">npx tsx scripts/load-allowed-phones.ts</code>
            </p>
            <p className="text-sm text-gray-700">
              <strong>🔄 Duplicar números +346 → +347:</strong> Si quieres crear versiones +347 de tus números +346 (sin eliminar los originales), ejecuta:{' '}
              <code className="bg-white px-2 py-1 rounded">npx tsx scripts/migrate-phone-numbers.ts</code>
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Volver al Panel de Administración
          </button>
        </div>
      </div>
    </div>
  )
}
