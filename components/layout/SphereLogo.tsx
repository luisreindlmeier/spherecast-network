export default function SphereLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sphere-grad" cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#f0f2f8" />
          <stop offset="30%" stopColor="#b8bccc" />
          <stop offset="70%" stopColor="#5a6275" />
          <stop offset="100%" stopColor="#232834" />
        </radialGradient>
        <radialGradient id="sphere-highlight" cx="35%" cy="30%" r="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#sphere-grad)" />
      <circle cx="16" cy="16" r="14" fill="url(#sphere-highlight)" />
    </svg>
  )
}
