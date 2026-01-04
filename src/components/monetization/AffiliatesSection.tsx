'use client'

interface AffiliateLink {
  title: string
  description: string
  url: string
  image?: string
  price?: string
}

const recommendedBooks: AffiliateLink[] = [
  {
    title: 'Temario Completo Seguridad Social 2025',
    description: 'Todo el temario oficial actualizado para la convocatoria 2025',
    url: '#', // Se reemplazará con el link de afiliado
    price: '€45.00'
  },
  {
    title: 'Supuestos Prácticos Resueltos',
    description: '100 casos prácticos comentados y resueltos paso a paso',
    url: '#',
    price: '€32.50'
  },
  {
    title: 'Test de Autoevaluación',
    description: '2000 preguntas tipo test con respuestas razonadas',
    url: '#',
    price: '€28.00'
  }
]

interface AffiliatesSectionProps {
  amazonId: string
}

export default function AffiliatesSection({ amazonId }: AffiliatesSectionProps) {
  if (!amazonId) return null

  const createAmazonLink = (baseUrl: string) => {
    return `${baseUrl}?tag=${amazonId}`
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 my-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📚</span>
        <h3 className="text-xl font-bold text-gray-800">Recursos Recomendados</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">
        Estos libros y recursos te ayudarán a complementar tu preparación
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendedBooks.map((book, index) => (
          <a
            key={index}
            href={createAmazonLink(book.url)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="bg-white rounded-lg p-4 hover:shadow-lg transition-all border border-orange-200 hover:border-orange-400"
          >
            <div className="h-32 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-4xl">📖</span>
            </div>
            <h4 className="font-semibold text-gray-800 mb-2 text-sm">{book.title}</h4>
            <p className="text-gray-600 text-xs mb-3">{book.description}</p>
            {book.price && (
              <div className="flex items-center justify-between">
                <span className="text-orange-600 font-bold">{book.price}</span>
                <span className="text-xs text-gray-500">Ver en Amazon →</span>
              </div>
            )}
          </a>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-4 text-center">
        Enlaces de afiliado Amazon. Comprando a través de estos links apoyas el desarrollo de la plataforma sin coste adicional para ti.
      </p>
    </div>
  )
}
