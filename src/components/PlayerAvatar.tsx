/** Muestra la foto del jugador si tiene, o su inicial sobre el color de su estandarte. */
export default function PlayerAvatar({
  name,
  color,
  photo,
  size,
  bordered = false,
  className = "",
}: {
  name: string;
  color: string;
  photo?: string | null;
  size: number;
  bordered?: boolean;
  className?: string;
}) {
  const shape = `rounded-full shrink-0 ${bordered ? "border-2" : ""} ${className}`;
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={`object-cover ${shape}`}
        style={{ width: size, height: size, borderColor: bordered ? color : undefined }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center text-[#f6e9c8] font-display font-bold ${shape}`}
      style={{
        backgroundColor: color,
        borderColor: bordered ? color : undefined,
        width: size,
        height: size,
        fontSize: size / 2.4,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
