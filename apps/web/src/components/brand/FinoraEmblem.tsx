interface FinoraEmblemProps {
  className?: string;
  size?: number;
}

export function FinoraEmblem({ className = '', size = 32 }: FinoraEmblemProps) {
  return (
    <img
      src="/brand/finora-icon.jpg"
      alt="Finora AI Emblem"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-full object-cover shrink-0 select-none ${className}`}
    />
  );
}
