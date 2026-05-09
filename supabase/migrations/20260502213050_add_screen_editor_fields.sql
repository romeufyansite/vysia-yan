/*
  # Ajout des champs d'édition d'écran

  1. Modifications de la table `screens`
    - Ajout de `orientation` (text) : 'landscape' ou 'portrait'
    - Ajout de `template` (text) : 'fullscreen', '70-30', '30-70', 'banner'
    - Ajout de `zones` (jsonb) : tableau de zones configurées
    - Ajout de `overlays` (jsonb) : tableau d'overlays (horloge, météo, etc.)

  2. Sécurité
    - Aucun changement RLS nécessaire, les politiques existantes s'appliquent

  3. Notes importantes
    - Tous les champs ont des valeurs par défaut sensées
    - Utilisation de IF NOT EXISTS pour éviter les erreurs en cas de ré-exécution
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'orientation'
  ) THEN
    ALTER TABLE screens ADD COLUMN orientation text DEFAULT 'landscape';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'template'
  ) THEN
    ALTER TABLE screens ADD COLUMN template text DEFAULT 'fullscreen';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'zones'
  ) THEN
    ALTER TABLE screens ADD COLUMN zones jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screens' AND column_name = 'overlays'
  ) THEN
    ALTER TABLE screens ADD COLUMN overlays jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;