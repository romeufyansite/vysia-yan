# Gestion du statut "Hors ligne" pour l'app Android TV

## Problème identifié

Lorsqu'un écran passe au statut "Hors ligne" depuis l'interface web, l'app Android TV se déconnecte après un certain temps et retourne à l'écran d'appairage avec un nouveau code à 4 lettres. Ce comportement n'est pas souhaité.

## Comportement attendu

L'app Android TV devrait :
1. Continuer à faire des heartbeats vers l'edge function `scene-get`
2. Détecter le flag `isOffline: true` dans la réponse
3. Afficher un écran noir avec un message "Écran mis hors ligne par l'administrateur"
4. **NE PAS** se déconnecter ou retourner à l'écran d'appairage
5. Reprendre l'affichage du contenu automatiquement quand l'écran repasse "En ligne"

## Format de la réponse de l'edge function `scene-get`

### Écran en ligne avec contenu
```json
{
  "message": "Lecture en cours",
  "version": 1,
  "screen": { "id": "...", "name": "...", "status": "online" },
  "playlist": { "id": "...", "name": "..." },
  "items": [...],
  "hasContent": true,
  "isOffline": false
}
```

### Écran en ligne sans contenu
```json
{
  "message": "Écran connecté - en attente de contenu",
  "version": 1,
  "screen": { "id": "...", "name": "...", "status": "online" },
  "playlist": null,
  "items": [],
  "hasContent": false,
  "isOffline": false
}
```

### Écran HORS LIGNE (cas critique)
```json
{
  "message": "Écran mis hors ligne par l'administrateur",
  "version": 1,
  "screen": { "id": "...", "name": "...", "status": "offline" },
  "playlist": null,
  "items": [],
  "hasContent": false,
  "isOffline": true
}
```

## Codes HTTP et comportement de déconnexion

L'app Android TV devrait se déconnecter UNIQUEMENT dans ces cas :

### 404 - Écran supprimé
L'écran n'existe plus dans la base de données. L'appareil doit retourner à l'écran d'appairage.

### 401 - Non autorisé
Le JWT de l'appareil est invalide ou expiré. L'appareil doit retourner à l'écran d'appairage.

### 200 avec isOffline: true - Écran hors ligne
**L'appareil NE DOIT PAS se déconnecter**. Il doit simplement :
- Arrêter d'afficher le contenu
- Afficher un message "Écran hors ligne"
- Continuer à faire des heartbeats toutes les 30 secondes
- Attendre que `isOffline` devienne `false` pour reprendre la lecture

## Implémentation recommandée pour Android TV

```kotlin
// Pseudo-code pour l'app Android TV
private fun handleSceneResponse(response: SceneResponse) {
    when {
        response.isOffline == true -> {
            // NE PAS se déconnecter !
            showOfflineScreen(response.screen.name, response.message)
            // Continuer les heartbeats
        }
        response.hasContent -> {
            playContent(response.items)
        }
        else -> {
            showWaitingScreen(response.screen.name, response.message)
        }
    }
}

private fun handleHttpError(statusCode: Int, error: String) {
    when (statusCode) {
        404, 401 -> {
            // Seulement dans ces cas, se déconnecter
            disconnectDevice()
            navigateToPairingScreen()
        }
        else -> {
            // Erreur temporaire, continuer les heartbeats
            Log.e(TAG, "Temporary error: $statusCode - $error")
        }
    }
}
```

## Vérifications à effectuer dans l'app Android TV

1. Vérifier que l'app lit correctement le champ `isOffline` dans la réponse JSON
2. Vérifier que l'app ne se déconnecte PAS quand elle reçoit un HTTP 200 avec `isOffline: true`
3. Vérifier que l'app continue de faire des heartbeats même quand `isOffline: true`
4. Vérifier que l'app affiche un écran noir/message approprié quand `isOffline: true`
5. Vérifier que l'app reprend automatiquement la lecture quand `isOffline` devient `false`

## Logs utiles pour le debugging

L'edge function `scene-get` log déjà ces informations :
- `[scene-get] Screen found: <name> Status: <status>`
- `[scene-get] Screen is offline, returning no content`

L'app Android TV devrait logger :
- La réception de `isOffline: true`
- L'affichage de l'écran hors ligne
- La reprise de la lecture quand `isOffline: false`
