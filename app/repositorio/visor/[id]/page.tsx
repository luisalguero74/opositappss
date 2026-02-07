import RepositorioVisorClient from './visor-client'

export default async function RepositorioVisorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <RepositorioVisorClient id={id} />
}
