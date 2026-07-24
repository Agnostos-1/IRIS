// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { Resend } from 'resend'

const FROM = `IRIS <${process.env.RESEND_FROM_EMAIL}>`

// Instancié à la première utilisation, pas au chargement du module : le
// constructeur Resend lève une exception si la clé API est absente, ce qui
// ferait planter toute route qui importe ce module (dev local sans clé, ou
// variable d'env manquante par erreur en prod) plutôt que de simplement
// échouer l'envoi — un email qui échoue ne doit jamais faire échouer l'action
// principale (créer une invitation reste utile même si l'email ne part pas).
let resend: Resend | null = null

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Erreur envoi email: RESEND_API_KEY absente')
    return { ok: false }
  }
  try {
    resend ??= new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) console.error('Erreur envoi email:', error)
    return { ok: !error }
  } catch (err) {
    console.error('Erreur envoi email:', err)
    return { ok: false }
  }
}

function wrapEmail(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1E293B;">
      <div style="font-size: 20px; font-weight: 700; color: #4C1D95; margin-bottom: 24px;">IRIS</div>
      <h1 style="font-size: 18px; font-weight: 700; margin: 0 0 16px;">${title}</h1>
      <div style="font-size: 14px; line-height: 1.6; color: #334155;">${bodyHtml}</div>
      <a href="${ctaUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px;
        border-radius: 10px; background: #7C3AED; color: white; font-weight: 600;
        font-size: 14px; text-decoration: none;">${ctaLabel}</a>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 32px;">
        Ou copiez ce lien dans votre navigateur : ${ctaUrl}
      </p>
    </div>
  `
}

export async function sendGroupInviteEmail({
  to, inviterName, groupName, joinUrl, isExistingUser,
}: {
  to: string; inviterName: string; groupName: string; joinUrl: string; isExistingUser: boolean
}) {
  const subject = `${inviterName} vous invite à rejoindre "${groupName}" sur IRIS`
  const body = isExistingUser
    ? `<p><strong>${inviterName}</strong> vous a ajouté au groupe <strong>${groupName}</strong> sur IRIS, l'outil de décision collective que vous utilisez déjà.</p>
       <p>Rejoignez le groupe pour participer aux prochains événements planifiés avec ce groupe.</p>`
    : `<p><strong>${inviterName}</strong> vous invite à rejoindre le groupe <strong>${groupName}</strong> sur IRIS,
       un outil pour organiser des sorties et événements en groupe de façon équitable.</p>
       <p>Créez votre compte pour rejoindre le groupe et participer.</p>`
  return sendEmail({
    to, subject,
    html: wrapEmail(`Invitation à rejoindre ${groupName}`, body, 'Rejoindre le groupe', joinUrl),
  })
}

export async function sendEventInviteEmail({
  to, inviterName, eventName, joinUrl, isExistingUser,
}: {
  to: string; inviterName: string; eventName: string; joinUrl: string; isExistingUser: boolean
}) {
  const subject = `${inviterName} vous invite à "${eventName}" sur IRIS`
  const body = isExistingUser
    ? `<p><strong>${inviterName}</strong> vous invite à participer à <strong>${eventName}</strong> sur IRIS.</p>
       <p>Indiquez vos disponibilités et vos préférences pour aider le groupe à trouver le meilleur créneau et les meilleures activités.</p>`
    : `<p><strong>${inviterName}</strong> vous invite à participer à <strong>${eventName}</strong> sur IRIS,
       un outil pour organiser des événements en groupe de façon équitable.</p>
       <p>Créez votre compte pour indiquer vos disponibilités et vos préférences.</p>`
  return sendEmail({
    to, subject,
    html: wrapEmail(`Invitation à ${eventName}`, body, "Voir l'événement", joinUrl),
  })
}
