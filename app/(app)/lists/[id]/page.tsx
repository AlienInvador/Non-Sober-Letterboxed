import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getList } from '@/lib/queries/lists'
import { EditListForm, ListItems } from '@/components/list-view'

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const list = await getList(id)
  if (!list) notFound()
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="font-display text-4xl">{list.title}</h1>
      {list.description && <p className="mt-2 text-muted">{list.description}</p>}
      <p className="mt-2 text-sm text-muted">
        {list.crew ? <Link href={`/crews/${list.crew.id}`}>{list.crew.name} crew</Link> : list.owner && <Link href={`/u/${list.owner.username}`}>@{list.owner.username}</Link>}
        {' · '}{list.visibility}
      </p>
      {list.canWrite && <EditListForm list={list} />}
      <ListItems listId={list.id} initial={list.items} canWrite={list.canWrite} />
    </main>
  )
}
