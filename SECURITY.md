# Politique de sécurité

## Signaler une vulnérabilité

IRIS traite des données personnelles (profils, disponibilités, budgets, contraintes de santé/accessibilité). Si vous découvrez une faille de sécurité, merci de la signaler de façon responsable plutôt que de l'ouvrir en issue publique.

**Ne créez pas d'issue publique pour une vulnérabilité de sécurité.**

Contactez à la place : iris.dev.webapp@gmail.com

Merci d'inclure :
- Une description de la vulnérabilité et de son impact potentiel
- Les étapes pour la reproduire
- Toute preuve de concept, si vous en avez une

## Délai de réponse

Nous nous engageons à accuser réception de votre signalement sous 5 jours ouvrés, et à vous tenir informé de l'avancée de la correction.

## Périmètre particulièrement sensible

- Toute fuite permettant à un participant de voir les données individuelles d'un autre (scores, budget, préférences, contraintes) — la confidentialité entre participants est un principe de conception central d'IRIS
- Contournement de l'authentification ou des politiques Row Level Security de Supabase
- Élévation de privilèges (accès organisateur sans y être habilité)
- Injection (SQL, XSS) dans les champs libres (noms d'activités, adresses, descriptions)

## Divulgation coordonnée

Nous demandons un délai raisonnable pour corriger une vulnérabilité avant toute divulgation publique. Une fois le correctif publié, le signalement peut être crédité (avec votre accord) dans le `CHANGELOG.md`.
