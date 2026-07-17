export function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  return (
    <svg
      className="score-ring"
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Estate readiness ${score} percent`}
    >
      <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="track" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="fill"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="66" textAnchor="middle" className="value">
        {score}%
      </text>
    </svg>
  )
}
