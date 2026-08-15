export default function Slider({ value, onChange, min = 0, max = 100, step = 1, label, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border/30 accent-primary"
      />
      <span className="w-8 text-right text-xs font-medium tabular-nums text-text-secondary">{value}{label}</span>
    </div>
  );
}
