'use client'

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
}

const MODELS = [
  { value: 'sonar-pro', label: 'Perplexity Sonar Pro', provider: 'perplexity' },
  { value: 'llama-3.1-sonar-large-128k-online', label: 'Perplexity Sonar Large', provider: 'perplexity' },
  // Add more models as needed
]

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        AI Model
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MODELS.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
    </div>
  )
}




