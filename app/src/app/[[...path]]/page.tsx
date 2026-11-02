// src/app/[[...path]]/page.tsx — every OS page is served here: the route is matched against os.yaml's pages (routes are
// data), the person is required and authorised on the SERVER (standards §19.3 — the sidebar hiding a page is not the
// guard), the rows the page reads are loaded through the DAL under that person's scope, and the kernel renders them.
import { notFound, redirect } from 'next/navigation';
import { currentUser, type SessionUser } from '@/lib/auth';
import { loadEntities, type Actor } from '@/lib/dal';
import { wiring } from '@/lib/flows';
import { matchRoute, entitiesOf, permitted } from '@/lib/routes';
import { PAGES } from '@/config/pages';
import { ROLE_HOME } from '@/config/roles';
import { HEADER } from '@/config/os.config';
import AppShell from '@/components/AppShell';
import PublicShell from '@/components/PublicShell';

export const dynamic = 'force-dynamic';

/** v5.1 (G6): the pages the person's role ticks (view or edit), re-read on every request (lib/roles.ts), never the static map. */
const opens = (user: SessionUser, pageId: string) => permitted(user.pages, pageId);
/** Where a person lands: their role's home (a custom role: its base role's), when they may open it; else the first page they may. */
function homeOf(user: SessionUser): string {
  const H = ROLE_HOME as unknown as Record<string, string>;
  for (const c of [H[user.role], H[user.base]]) { const m = c ? matchRoute(c) : null; if (m && !m.page.public && opens(user, m.page.id)) return c; }
  const first = (PAGES as any[]).find((p) => !p.public && opens(user, p.id) && !String(p.route).includes(':'));
  return first ? first.route : '/';
}

export default async function OsPage({ params }: { params: Promise<{ path?: string[] }> }) {
  // Next hands each segment decoded; an id with a slash in it (DSC/QUO/006/2026-27) must stay ONE segment for the route pattern,
  // so each is re-encoded here and matchRoute decodes the named params back.
  const path = '/' + ((await params).path ?? []).map((seg) => encodeURIComponent(seg)).join('/');
  const hit = matchRoute(path);
  // v4.9 (C4): an address that is not one of os.yaml's routes is a 404 for everybody, signed in or not — never a blank page or a bounce to /login
  if (!hit && path !== '/') notFound();
  if (hit?.page.public) {
    const actor: Actor = { kind: 'public', page: hit.page.id };
    const data = await loadEntities(actor, entitiesOf(hit.page));
    return <PublicShell config={hit.page} data={data} params={hit.params} />;
  }
  const user = await currentUser({ setup: true });
  if (!user) redirect(`/login${path !== '/' ? `?next=${encodeURIComponent(path)}` : ''}`);
  if (user.mustChangeEmail) redirect('/login');               // G8: the temporary administrator sets up the account first (the login page shows it)
  if (!hit) { const home = homeOf(user); if (home !== path) redirect(home); notFound(); }   // only '/' reaches here (any other unknown path was a 404 above)
  if (!opens(user, hit.page.id)) { const home = homeOf(user); if (home !== path) redirect(home); notFound(); }
  const actor: Actor = { kind: 'user', user };
  // the page's own entities, plus what the shell shows on every page: nav badges, header search and notifications
  const wanted = [...entitiesOf(hit.page), ...PAGES.filter((p: any) => p.badge && typeof p.badge === 'object').map((p: any) => p.badge.entity),
                  ...((HEADER as any).search ?? []).map((h: any) => h.entity), ...((HEADER as any).notifications ?? []).map((h: any) => h.entity)];
  const data = await loadEntities(actor, wanted);
  return <AppShell config={hit.page} kind={hit.kind} data={data} params={hit.params} wiring={wiring()} />;
}
