// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Ecran, { AConstruire } from '../_components/Ecran'

export default function ProfilApp() {
  return (
    <Ecran titre="Profil" sousTitre="Vos préférences et vos contraintes">
      <AConstruire quoi="Le profil de préférences sera repris ici. À terme, il sera alimenté par le Question Engine plutôt que par des curseurs." />
    </Ecran>
  )
}
