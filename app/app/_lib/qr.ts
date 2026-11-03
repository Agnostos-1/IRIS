// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import qrcode from 'qrcode-generator'

/**
 * Encode un texte en matrice de modules, true pour un module foncé.
 *
 * L'encodage QR impose une correction d'erreur Reed-Solomon : l'écrire à la
 * main exposerait à des défauts subtils produisant un code qui ne se scanne
 * pas, défaut invisible autrement qu'avec un vrai lecteur. D'où une
 * bibliothèque éprouvée et sans dépendance, chargée à la demande.
 *
 * @param texte     contenu à encoder, typiquement un lien d'invitation
 * @param correction niveau de correction d'erreur. M corrige environ 15 % de
 *   modules abîmés : le bon compromis pour un code affiché à l'écran, qu'un
 *   reflet ou un angle peuvent dégrader.
 */
export function encoderQR(texte: string, correction: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean[][] {
  // 0 laisse la bibliothèque choisir la plus petite version capable de
  // contenir le texte — un lien court donne donc une grille peu dense, plus
  // facile à scanner.
  const qr = qrcode(0, correction)
  qr.addData(texte)
  qr.make()

  const cote = qr.getModuleCount()
  const matrice: boolean[][] = []
  for (let ligne = 0; ligne < cote; ligne++) {
    const valeurs: boolean[] = []
    for (let colonne = 0; colonne < cote; colonne++) {
      valeurs.push(qr.isDark(ligne, colonne))
    }
    matrice.push(valeurs)
  }
  return matrice
}
