// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import Ecran, { AConstruire } from '../_components/Ecran'

export default function EvenementsApp() {
  return (
    <Ecran titre="Événements" sousTitre="Ceux auxquels vous participez">
      <AConstruire quoi="La liste arrive en session 3, alimentée par /api/events/mine." />
    </Ecran>
  )
}
