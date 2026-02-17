const GRADIENT_PAIRS: [string, string][] = [
  ["#ff6b6b", "#ffa07a"],
  ["#a18cd1", "#fbc2eb"],
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a1c4fd", "#c2e9fb"],
  ["#f6d365", "#fda085"],
  ["#fccb90", "#d57eeb"],
  ["#e0c3fc", "#8ec5fc"],
  ["#f5576c", "#ff6f91"],
  ["#c471f5", "#fa71cd"],
  ["#48c6ef", "#6f86d6"],
  ["#feada6", "#f5efef"],
  ["#a8edea", "#fed6e3"],
];

function hashUserId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface GradientAvatarProps {
  userId: string;
  size?: number;
  className?: string;
}

export function GradientAvatar({
  userId,
  size = 32,
  className = "",
}: GradientAvatarProps) {
  const index = hashUserId(userId) % GRADIENT_PAIRS.length;
  const [from, to] = GRADIENT_PAIRS[index];

  return (
    <div
      className={`rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    />
  );
}
