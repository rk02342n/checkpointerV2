export default function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 border-4 border-border hover:opacity-90 transition-colors focus:outline-none ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    )
  }
