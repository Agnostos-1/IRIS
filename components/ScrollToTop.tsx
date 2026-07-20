// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

"use client"

import { useEffect, useState } from 'react'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  // Détecte le défilement pour afficher ou masquer le bouton
  useEffect(() => {
    const toggleVisibility = () => {
      // On affiche le bouton si on a défilé de plus de 400px
      if (window.scrollY > 400) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  // Fonction pour remonter tout en haut de manière fluide
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          type="button"
          aria-label="Remonter en haut de la page"
          className="fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-purple-600 shadow-lg border border-purple-100 hover:bg-purple-50 hover:scale-105 transition-all duration-200 cursor-pointer group"
        >
          {/* Icône de flèche vers le haut */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-5 h-5 transition-transform group-hover:-translate-y-0.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
            />
          </svg>
        </button>
      )}
    </>
  )
}