import React, { useState } from 'react'
import { Sliders, Disc, Wind, Zap, Radio, Filter as FilterIcon } from 'lucide-react'

export interface EffectSettings {
  reverb: number
  delay: number
  filter: number
  bitcrush: number
  phaser: number
  flanger: number
}

interface EffectsPanelProps {
  deckId: 'A' | 'B'
  effects: EffectSettings
  onEffectChange: (effect: keyof EffectSettings, value: number) => void
  onEffectToggle: (effect: keyof EffectSettings, enabled: boolean) => void
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  deckId,
  effects,
  onEffectChange,
  onEffectToggle
}) => {
  const [enabledEffects, setEnabledEffects] = useState<Set<keyof EffectSettings>>(new Set())

  const effectsList = [
    { key: 'reverb' as keyof EffectSettings, name: 'Reverb', icon: Wind, color: 'text-blue-400' },
    { key: 'delay' as keyof EffectSettings, name: 'Delay', icon: Radio, color: 'text-purple-400' },
    { key: 'filter' as keyof EffectSettings, name: 'Filter', icon: FilterIcon, color: 'text-green-400' },
    { key: 'bitcrush' as keyof EffectSettings, name: 'Bitcrush', icon: Zap, color: 'text-red-400' },
    { key: 'phaser' as keyof EffectSettings, name: 'Phaser', icon: Disc, color: 'text-yellow-400' },
    { key: 'flanger' as keyof EffectSettings, name: 'Flanger', icon: Disc, color: 'text-pink-400' }
  ]

  const toggleEffect = (effect: keyof EffectSettings) => {
    const newEnabled = new Set(enabledEffects)
    if (newEnabled.has(effect)) {
      newEnabled.delete(effect)
      onEffectToggle(effect, false)
    } else {
      newEnabled.add(effect)
      onEffectToggle(effect, true)
    }
    setEnabledEffects(newEnabled)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-purple-500" />
        Effects - Deck {deckId}
      </h4>

      <div className="space-y-3">
        {effectsList.map(({ key, name, icon: Icon, color }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleEffect(key)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all ${
                  enabledEffects.has(key)
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-900 text-gray-500 hover:bg-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${enabledEffects.has(key) ? color : ''}`} />
                <span>{name}</span>
              </button>
              <span className="text-xs font-mono text-gray-400">
                {Math.round(effects[key])}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={effects[key]}
                onChange={(e) => onEffectChange(key, parseInt(e.target.value))}
                disabled={!enabledEffects.has(key)}
                className="flex-1 disabled:opacity-30"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Effect Presets */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Quick Presets</div>
        <div className="grid grid-cols-3 gap-2">
          <button 
            className="py-1 px-2 bg-gray-700 hover:bg-gray-600 text-xs rounded transition-colors"
            onClick={() => {
              onEffectChange('reverb', 30)
              onEffectChange('delay', 20)
              toggleEffect('reverb')
              toggleEffect('delay')
            }}
          >
            Space
          </button>
          <button 
            className="py-1 px-2 bg-gray-700 hover:bg-gray-600 text-xs rounded transition-colors"
            onClick={() => {
              onEffectChange('filter', 70)
              onEffectChange('phaser', 50)
              toggleEffect('filter')
              toggleEffect('phaser')
            }}
          >
            Sweep
          </button>
          <button 
            className="py-1 px-2 bg-gray-700 hover:bg-gray-600 text-xs rounded transition-colors"
            onClick={() => {
              onEffectChange('bitcrush', 40)
              onEffectChange('flanger', 60)
              toggleEffect('bitcrush')
              toggleEffect('flanger')
            }}
          >
            Chaos
          </button>
        </div>
      </div>
    </div>
  )
}