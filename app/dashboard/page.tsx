// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const PHASE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Brouillon',      color: '#64748B', bg: '#F1F5F9' },
  1: { label: 'Disponibilités', color: '#0369A1', bg: '#E0F2FE' },
  2: { label: 'Disponibilités', color: '#0369A1', bg: '#E0F2FE' },
  3: { label: 'Activités',      color: '#7C3AED', bg: '#EDE9FE' },
  4: { label: 'Scénarios',      color: '#0F766E', bg: '#CCFBF1' },
  5: { label: 'Filtre',         color: '#B45309', bg: '#FEF3C7' },
  6: { label: 'Vote',           color: '#DC2626', bg: '#FEE2E2' },
  7: { label: 'Terminé ✓',      color: '#166534', bg: '#DCFCE7' },
}

export default async function DashboardPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Vérification session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Profil utilisateur
  const { data: profile } = await adminSupabase
    .from('users')
    .select('display_name, onboarding_done')
    .eq('id', user.id)
    .single()

  // Groupes dont je suis owner — via admin client (bypass RLS)
  const { data: ownedGroups } = await adminSupabase
    .from('groups')
    .select('id, name, description, created_at, group_members(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Groupes dont je suis membre actif OU invité (pas owner)
  const { data: memberGroups } = await adminSupabase
    .from('group_members')
    .select('group_id, status, groups(id, name, description, owner_id, group_members(count))')
    .eq('user_id', user.id)
    .in('status', ['active', 'invited'])

  // IDs de tous mes groupes pour récupérer les événements
  const allGroupIds = [
    ...(ownedGroups?.map(g => g.id) ?? []),
    ...(memberGroups?.map((m: { group_id: string }) => m.group_id) ?? []),
  ]

  // Événements récents — via admin client
  // On ne filtre plus par opérateur tableau Postgres côté requête (.overlaps/.contains
  // supposent un vrai type tableau natif, qui pourrait ne pas correspondre au type réel
  // de la colonne) — on récupère une fenêtre récente et on filtre nous-mêmes en JS,
  // ce qui fonctionne quel que soit le format de stockage réel de group_ids.
  const { data: recentEvents } = await adminSupabase
    .from('events')
    .select('id, name, phase, invite_code, created_at, group_id, group_ids, extra_emails, selected_date, cancelled_at, invited_member_ids, groups(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  function toIdArray(v: unknown): string[] {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return []
  }

  const groupBasedEvents = (recentEvents ?? []).filter(e =>
    (e.group_id && allGroupIds.includes(e.group_id)) ||
    toIdArray(e.group_ids).some(gid => allGroupIds.includes(gid))
  )

  // Événements où je suis un "extra" — invité par email ou par lien de l'événement,
  // sans appartenir à aucun groupe lié. Filtré côté JS, sur la même fenêtre déjà
  // récupérée, pour la même raison que ci-dessus (indépendance du type de colonne réel).
  const extraEvents = user.email
    ? (recentEvents ?? []).filter(e => toIdArray(e.extra_emails).includes(user.email!))
    : []

  const rawEvents = [
    ...groupBasedEvents,
    ...extraEvents.filter(e => !groupBasedEvents.some(g => g.id === e.id)),
  ]

  // Retire les événements où je suis explicitement exclu — comme si je n'avais jamais
  // été invité, cohérent avec la sémantique "invitation" du groupe.
  const events = rawEvents?.filter(e =>
    !e.invited_member_ids?.length || e.invited_member_ids.includes(user.id)
  ) ?? []

  // Mes propres disponibilités, pour détecter les événements où je suis absent de la
  // date finalement retenue (non-participant, même invité au départ).
  const eventIdsWithDate = events.filter(e => e.selected_date).map(e => e.id)
  const { data: myAvailRows } = eventIdsWithDate.length > 0
    ? await adminSupabase
        .from('availabilities')
        .select('event_id, date, status')
        .eq('user_id', user.id)
        .in('event_id', eventIdsWithDate)
    : { data: [] }

  const isNonParticipant = (e: { id: string; selected_date: unknown }) => {
    const d = (e.selected_date as { date?: string } | null)?.date
    if (!d) return false
    const myRow = myAvailRows?.find(r => r.event_id === e.id && r.date === d)
    return !myRow || myRow.status === 'no'
  }

  // Invitations en attente = groupes avec status 'invited' non encore répondus
  const invitedGroupIds = memberGroups
    ?.filter((m: { status: string }) => m.status === 'invited')
    .map((m: { group_id: string }) => m.group_id) ?? []

  // Événements liés aux groupes où je suis invité ET où je n'ai pas encore répondu
  const pendingEvents = events?.filter(e =>
    invitedGroupIds.includes(e.group_id)
  ) ?? []

  const displayName    = profile?.display_name ?? user.email?.split('@')[0] ?? 'vous'

  const isPastDate = (e: { selected_date: unknown }) => {
    const d = (e.selected_date as { date?: string } | null)?.date
    return d ? new Date(d) < new Date() : false
  }

  // En développement : la planification est encore en cours (Dispo → Vote)
  const developingEvents = events?.filter(e =>
    e.phase > 0 && e.phase < 7 && !e.cancelled_at && !isPastDate(e) && !isNonParticipant(e) && !invitedGroupIds.includes(e.group_id)
  ) ?? []
  const draftEvents    = events?.filter(e => e.phase === 0 && !e.cancelled_at) ?? []

  // À venir : la décision est prise (Phase 7), reste juste à attendre le jour J
  const upcomingEvents = events?.filter(e =>
    e.phase === 7 && !e.cancelled_at && !isPastDate(e) && !isNonParticipant(e)
  ) ?? []

  // Historique = annulés, date révolue, ou non-participant (absent de la date retenue) —
  // archivage automatique, un événement où je ne suis plus concerné n'a plus lieu d'être ailleurs.
  const historyEvents = events?.filter(e =>
    e.cancelled_at || (e.phase > 0 && isPastDate(e)) || (e.phase > 0 && isNonParticipant(e))
  ) ?? []

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
	    <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={32} height={32}/>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#4C1D95', letterSpacing: '-0.02em' }}>
            IRIS
          </span>

        </div>
	    </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>{user.email}</span>
          <Link href="/profile" style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid #E2E8F0', background: 'white',
            color: '#4C1D95', fontSize: 13, fontWeight: 500,
            textDecoration: 'none',
          }}>
            Mon profil
          </Link>
          <form action="/auth/signout" method="POST">
            <button type="submit" style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: 'white',
              color: '#64748B',
              fontSize: 13,
              cursor: 'pointer',
            }}>
              Déconnexion
            </button>
          </form>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* En-tête */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1E293B',
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
            }}>
              Bonjour, {displayName} 👋
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              {developingEvents.length > 0
                ? `${developingEvents.length} événement${developingEvents.length > 1 ? 's' : ''} en cours`
                : 'Aucun événement en cours'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/group/new" style={{
              padding: '9px 18px',
              borderRadius: 10,
              border: '1.5px solid #DDD6FE',
              color: '#4C1D95',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              background: 'white',
            }}>
              + Nouveau groupe
            </Link>
            <Link href="/event/new" style={{
              padding: '9px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 2px 12px rgba(76,29,149,0.2)',
            }}>
              + Créer un événement
            </Link>
          </div>
        </div>

        {/* Bandeau profil non complété */}
        {!profile?.onboarding_done && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px', borderRadius: 12, marginBottom: 20,
            background: 'linear-gradient(135deg, #EDE9FE, #E0F2FE)',
            border: '1px solid #DDD6FE',
          }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4C1D95', marginBottom: 2 }}>
                Complétez votre profil de préférences
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                IRIS calcule de meilleurs scénarios quand vos préférences sont renseignées.
                Ça prend 2 minutes.
              </div>
            </div>
            <Link href="/profile" style={{
              padding: '8px 16px', borderRadius: 9,
              background: '#4C1D95', color: 'white',
              fontWeight: 600, fontSize: 12, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              Compléter mon profil →
            </Link>
          </div>
        )}

        {/* Invitations en attente */}
        {pendingEvents.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              ✉️ Invitations en attente ({pendingEvents.length})
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {pendingEvents.map(event => (
                <Link key={event.id} href={`/event/${event.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', borderRadius: 12,
                  background: 'white', border: '2px solid #DDD6FE',
                  textDecoration: 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#4C1D95' }}>
                      {event.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                      {(event.groups as unknown as { name: string } | null)?.name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, background: '#EDE9FE', color: '#7C3AED',
                    padding: '3px 10px', borderRadius: 8, fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    Voir l'invitation →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Événements en développement */}
        {developingEvents.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              En développement
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {developingEvents.map(event => {
                const phase = PHASE_LABELS[event.phase] ?? PHASE_LABELS[0]
                return (
                  <Link key={event.id} href={`/event/${event.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', borderRadius: 14,
                    background: 'white', border: '1px solid #E2E8F0', textDecoration: 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 3 }}>
                        {event.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        {(event.groups as unknown as { name: string } | null)?.name ?? '—'}
                        {event.invite_code && (
                          <span style={{
                            marginLeft: 8, fontFamily: 'monospace',
                            background: '#F1F5F9', padding: '1px 6px',
                            borderRadius: 4, fontSize: 11,
                          }}>
                            {event.invite_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 20, background: phase.bg, color: phase.color,
                      whiteSpace: 'nowrap',
                    }}>
                      {phase.label}
                    </span>
                    <span style={{ fontSize: 18, color: '#CBD5E1' }}>›</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Événements à venir — décidés, en attente du jour J */}
        {upcomingEvents.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              À venir
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingEvents.map(event => {
                const dateInfo = event.selected_date as { date: string; label?: string } | null
                const dateLabel = dateInfo?.label ?? (dateInfo?.date
                  ? new Date(dateInfo.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                  : null)
                return (
                  <Link key={event.id} href={`/event/${event.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', borderRadius: 14,
                    background: 'white', border: '1px solid #BBF7D0', textDecoration: 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 3 }}>
                        {event.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        {(event.groups as unknown as { name: string } | null)?.name ?? '—'}
                        {dateLabel && <span style={{ marginLeft: 8 }}>📅 {dateLabel}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px',
                      borderRadius: 20, background: '#DCFCE7', color: '#166534',
                      whiteSpace: 'nowrap',
                    }}>
                      ✓ Décidé
                    </span>
                    <span style={{ fontSize: 18, color: '#CBD5E1' }}>›</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Groupes */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: '#64748B',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
          }}>
            Mes groupes
          </h2>

          {(!ownedGroups?.length && !memberGroups?.length) ? (
            <div style={{
              padding: '32px 24px', borderRadius: 14,
              background: 'white', border: '2px dashed #E2E8F0', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
                Vous n'avez pas encore de groupe.
              </p>
              <Link href="/group/new" style={{
                padding: '8px 20px', borderRadius: 10,
                background: '#4C1D95', color: 'white',
                fontWeight: 600, fontSize: 13, textDecoration: 'none',
              }}>
                Créer mon premier groupe
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {ownedGroups?.map(group => (
                <Link key={group.id} href={`/group/${group.id}`} style={{
                  padding: '18px 20px', borderRadius: 14,
                  background: 'white', border: '1px solid #E2E8F0',
                  textDecoration: 'none', display: 'block',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                      {group.name}
                    </span>
                    <span style={{
                      fontSize: 10, background: '#EDE9FE', color: '#7C3AED',
                      padding: '2px 7px', borderRadius: 8, fontWeight: 500,
                    }}>
                      Admin
                    </span>
                  </div>
                  {group.description && (
                    <p style={{
                      fontSize: 12, color: '#94A3B8', margin: '0 0 8px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {group.description}
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {(group.group_members as { count: number }[])?.[0]?.count ?? 0} membre(s)
                  </div>
                </Link>
              ))}

              {(memberGroups as unknown as { group_id: string; status: string; groups: { id: string; name: string; description: string | null; owner_id: string; group_members: { count: number }[] } | null }[] | null)?.map((m) => {
                const group = m.groups
                if (!group) return null
                if (ownedGroups?.some(o => o.id === group.id)) return null 
                return (
                  <Link key={group.id} href={`/group/${group.id}`} style={{
                    padding: '18px 20px', borderRadius: 14,
                    background: 'white', border: '1px solid #E2E8F0',
                    textDecoration: 'none', display: 'block',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                        {group.name}
                      </span>
                      <span style={{
                        fontSize: 10, background: '#F0FDF4', color: '#166534',
                        padding: '2px 7px', borderRadius: 8, fontWeight: 500,
                      }}>
                        Membre
                      </span>
                    </div>
                    {group.description && (
                      <p style={{
                        fontSize: 12, color: '#94A3B8', margin: '0 0 8px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {group.description}
                      </p>
                    )}
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      {group.group_members?.[0]?.count ?? 0} membre(s)
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Brouillons */}
        {draftEvents.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              Brouillons ({draftEvents.length})
            </h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {draftEvents.map(event => (
                <Link key={event.id} href={`/event/${event.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px', borderRadius: 12,
                  background: 'white', border: '1px dashed #E2E8F0',
                  textDecoration: 'none', opacity: 0.8,
                }}>
                  <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{event.name}</span>
                  <span style={{
                    fontSize: 11, color: '#94A3B8',
                    background: '#F1F5F9', padding: '2px 8px', borderRadius: 6,
                  }}>
                    Brouillon
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Historique — replié par défaut pour ne pas encombrer la page */}
        {historyEvents.length > 0 && (
          <details>
            <summary style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
              cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 10 }}>▶</span>
              Historique ({historyEvents.length})
            </summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {historyEvents.map(event => {
                const dateInfo = event.selected_date as { date: string; label?: string } | null
                const dateLabel = dateInfo?.label ?? (dateInfo?.date
                  ? new Date(dateInfo.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                  : null)
                const badge = event.cancelled_at
                  ? { label: 'Annulé 🚫', color: '#991B1B', bg: '#FEE2E2' }
                  : isNonParticipant(event)
                  ? { label: 'Non disponible 📅❌', color: '#92400E', bg: '#FEF3C7' }
                  : event.phase === 7
                  ? { label: 'Terminé ✓', color: '#166534', bg: '#DCFCE7' }
                  : { label: 'Date passée ⏳', color: '#92400E', bg: '#FEF3C7' }
                return (
                  <Link key={event.id} href={`/event/${event.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px', borderRadius: 12,
                    background: 'white', border: '1px solid #E2E8F0',
                    textDecoration: 'none', opacity: 0.7,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#475569' }}>{event.name}</div>
                      {dateLabel && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>📅 {dateLabel}</div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, color: badge.color, background: badge.bg,
                      padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                    }}>
                      {badge.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </details>
        )}

        {/* État vide total */}
        {!events?.length && !ownedGroups?.length && !memberGroups?.length && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            borderRadius: 16, background: 'white',
            border: '1px solid #E2E8F0', marginTop: 8,
          }}>
            <Image
              src="/iris-logo_transparent.png" alt="IRIS"
              width={56} height={56}
              style={{ marginBottom: 16, opacity: 0.6 }}
            />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
              Bienvenue sur IRIS !
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
              Commencez par créer un groupe, puis planifiez votre première sortie.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/group/new" style={{
                padding: '10px 22px', borderRadius: 10,
                border: '1.5px solid #DDD6FE', color: '#4C1D95',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>
                Créer un groupe
              </Link>
              <Link href="/event/new" style={{
                padding: '10px 22px', borderRadius: 10,
                background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
                color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                Créer un événement
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
