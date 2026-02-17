import { redirect } from 'next/navigation'

// Redirect permanente del lado del servidor para SEO
export default function Home() {
  redirect('/landing')
}
