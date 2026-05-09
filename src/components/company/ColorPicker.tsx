import { useState, useEffect, useRef } from 'react';

interface ColorPickerProps {
  hex: string;
  onChange: (hex: string) => void;
}

const PRESETS = [
  '#1E3A8A', '#2563EB', '#0EA5E9', '#06B6D4', '#10B981', '#22C55E',
  '#EAB308', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#111827',
  '#374151', '#6B7280', '#9CA3AF', '#FFFFFF',
];

export function ColorPicker({ hex, onChange }: ColorPickerProps) {
  const [value, setValue] = useState(hex);
  const [hexInput, setHexInput] = useState(hex);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(hex);
    setHexInput(hex);
  }, [hex]);

  const commit = (val: string) => {
    const normalized = val.startsWith('#') ? val : `#${val}`;
    if (/^#([0-9A-Fa-f]{6})$/.test(normalized)) {
      setValue(normalized.toUpperCase());
      onChange(normalized.toUpperCase());
    }
  };

  return (
    <div className="space-y-4">
      {/* Color preview + native picker trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-14 h-14 rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
          aria-label="Ouvrir le nuancier"
        />
        <input
          ref={ref}
          type="color"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setHexInput(e.target.value.toUpperCase());
            onChange(e.target.value.toUpperCase());
          }}
          className="sr-only"
        />
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Code hexadécimal</label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            onBlur={() => commit(hexInput)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(hexInput); }}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 font-mono text-sm uppercase focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      </div>

      {/* Preset swatches */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Suggestions</p>
        <div className="grid grid-cols-8 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => { setValue(preset); setHexInput(preset); onChange(preset); }}
              className={`w-8 h-8 rounded-lg border transition-all ${
                value.toUpperCase() === preset.toUpperCase() ? 'ring-2 ring-blue-500 ring-offset-2 border-transparent' : 'border-gray-200 hover:scale-110'
              }`}
              style={{ backgroundColor: preset }}
              aria-label={preset}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
