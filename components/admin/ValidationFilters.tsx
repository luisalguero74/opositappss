// ==========================================
// SISTEMA DE FILTROS PARA VALIDACIÓN IA
// ==========================================
// Agregar al estado en QuestionsManagerPage:

// Filtros de validación IA (AGREGAR DESPUÉS DE filterStatus)
const [filterAIValidation, setFilterAIValidation] = useState<'all' | 'validated' | 'review' | 'quarantined' | 'improved' | 'not-reviewed'>('all')

// ==========================================
// FUNCIÓN DE FILTRADO (REEMPLAZAR filteredQuestions)
// ==========================================

const filteredQuestions = questions.filter(q => {
  // Filtro por temario
  if (filterTemario === 'general' && q.temaParte !== 'general') return false
  if (filterTemario === 'especifico' && q.temaParte !== 'especifico') return false
  
  // Filtro por tema específico
  if (filterTema.length > 0 && q.temaCodigo && !filterTema.includes(q.temaCodigo)) return false
  
  // Filtro por dificultad
  if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
  
  // Filtro por estado de revisión
  if (filterStatus !== 'all' && q.reviewStatus !== filterStatus) return false
  
  // 🆕 FILTRO POR VALIDACIÓN IA
  if (filterAIValidation !== 'all') {
    if (filterAIValidation === 'validated' && q.reviewStatus !== 'VALIDATED') return false
    if (filterAIValidation === 'review' && (q.reviewStatus !== 'PENDING' || !q.aiReviewed)) return false
    if (filterAIValidation === 'quarantined' && q.reviewStatus !== 'QUARANTINED') return false
    if (filterAIValidation === 'improved' && !q.aiReviewed) return false
    if (filterAIValidation === 'not-reviewed' && q.aiReviewed) return false
  }
  
  // Filtro por búsqueda de texto
  if (searchText && !q.text.toLowerCase().includes(searchText.toLowerCase())) return false
  
  return true
})

// ==========================================
// COMPONENTE UI DE FILTROS (INSERTAR EN EL JSX)
// ==========================================

{/* Filtros de Validación IA */}
<div className="bg-white rounded-lg shadow-md p-6 mb-6">
  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
    Filtros de Validación IA
  </h3>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Filtro Estado Validación */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Estado de Validación
      </label>
      <select
        value={filterAIValidation}
        onChange={(e) => setFilterAIValidation(e.target.value as any)}
        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="all">Todas</option>
        <option value="validated">✅ Validadas (≥90)</option>
        <option value="review">⚠️ Necesitan Revisión (75-89)</option>
        <option value="quarantined">🚫 Cuarentena (&lt;75)</option>
        <option value="improved">🔧 Mejoradas por IA</option>
        <option value="not-reviewed">⏳ Sin revisar por IA</option>
      </select>
    </div>

    {/* Contador de Resultados */}
    <div className="flex items-end">
      <div className="bg-blue-50 rounded-lg p-4 w-full">
        <div className="text-sm text-gray-600">Resultados</div>
        <div className="text-2xl font-bold text-blue-600">
          {filteredQuestions.length}
        </div>
        <div className="text-xs text-gray-500">
          de {questions.length} total
        </div>
      </div>
    </div>

    {/* Estadísticas Rápidas */}
    <div className="flex items-end">
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 w-full">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-gray-600">Validadas</div>
            <div className="font-bold text-green-600">
              {questions.filter(q => q.reviewStatus === 'VALIDATED').length}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Revisar</div>
            <div className="font-bold text-yellow-600">
              {questions.filter(q => q.reviewStatus === 'PENDING' && q.aiReviewed).length}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Cuarentena</div>
            <div className="font-bold text-red-600">
              {questions.filter(q => q.reviewStatus === 'QUARANTINED').length}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Mejoradas</div>
            <div className="font-bold text-blue-600">
              {questions.filter(q => q.aiReviewed).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Botón Limpiar Filtros */}
  {filterAIValidation !== 'all' && (
    <div className="mt-4">
      <button
        onClick={() => setFilterAIValidation('all')}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Limpiar filtros de validación
      </button>
    </div>
  )}
</div>

// ==========================================
// INDICADORES VISUALES EN TABLA
// ==========================================

{/* Badge de Estado IA (agregar en cada fila de la tabla) */}
<div className="flex flex-wrap gap-1">
  {/* Estado de Validación */}
  {question.reviewStatus === 'VALIDATED' && (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      ✅ Validada
    </span>
  )}
  {question.reviewStatus === 'PENDING' && question.aiReviewed && (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      ⚠️ Revisar
    </span>
  )}
  {question.reviewStatus === 'QUARANTINED' && (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      🚫 Cuarentena
    </span>
  )}
  
  {/* Mejorada por IA */}
  {question.aiReviewed && (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      🔧 IA
    </span>
  )}
</div>

// ==========================================
// EXPORTACIÓN DE DATOS FILTRADOS
// ==========================================

const exportFilteredQuestions = () => {
  const dataStr = JSON.stringify(filteredQuestions, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `preguntas-${filterAIValidation}-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

{/* Botón Exportar (agregar en la UI) */}
<button
  onClick={exportFilteredQuestions}
  disabled={filteredQuestions.length === 0}
  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  📥 Exportar Filtradas ({filteredQuestions.length})
</button>

// ==========================================
// VISTA DETALLADA DE VALIDACIÓN IA
// ==========================================

{/* Modal/Expandible con detalles de validación */}
{selectedQuestion && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">Detalles de Validación IA</h3>
        <button
          onClick={() => setSelectedQuestion(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* Pregunta */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700">Pregunta:</h4>
        <p className="text-gray-900">{selectedQuestion.text}</p>
      </div>
      
      {/* Estado de Validación */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Estado</div>
          <div className="text-lg font-bold">
            {selectedQuestion.reviewStatus === 'VALIDATED' && '✅ Validada'}
            {selectedQuestion.reviewStatus === 'PENDING' && '⚠️ Revisar'}
            {selectedQuestion.reviewStatus === 'QUARANTINED' && '🚫 Cuarentena'}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Revisada por IA</div>
          <div className="text-lg font-bold">
            {selectedQuestion.aiReviewed ? '✅ Sí' : '❌ No'}
          </div>
        </div>
      </div>
      
      {/* Explicación */}
      {selectedQuestion.explanation && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Explicación:</h4>
          <p className="text-gray-700 whitespace-pre-wrap">
            {selectedQuestion.explanation}
          </p>
        </div>
      )}
    </div>
  </div>
)}
