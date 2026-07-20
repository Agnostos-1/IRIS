// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import InviteMemberForm from '@/components/InviteMemberForm'
import CopyInviteLink from '@/components/CopyInviteLink'
import { computeFairnessBreakdown } from '@/lib/iris/pareto-engine'

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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Actif',   color: '#166534', bg: '#DCFCE7' },
  invited:  { label: 'Invité',  color: '#713F12', bg: '#FEF9C3' },
  rejected: { label: 'Refusé', color: '#991B1B', bg: '#FEE2E2' },
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Vérification session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Récupère le groupe
  const { data: group } = await adminSupabase
    .from('groups')
    .select('id, name, description, owner_id, created_at, vote_history, invite_code')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Vérifie que l'utilisateur est membre ou owner
  const isOwner = group.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await adminSupabase
      .from('group_members')
      .select('status')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single()
    if (!membership) notFound()
  }

  // Membres du groupe avec leur profil
  const { data: members } = await adminSupabase
    .from('group_members')
    .select('id, status, joined_at, invited_at, users(id, display_name, email, zone, transport)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  // Événements du groupe — on ne filtre plus par opérateur tableau Postgres (.contains,
  // qui suppose un vrai type tableau natif) mais en JS après récupération, pour rester
  // robuste au format de stockage réel de group_ids.
  const { data: recentEventsForGroup } = await adminSupabase
    .from('events')
    .select('id, name, phase, invite_code, created_at, proposed_dates, selected_date, cancelled_at, invited_member_ids, group_id, group_ids')
    .order('created_at', { ascending: false })
    .limit(200)

  function toIdArray(v: unknown): string[] {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
    return []
  }

  const rawEvents = (recentEventsForGroup ?? []).filter(e =>
    e.group_id === id || toIdArray(e.group_ids).includes(id)
  )

  // Retire les événements où je suis explicitement exclu — comme si je n'avais jamais
  // été invité, cohérent avec la sémantique "invitation" du groupe.
  const events = rawEvents?.filter(e =>
    !e.invited_member_ids?.length || e.invited_member_ids.includes(user.id)
  ) ?? []

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

  const isPastDate = (e: { selected_date: unknown }) => {
    const d = (e.selected_date as { date?: string } | null)?.date
    return d ? new Date(d) < new Date() : false
  }

  const developingEvents = events?.filter(e => e.phase > 0 && e.phase < 7 && !e.cancelled_at && !isPastDate(e) && !isNonParticipant(e)) ?? []
  const draftEvents      = events?.filter(e => e.phase === 0 && !e.cancelled_at) ?? []
  const upcomingEvents   = events?.filter(e => e.phase === 7 && !e.cancelled_at && !isPastDate(e) && !isNonParticipant(e)) ?? []
  const historyEvents    = events?.filter(e => e.cancelled_at || (e.phase > 0 && isPastDate(e)) || (e.phase > 0 && isNonParticipant(e))) ?? []

  // Coefficient d'équité de la personne DANS ce groupe (composante locale, pas l'effectif hybride)
  const fairness = await computeFairnessBreakdown(adminSupabase, user.id, id)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px', background: 'white',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
        }}>
          <Image src="/iris-logo_transparent.png" alt="IRIS" width={28} height={28}/>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4C1D95' }}>IRIS</span>
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ color: '#CBD5E1' }}>›</span>
        <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 500 }}>{group.name}</span>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* En-tête groupe */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 32,
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{
                fontSize: 24, fontWeight: 800, color: '#1E293B',
                letterSpacing: '-0.02em', margin: 0,
              }}>
                {group.name}
              </h1>
              {isOwner && (
                <span style={{
                  fontSize: 10, background: '#EDE9FE', color: '#7C3AED',
                  padding: '2px 8px', borderRadius: 8, fontWeight: 600,
                }}>
                  Admin
                </span>
              )}
            </div>
            {group.description && (
              <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
                {group.description}
              </p>
            )}
          </div>
          <Link href={`/event/new?group=${group.id}`} style={{
            padding: '10px 20px', borderRadius: 10,
            background: 'linear-gradient(135deg, #4C1D95, #6D28D9)',
            color: 'white', fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(76,29,149,0.2)',
          }}>
            + Créer un événement
          </Link>
        </div>

        {fairness.hasHistory && fairness.riGroup !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 14, marginBottom: 20,
            background: '#F5F3FF', border: '1px solid #DDD6FE',
          }}>
            <span style={{ fontSize: 22 }}>⚖️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>
                Votre coefficient d'équité dans ce groupe : {fairness.riGroup.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>
                {(() => {
                  const rounded = Math.round(fairness.riGroup * 100) / 100
                  return rounded > 1
                    ? 'Vous avez été un peu moins bien servi que la médiane lors des derniers événements — vous serez légèrement favorisé la prochaine fois.'
                    : rounded < 1
                    ? 'Vous avez été un peu mieux servi que la médiane lors des derniers événements — un léger rééquilibrage s\'appliquera la prochaine fois.'
                    : 'Vous êtes actuellement dans la médiane de satisfaction de ce groupe.'
                })()}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Colonne gauche — Membres */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 12,
            }}>
              <h2 style={{
                fontSize: 13, fontWeight: 600, color: '#64748B',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
              }}>
                Membres ({members?.length ?? 0})
              </h2>
            </div>

            <div style={{
              background: 'white', borderRadius: 14,
              border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 12,
            }}>
              {members?.map((m, i) => {
               const u = m.users as unknown as {
                id: string; display_name: string | null; email: string; zone: string | null; transport: string | null;
              } | null
                const st = STATUS_LABELS[m.status] ?? STATUS_LABELS.invited
                const isMe = u?.id === user.id
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    borderBottom: i < (members.length - 1) ? '1px solid #F1F5F9' : 'none',
                  }}>
                    {/* Avatar initiales */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isMe
                        ? 'linear-gradient(135deg, #4C1D95, #6D28D9)'
                        : '#EDE9FE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: isMe ? 'white' : '#7C3AED',
                      flexShrink: 0,
                    }}>
                      {(u?.display_name ?? u?.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: '#1E293B',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u?.display_name ?? u?.email?.split('@')[0] ?? '—'}
                        {isMe && (
                          <span style={{ fontSize: 10, color: '#7C3AED', marginLeft: 6 }}>
                            (vous)
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: '#94A3B8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u?.email}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 8, background: st.bg, color: st.color,
                      flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Formulaire d'invitation */}
            {isOwner && (
              <InviteMemberForm groupId={group.id}/>
            )}
			
			{isOwner && group.invite_code && (
			  <CopyInviteLink code={group.invite_code} />
			)}
			
          </div>

          {/* Colonne droite — Événements */}
          <div>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              Événements
            </h2>

            {!events?.length ? (
              <div style={{
                padding: '28px 20px', borderRadius: 14,
                background: 'white', border: '2px dashed #E2E8F0',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 14 }}>
                  Aucun événement pour ce groupe.
                </p>
                <Link href={`/event/new?group=${group.id}`} style={{
                  fontSize: 13, fontWeight: 600, color: '#4C1D95', textDecoration: 'none',
                }}>
                  Créer le premier →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {/* En développement */}
                {developingEvents.map(event => {
                  const phase = PHASE_LABELS[event.phase]
                  return (
                    <Link key={event.id} href={`/event/${event.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 16px', borderRadius: 12,
                      background: 'white', border: '1px solid #E2E8F0',
                      textDecoration: 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 2 }}>
                          {event.name}
                        </div>
                        {event.invite_code && (
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace',
                            background: '#F1F5F9', color: '#64748B',
                            padding: '1px 5px', borderRadius: 4,
                          }}>
                            {event.invite_code}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 8, background: phase.bg, color: phase.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {phase.label}
                      </span>
                    </Link>
                  )
                })}

                {/* À venir — décidés, en attente du jour J */}
                {upcomingEvents.map(event => (
                  <Link key={event.id} href={`/event/${event.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 16px', borderRadius: 12,
                    background: 'white', border: '1px solid #BBF7D0',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', flex: 1 }}>
                      {event.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 8, background: '#DCFCE7', color: '#166534',
                      whiteSpace: 'nowrap',
                    }}>
                      ✓ Décidé
                    </span>
                  </Link>
                ))}

                {/* Brouillons */}
                {draftEvents.map(event => (
                  <Link key={event.id} href={`/event/${event.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 12,
                    background: 'white', border: '1px dashed #E2E8F0',
                    textDecoration: 'none', opacity: 0.7,
                  }}>
                    <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>
                      {event.name}
                    </span>
                    <span style={{
                      fontSize: 10, color: '#94A3B8',
                      background: '#F1F5F9', padding: '2px 8px', borderRadius: 6,
                    }}>
                      Brouillon
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Historique — replié par défaut, rattaché visuellement à la section Événements */}
            {historyEvents.length > 0 && (
              <details style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <summary style={{
                  fontSize: 12, fontWeight: 600, color: '#64748B',
                  cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 9 }}>▶</span>
                  Historique ({historyEvents.length})
                </summary>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {historyEvents.map(event => {
                    const badge = event.cancelled_at
                      ? { label: 'Annulé 🚫', color: '#991B1B', bg: '#FEE2E2' }
                      : isNonParticipant(event)
                      ? { label: 'Non disponible 📅❌', color: '#92400E', bg: '#FEF3C7' }
                      : event.phase === 7
                      ? { label: 'Terminé ✓', color: '#166534', bg: '#DCFCE7' }
                      : { label: 'Date passée ⏳', color: '#92400E', bg: '#FEF3C7' }
                    return (
                      <Link key={event.id} href={`/event/${event.id}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', borderRadius: 12,
                        background: 'white', border: '1px solid #F1F5F9',
                        textDecoration: 'none', opacity: 0.6,
                      }}>
                        <span style={{ fontSize: 13, color: '#64748B', flex: 1 }}>
                          {event.name}
                        </span>
                        <span style={{
                          fontSize: 10, color: badge.color,
                          background: badge.bg, padding: '2px 8px', borderRadius: 6,
                        }}>
                          {badge.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </details>
            )}
          </div>

        </div>

        {/* Historique Rᵢ — visible si votes passés */}
        {Array.isArray(group.vote_history) && group.vote_history.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              Historique des votes ({group.vote_history.length})
            </h2>
            <div style={{
              background: 'white', borderRadius: 14,
              border: '1px solid #E2E8F0', padding: '16px 20px',
              fontSize: 12, color: '#64748B',
            }}>
              {group.vote_history.map((v: { lbl: string; date: string }, i: number) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: i < group.vote_history.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}>
                  <span>{v.lbl}</span>
                  <span style={{ color: '#94A3B8' }}>{v.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
