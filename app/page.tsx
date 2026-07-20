// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Link from 'next/link'
import JoinCodeForm from '@/components/JoinCodeForm'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import type { CSSProperties } from 'react'

export default async function HomePage() {
  // Détecte si l'utilisateur est connecté pour adapter la nav
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const eyebrowStyle: CSSProperties = {
    color: '#7C3AED',
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 16,
  }

  const h2Style: CSSProperties = {
    fontSize: 'clamp(32px, 4.2vw, 44px)',
    fontWeight: 800,
    color: '#1E293B',
    marginBottom: 20,
    letterSpacing: '-0.03em',
  }

  const leadStyle: CSSProperties = {
    maxWidth: 720,
    margin: '0 auto',
    fontSize: 17,
    lineHeight: 1.8,
    color: '#64748B',
  }

  const cardStyle: CSSProperties = {
    background: 'white',
    borderRadius: 18,
    padding: 30,
    border: '1px solid #E2E8F0',
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>

      <Navbar user={user} />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section style={{
        background: 'linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 100%)',
        padding: '80px 24px 64px',
      }}>
        <div style={{
          maxWidth: 780,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <img src="/iris-logo_transparent.png" alt="IRIS" width={96} height={96} style={{ marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />

          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 36, fontWeight: 500 }}>
            Inclusive Rational Interaction System
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 58px)',
            fontWeight: 800,
            color: '#1E293B',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 24,
          }}>
            Trouver ensemble des décisions plus{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4C1D95, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              équilibrées
            </span>
          </h1>

          <p style={{ fontSize: 19, color: '#475569', lineHeight: 1.75, marginBottom: 16, maxWidth: 640, margin: '0 auto 16px' }}>
            IRIS aide les groupes à comparer leurs préférences, explorer les compromis
            possibles et identifier les scénarios les plus satisfaisants avant de voter.
          </p>

          <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            Démonstrateur public basé sur la théorie du choix social,
            l&apos;optimisation collective et le vote Condorcet.
          </p>

          <Link href="/auth/login" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 30px',
            borderRadius: 12,
            background: '#4C1D95',
            color: 'white',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            marginBottom: 40,
          }}>
            Tester la démo
            <span>→</span>
          </Link>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            width: '100%', maxWidth: 380, margin: '0 auto 24px',
          }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>ou rejoindre avec un code</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <div style={{ width: '100%', maxWidth: 380, margin: '0 auto 56px' }}>
            <JoinCodeForm />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 1,
            width: '100%',
            maxWidth: 720,
            margin: '0 auto',
            background: '#E2E8F0',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {[
              { title: 'Préférences', text: 'Chaque participant exprime ses envies et ses contraintes.' },
              { title: 'Scénarios', text: 'Les possibilités compatibles sont générées automatiquement.' },
              { title: 'Vote', text: 'Le groupe conserve toujours la décision finale.' },
            ].map((item) => (
              <div key={item.title} style={{ background: 'white', padding: '22px 20px', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 6, fontSize: 15 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Comment fonctionne IRIS ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={eyebrowStyle}>La méthode</div>
            <h2 style={h2Style}>Comment fonctionne IRIS ?</h2>
            <p style={leadStyle}>
              IRIS structure la prise de décision collective en plusieurs étapes.
              L&apos;objectif n&apos;est pas de remplacer le choix du groupe, mais de lui
              permettre d&apos;explorer les solutions possibles avant le vote final.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 24, left: '8%', right: '8%',
              height: 2, background: '#E2E8F0',
            }} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 16,
              position: 'relative',
            }}>
              {[
                { number: '1', title: 'Création', description: 'Créer un événement et y associer un ou plusieurs groupes.' },
                { number: '2', title: 'Disponibilités', description: 'Recueillir les contraintes temporelles des participants.' },
                { number: '3', title: 'Activités', description: 'Proposer les activités, lieux ou options possibles.' },
                { number: '4', title: 'Scénarios', description: 'Construire automatiquement les combinaisons compatibles.' },
                { number: '5', title: 'Filtre', description: 'Comparer les scénarios sur plusieurs critères combinés — préférences, horaires, budget, distance et équité historique.' },
                { number: '6', title: 'Vote', description: 'Départager les scénarios retenus par vote Condorcet.' },
              ].map((step) => (
                <div key={step.number} style={{ position: 'relative', textAlign: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
                    background: '#4C1D95',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 16,
                    position: 'relative', zIndex: 2,
                  }}>
                    {step.number}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: '#64748B' }}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 72, padding: '36px 40px', borderRadius: 18,
            background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 14 }}>
              Une logique différente du vote traditionnel
            </h3>
            <p style={{ maxWidth: 780, margin: '0 auto', fontSize: 15.5, lineHeight: 1.85, color: '#475569' }}>
              Dans la plupart des situations, le vote intervient après une longue phase de
              discussion informelle. IRIS inverse cette logique : les scénarios sont d&apos;abord
              construits, analysés et comparés — avant que le groupe ne vote sur les options
              les plus pertinentes.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Signature : utilité et équité ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F5F3FF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={eyebrowStyle}>Un principe de conception</div>
            <h2 style={h2Style}>Concilier la satisfaction du groupe et l&apos;équité dans le temps</h2>
            <p style={leadStyle}>
              La théorie du choix social oppose classiquement deux logiques : maximiser la
              satisfaction globale, ou protéger les intérêts de chacun. IRIS ne tranche pas
              entre les deux — il les fait cohabiter à deux endroits précis du calcul.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Carte 1 : moyenne géométrique */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>
                Une moyenne qui protège les minorités
              </h3>
              <p style={{ fontSize: 14.5, color: '#64748B', lineHeight: 1.75, marginBottom: 24 }}>
                Le score d&apos;un scénario n&apos;est pas la moyenne simple des satisfactions
                individuelles — c&apos;est une moyenne géométrique. Un participant très mal
                servi fait chuter le score bien plus qu&apos;une moyenne classique ne le
                montrerait, même si le reste du groupe est comblé.
              </p>

              {/* Illustration : comparaison des deux moyennes sur un même jeu de scores */}
              <svg viewBox="0 0 320 160" width="100%" height="auto" role="img" aria-label="Comparaison entre moyenne arithmétique et moyenne géométrique sur quatre scores individuels, dont un très bas">
                {[
                  { label: 'A', value: 90, x: 20 },
                  { label: 'B', value: 85, x: 84 },
                  { label: 'C', value: 80, x: 148 },
                  { label: 'D', value: 20, x: 212 },
                ].map((bar) => (
                  <g key={bar.label}>
                    <rect
                      x={bar.x} y={110 - bar.value * 0.9} width={40} height={bar.value * 0.9}
                      rx={4}
                      fill={bar.value < 50 ? '#FCA5A5' : '#C4B5FD'}
                    />
                    <text x={bar.x + 20} y={126} textAnchor="middle" fontSize="11" fill="#94A3B8">{bar.label}</text>
                  </g>
                ))}
                <line x1="0" y1="110" x2="320" y2="110" stroke="#E2E8F0" strokeWidth="1" />
                <text x="0" y="150" fontSize="12" fill="#64748B">Moyenne simple : 69 %</text>
                <text x="180" y="150" fontSize="12" fontWeight="700" fill="#4C1D95">Géométrique (IRIS) : 59 %</text>
              </svg>
            </div>

            {/* Carte 2 : Rᵢ historique */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>
                Une mémoire qui s&apos;équilibre dans le temps
              </h3>
              <p style={{ fontSize: 14.5, color: '#64748B', lineHeight: 1.75, marginBottom: 24 }}>
                Un scénario ne peut pas toujours contenter tout le monde également. IRIS
                retient, événement après événement, qui a été mieux ou moins bien servi que
                la médiane du groupe — et ajuste discrètement le calcul suivant en sa faveur.
                L&apos;équité se construit sur la durée, pas activité par activité.
              </p>

              <div style={{ position: 'relative', marginTop: 32 }}>
                <div style={{
                  position: 'absolute', top: 7, left: '16%', right: '16%',
                  height: 1.5, background: '#E2E8F0',
                }} />
                <div style={{ display: 'flex', position: 'relative' }}>
                  {[
                    { label: 'Événement 1', sub: 'un peu moins servi', tone: '#94A3B8' },
                    { label: 'Événement 2', sub: 'coefficient ajusté', tone: '#7C3AED' },
                    { label: 'Événement 3', sub: 'satisfaction rééquilibrée', tone: '#4C1D95' },
                  ].map((step) => (
                    <div key={step.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', margin: '0 auto 10px',
                        background: step.tone, position: 'relative', zIndex: 1,
                      }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{step.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Pourquoi ces méthodes ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={eyebrowStyle}>Les fondements</div>
            <h2 style={h2Style}>Pourquoi ces méthodes ?</h2>
            <p style={leadStyle}>
              IRIS ne cherche pas à remplacer la décision humaine. Il s&apos;appuie sur
              plusieurs méthodes issues de la théorie du choix social afin d&apos;aider les
              groupes à comprendre les conséquences de leurs choix avant de décider.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {[
              {
                title: 'Préférences individuelles',
                text: 'Chaque participant exprime ses préférences, ses contraintes et ses disponibilités sans devoir les résumer à un simple oui ou non.',
              },
              {
                title: 'Analyse d\u2019équité',
                text: 'Les scénarios sont comparés afin d\u2019identifier ceux qui répartissent le plus équitablement les avantages et les contraintes, entre les participants comme dans le temps.',
              },
              {
                title: 'Recherche de compromis',
                text: 'L\u2019objectif n\u2019est pas de satisfaire uniquement une majorité, mais de rechercher des solutions qui restent acceptables pour l\u2019ensemble du groupe.',
              },
              {
                title: 'Vote Condorcet',
                text: 'Le choix final repose sur un vote comparatif, qui départage les scénarios retenus de manière transparente — sans jamais laisser l\u2019algorithme trancher à la place du groupe.',
              },
            ].map((card) => (
              <div key={card.title} style={cardStyle}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>{card.title}</h3>
                <p style={{ color: '#64748B', lineHeight: 1.75, fontSize: 14.5 }}>{card.text}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 56, textAlign: 'center' }}>
            <p style={{ maxWidth: 720, margin: '0 auto 24px', color: '#64748B', lineHeight: 1.8, fontSize: 15 }}>
              Derrière ces principes se trouvent plusieurs travaux issus de la théorie du
              choix social, de l&apos;optimisation collective et des systèmes de vote. IRIS les
              applique à un problème concret : aider des groupes à prendre des décisions
              collectives plus éclairées.
            </p>
            <Link href="/science" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#7C3AED', fontWeight: 700, fontSize: 14.5, textDecoration: 'none' }}>
              Comprendre les fondements scientifiques →
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Cas d'usage ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={eyebrowStyle}>Applications</div>
            <h2 style={h2Style}>Dans quelles situations utiliser IRIS ?</h2>
            <p style={leadStyle}>
              Toute situation impliquant plusieurs personnes, plusieurs contraintes et
              plusieurs options peut bénéficier d&apos;une approche structurée de la décision
              collective.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[
              { title: 'Week-end entre amis', description: 'Choisir une destination, une date et des activités sans multiplier les sondages et les discussions interminables.' },
              { title: 'Organisation de vacances', description: 'Comparer plusieurs itinéraires en tenant compte des préférences, du budget et des contraintes de chacun.' },
              { title: 'Vie associative', description: 'Préparer des événements ou planifier des activités collectives en impliquant l\u2019ensemble des membres.' },
              { title: 'Séminaires et ateliers', description: 'Construire un programme qui prenne réellement en compte les contraintes des participants.' },
              { title: 'Clubs et communautés', description: 'Décider collectivement des activités, rencontres ou projets à organiser au fil du temps.' },
              { title: 'Colocations', description: 'Faciliter les décisions du quotidien lorsque plusieurs personnes partagent le même espace de vie.' },
            ].map((item) => (
              <div key={item.title} style={{ background: 'white', borderRadius: 18, padding: 28, border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: '#64748B', lineHeight: 1.75, fontSize: 14 }}>{item.description}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 56, padding: '36px 40px', borderRadius: 18,
            background: 'white', border: '1px solid #E2E8F0', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 14 }}>
              Au-delà de l&apos;organisation d&apos;événements
            </h3>
            <p style={{ maxWidth: 780, margin: '0 auto', fontSize: 15.5, lineHeight: 1.85, color: '#475569' }}>
              La démonstration actuelle d&apos;IRIS se concentre sur l&apos;organisation
              d&apos;activités et d&apos;événements. Mais les mécanismes utilisés peuvent
              s&apos;appliquer à de nombreuses situations où un groupe doit comparer des
              options, arbitrer des contraintes et construire une décision collective.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── État du projet ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={eyebrowStyle}>Développement</div>
            <h2 style={h2Style}>Un projet en construction</h2>
            <p style={leadStyle}>
              IRIS est développé sous la forme d&apos;un démonstrateur public. Cette version
              permet déjà d&apos;explorer les principaux mécanismes de décision collective sur
              lesquels repose le projet.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 22 }}>Disponible aujourd&apos;hui</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  'Gestion des groupes, y compris multiples et croisés',
                  'Création d\u2019événements et invitation ciblée des participants',
                  'Collecte des disponibilités, y compris conditionnelles',
                  'Gestion des activités et de leurs contraintes',
                  'Génération automatique de scénarios',
                  'Financement par l\u2019organisateur ou par les participants',
                  'Calcul d\u2019équité et de compensation dans le temps',
                  'Vote Condorcet',
                ].map((item) => (
                  <li key={item} style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.6, paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#7C3AED' }}>–</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 22 }}>Prochaines évolutions</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  'Retour post-événement : confronter le scénario retenu au vécu réel des participants, et affiner le Rᵢ en conséquence',
                  'Calcul d\u2019itinéraire réel (transports en commun, navigation) et gestion des logements',
                  'Gestion du covoiturage',
                  'Événements réellement récurrents',
                  'Activités imposées ou obligatoires dans un scénario (utile en mode entreprise, ou pour les séjours de plusieurs jours)',
                  'Import automatique d\u2019activités par géolocalisation',
                  'Synchronisation avec un calendrier externe',
                  'Traduction en anglais et mode sombre',
                  'Renforcement de la confidentialité et de la conformité RGPD',
                  'Ouverture à de nouveaux cas d\u2019usage',
                ].map((item) => (
                  <li key={item} style={{ color: '#64748B', fontSize: 14.5, lineHeight: 1.6, paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#CBD5E1' }}>–</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{
            marginTop: 56, padding: '40px', borderRadius: 18,
            background: '#F5F3FF', border: '1px solid #E9D5FF',
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 18, textAlign: 'center' }}>
              Pourquoi une démonstration publique ?
            </h3>
            <p style={{ maxWidth: 820, margin: '0 auto', fontSize: 15.5, lineHeight: 1.85, color: '#475569', textAlign: 'center' }}>
              L&apos;objectif de cette version n&apos;est pas seulement de présenter une
              application fonctionnelle. Elle sert aussi à expérimenter de nouvelles façons
              d&apos;organiser les décisions collectives, à confronter les hypothèses du
              projet à des usages réels, et à faire évoluer progressivement la méthode à
              partir des retours des utilisateurs.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Vision ───────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={eyebrowStyle}>Vision</div>
          <h2 style={h2Style}>Pourquoi IRIS ?</h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.85, color: '#475569', marginBottom: 20 }}>
            De nombreux outils permettent de voter. Peu permettent d&apos;explorer
            collectivement les compromis, de rendre visibles les contraintes de chacun et
            d&apos;analyser plusieurs solutions avant de prendre une décision.
          </p>
          <p style={{ fontSize: 16.5, lineHeight: 1.85, color: '#475569' }}>
            IRIS est né de cette idée : améliorer la qualité des décisions collectives en
            donnant aux groupes davantage d&apos;informations, davantage de transparence et
            davantage de possibilités d&apos;exploration.
          </p>
        </div>
      </section>

      {/* ───────────────────────── CTA final ───────────────────────── */}
      <section style={{ padding: '90px 24px', background: 'white', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 38px)', fontWeight: 800, color: '#1E293B', lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>
            Explorer la méthode par l&apos;usage
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#64748B', maxWidth: 620, margin: '0 auto 36px' }}>
            La meilleure façon de comprendre IRIS reste de l&apos;utiliser. Créez un
            événement, invitez quelques participants, et observez comment des préférences
            individuelles se transforment en décision collective lisible et transparente.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={{
              background: '#4C1D95', color: 'white', padding: '14px 28px', borderRadius: 12,
              textDecoration: 'none', fontWeight: 700, fontSize: 15,
            }}>
              Tester la démo
            </Link>
            <Link href="/methode" style={{
              border: '1px solid #E2E8F0', color: '#1E293B', padding: '14px 28px', borderRadius: 12,
              textDecoration: 'none', fontWeight: 700, fontSize: 15,
            }}>
              Comprendre la méthode
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />

      {/* Bouton de suggestion flottant */}
      <a
        href="https://tally.so/r/Y5qxz0"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 999,
          background: 'white', color: '#4C1D95',
          fontSize: 13, fontWeight: 600,
          border: '1px solid #E9D5FF',
          boxShadow: '0 4px 20px rgba(76,29,149,0.12)',
          textDecoration: 'none',
        }}
      >
        Suggestion
      </a>

    </main>
  )
}
