# Plan d'implémentation Playlists

Cette tâche est très volumineuse. Pour respecter les contraintes de tokens, voici le plan condensé:

## Phase 1 - Infrastructure (Complété)
✅ Migrations DB playlists + playlist_items
✅ Types TypeScript (AppType, PlaylistItem, configs)
✅ Service playlist complet

## Phase 2 - Pages et UI (À faire)
- PlaylistsPage: grille de cartes, actions CRUD
- PlaylistEditorPage: liste items + sidebar apps + preview
- Composants modaux pour chaque type d'app
- Publish to screen modal

## Phase 3 - Edge Functions (À faire)
- screen_publish: génère scene JSON + Realtime
- Mise à jour scene_get
- Player: lecture playlist

## Approche recommandée
Vu la complexité, je suggère de procéder en plusieurs messages pour:
1. Créer les pages principales
2. Créer les composants UI
3. Créer les Edge Functions
4. Tester l'intégration

Le code sera modulaire et réutilisable.
