import { Check } from 'lucide-react';

interface ConnectScreenStep1Props {
  selectedType: 'smart-tv' | 'web-browser' | 'non-connected' | null;
  onSelectType: (type: 'smart-tv' | 'web-browser' | 'non-connected') => void;
}

export function ConnectScreenStep1({ selectedType, onSelectType }: ConnectScreenStep1Props) {
  return (
    <div className="space-y-6 bg-[#f8f8f8] p-8 rounded-2xl">
      <h3 className="text-blue-600 text-center text-lg font-medium">
        1 - Indiquez le type d'écran
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => onSelectType('smart-tv')}
          className={`relative border-2 rounded-2xl p-6 bg-white text-center transition-all hover:border-blue-500 ${
            selectedType === 'smart-tv' ? 'border-blue-500' : 'border-[#f8f8f8]'
          }`}
        >
          {selectedType === 'smart-tv' && (
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="mb-4">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/tv-connect.webp"
              alt="TV Connectée"
              className="w-full h-24 mx-auto object-contain"
            />
          </div>
          <div className="text-sm font-semibold mb-2">TV CONNECTÉE</div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/Samsung-Smart-TV-Logo-2015.png"
              alt="Smart TV"
              className="h-5 object-contain"
            />
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/Google_Play_2022_logo.svg.png"
              alt="Google Play"
              className="h-5 object-contain"
            />
          </div>
        </button>

        <button
          onClick={() => onSelectType('web-browser')}
          className={`relative border-2 rounded-2xl p-6 bg-white text-center transition-all hover:border-blue-500 ${
            selectedType === 'web-browser' ? 'border-blue-500' : 'border-[#f8f8f8]'
          }`}
        >
          {selectedType === 'web-browser' && (
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="mb-4">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/pc-portable-apple-macbook-pro-16-touch-bar-gris-sideral.png"
              alt="Navigateur Web"
              className="w-full h-24 mx-auto object-contain"
            />
          </div>
          <div className="text-sm font-semibold mb-2">NAVIGATEUR WEB</div>
          <div className="flex items-center justify-center">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/logos-navigateurs.png"
              alt="Navigateurs"
              className="h-6 object-contain"
            />
          </div>
        </button>

        <button
          onClick={() => onSelectType('non-connected')}
          className={`relative border-2 rounded-2xl p-6 bg-white text-center transition-all hover:border-blue-500 ${
            selectedType === 'non-connected' ? 'border-blue-500' : 'border-[#f8f8f8]' 
          }`}
        >
          {selectedType === 'non-connected' && (
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="mb-4">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/tv-non-connectee.webp"
              alt="TV Non-Connectée"
              className="w-full h-24 mx-auto object-contain"
            />
          </div>
          <div className="text-sm font-semibold mb-2">TV NON-CONNECTÉE</div>
          <div className="flex items-center justify-center gap-2">
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/pas-de-signal-wi-fi-3d-icon-png-download-5113956.png"
              alt="No WiFi"
              className="h-6 object-contain"
            />
            <img
              src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/pendrive-usb-icon-3d-rendering-illustration-element-png.png"
              alt="USB"
              className="h-6 object-contain"
            />
          </div>
        </button>
      </div>

      {selectedType === 'smart-tv' && (
        <div className="p-6">
          <div className="flex gap-6">
            
            <div className="flex-1">
              <div className="flex items-start gap-8 mb-4">
                <img
                  src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/ic_launcher.png"
                  alt="App Icon"
                  className="w-16 h-16 rounded-lg"
                />
               <div>
  <h4 className="font-semibold text-lg mb-4">Télécharger l'application "Vysia Playeur"</h4>

  <ol className="text-sm text-gray-600 font-extralight space-y-2 mb-4">
    <li><span className="font-extralight text-lg text-blue-500">1 -</span> Ouvrir le Play Store de votre TV</li>
    <li><span className="font-extralight text-lg text-blue-500">2 -</span> Rechercher "Vysia" et installer l'application Vysia Playeur</li>
    <li><span className="font-extralight text-lg text-blue-500">3 -</span> Ouvrir l'application et récupérer le code d'appairage</li> 
  </ol>

  <ol className="text-sm pt-4 border-t-2 font-extralight">
    <li>Vous avez la possibilité de connecter "Vysia" avec toutes les TV Android, Google, les box Internet et les clés TV</li>
  </ol>
</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedType === 'web-browser' && (
        <div className="p-6">
          <div className="flex gap-6">
           
            <div className="flex-1">
              <div className="flex items-start gap-8 mb-4">
                <img
                  src="https://zaaspdrcjlcriazvwgra.supabase.co/storage/v1/object/public/media/5602732.png"
                  alt="WWW Icon"
                  className="w-16 h-16"
                />
                <div>
                  <h4 className="font-semibold text-lg mb-4">Afficher le player Web "Vysia Player"</h4>
                  <ol className="text-sm text-gray-600 font-extralight space-y-2 mb-4">
    <li><span className="font-extralight text-lg text-blue-500">1 - </span>
                      Ouvrir votre navigateur Web sur votre écran et saisir l'adresse{' '}
                      <p className="pl-6"><a href="https://vysia.io/fr-player" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                        https://vysia.io/fr-player
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      </p>
                    </li>
                    <li><span className="font-extralight text-lg text-blue-500">2 -</span>  Récupérer le code d'appairage</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedType === 'non-connected' && (
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-700 mb-4">Cette fonctionnalité sera bientôt disponible.</p>
            <p className="text-sm text-gray-600">
              Vous pourrez télécharger l'application sur une clé USB pour l'installer sur votre TV non connectée.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
