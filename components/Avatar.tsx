import clsx from "clsx";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  color,
  size = 32,
  pulse = false,
  ring = false,
  title,
}: {
  name: string;
  color: string;
  size?: number;
  pulse?: boolean;
  /** Highlights this avatar as belonging to the signed-in user. */
  ring?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title ?? name}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
      }}
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        ring
          ? "ring-2 ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-slate-900"
          : "ring-2 ring-white dark:ring-slate-900",
        pulse && "animate-[avatar-pulse_1.4s_ease-in-out_infinite]"
      )}
    >
      {initials(name)}
    </div>
  );
}
