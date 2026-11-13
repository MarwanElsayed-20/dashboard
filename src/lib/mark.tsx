/**
 * The ME mark from the portfolio (src/app/icon.svg there), drawn for generated PNG icons. `inset`
 * shrinks it inside the square for maskable icons, whose edges a phone may crop.
 */
export function Mark({
  size,
  inset = 0,
  rounded = true,
}: {
  size: number;
  inset?: number;
  rounded?: boolean;
}) {
  const inner = size - inset * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#141415",
        borderRadius: rounded ? size * 0.1875 : 0,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 160 160">
        <path
          fill="#ecf1ed"
          d="M20 20L80 65L140 20L140 50L80 95L40 65L40 140L20 140ZM80 115L140 70L140 100L113.33 120L140 120L140 140L80 140Z"
        />
        <path fill="#dcf26b" d="M80 115L140 70L140 100L113.33 120L80 120Z" />
      </svg>
    </div>
  );
}
