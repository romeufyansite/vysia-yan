import { useState, useRef, useEffect } from 'react';

interface ConnectScreenStep2Props {
  code: string;
  onCodeChange: (code: string) => void;
  error?: string | null;
  isVerifying?: boolean;
}

export function ConnectScreenStep2({ code, onCodeChange, error, isVerifying }: ConnectScreenStep2Props) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  useEffect(() => {
    const codeArray = code.split('');
    const newDigits = ['', '', '', ''];
    codeArray.forEach((char, index) => {
      if (index < 4) {
        newDigits[index] = char;
      }
    });
    setDigits(newDigits);
  }, [code]);

  const handleDigitChange = (index: number, value: string) => {
    const upperValue = value.toUpperCase();
    const lastChar = upperValue.slice(-1);

    if (lastChar && !/^[A-Z0-9]$/.test(lastChar)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);

    const newCode = newDigits.join('');
    onCodeChange(newCode);

    if (lastChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().slice(0, 4);
    const newDigits = ['', '', '', ''];

    for (let i = 0; i < pastedText.length; i++) {
      if (/^[A-Z0-9]$/.test(pastedText[i])) {
        newDigits[i] = pastedText[i];
      }
    }

    setDigits(newDigits);
    onCodeChange(newDigits.join(''));

    const nextEmptyIndex = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmptyIndex === -1 ? 3 : nextEmptyIndex;
    inputRefs[focusIndex].current?.focus();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-blue-600 text-center text-lg font-medium">
        2 - Appairage de votre écran
      </h3>

      <div className="flex justify-center gap-4 my-12">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isVerifying}
            className={`w-20 h-24 text-center text-4xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 uppercase transition-colors ${
              error
                ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-blue-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        ))}
      </div>

      {error ? (
        <p className="text-center text-red-500 text-sm font-medium">{error}</p>
      ) : (
        <p className="text-center text-gray-600 text-sm">
          {isVerifying ? 'Vérification du code...' : 'Renseignez le code d\'appairage indiqué sur votre écran'}
        </p>
      )}
    </div>
  );
}
