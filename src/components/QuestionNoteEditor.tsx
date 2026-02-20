'use client'

import { useState, useEffect } from 'react'

interface QuestionNoteEditorProps {
  questionId: string
}

export default function QuestionNoteEditor({ questionId }: QuestionNoteEditorProps) {
  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showNoteSaved, setShowNoteSaved] = useState(false)

  useEffect(() => {
    // Load existing note
    fetch(`/api/questions/${questionId}/note`)
      .then(res => res.json())
      .then(data => {
        if (data.note) {
          setNote(data.note.content)
          setSavedNote(data.note.content)
        }
      })
      .catch(() => {})
  }, [questionId])

  const handleSave = async () => {
    if (note.trim().length === 0) {
      // Delete note if empty
      if (savedNote) {
        setIsSaving(true)
        try {
          await fetch(`/api/questions/${questionId}/note`, {
            method: 'DELETE'
          })
          setSavedNote('')
          setIsEditing(false)
          setShowNoteSaved(true)
          setTimeout(() => setShowNoteSaved(false), 2000)
        } catch (error) {
          console.error('Error deleting note:', error)
        } finally {
          setIsSaving(false)
        }
      } else {
        setIsEditing(false)
      }
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/questions/${questionId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note })
      })
      
      if (response.ok) {
        setSavedNote(note)
        setIsEditing(false)
        setShowNoteSaved(true)
        setTimeout(() => setShowNoteSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNote(savedNote)
    setIsEditing(false)
  }

  if (!isEditing && !savedNote) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        <span>📝</span> Añadir nota personal
      </button>
    )
  }

  if (!isEditing) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <span className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">Mi Nota:</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Editar
          </button>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{savedNote}</p>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📝</span>
        <span className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">Nota Personal:</span>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Escribe aquí tu nota personal sobre esta pregunta..."
        className="w-full p-2 border border-yellow-300 dark:border-yellow-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white resize-y min-h-[80px]"
        autoFocus
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-600"
        >
          Cancelar
        </button>
        {showNoteSaved && (
          <span className="text-xs text-green-600 dark:text-green-400">✓ Guardada</span>
        )}
      </div>
    </div>
  )
}
