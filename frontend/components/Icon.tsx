/** Thin line icons (24×24, 1.75 stroke) in the style of the desktop-app UI. */
const PATHS = {
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z M19 11a7 7 0 0 1-14 0 M12 18v3",
  stop: "M7 7h10v10H7z",
  plus: "M12 5v14 M5 12h14",
  home: "M3 10.5 12 3l9 7.5 M5.5 9v11h13V9",
  sidebar: "M3 5h18v14H3z M9 5v14",
  sun: "M12 4V2 M12 22v-2 M4.9 4.9 3.5 3.5 M20.5 20.5l-1.4-1.4 M4 12H2 M22 12h-2 M4.9 19.1l-1.4 1.4 M20.5 3.5l-1.4 1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  inbox: "M3 13h5l1.5 3h5l1.5-3h5 M5 5h14l2 8v6H3v-6l2-8Z",
  cpu: "M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  doc: "M7 3h7l4 4v14H7z M14 3v4h4 M9.5 12h6 M9.5 16h6",
  folder: "M3 6h6l2 2h10v11H3z",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12 M18 6 6 18",
  bag: "M5 8h14l-1 13H6L5 8Z M9 8V6a3 3 0 0 1 6 0v2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  message: "M4 5h16v11H8l-4 4V5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  terminal: "M4 5h16v14H4z M7.5 9.5l3 2.5-3 2.5 M12.5 15h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20a7.5 7.5 0 0 1 15 0",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9 M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  speaker: "M4 9.5h3.5L12 5.5v13l-4.5-4H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11",
  refresh: "M20 11a8 8 0 0 0-14.5-4.5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.5 4.5L20 16 M20 20v-4h-4",
  briefcase: "M3 8h18v12H3z M8 8V5h8v3 M3 13h18",
  calendar: "M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M3 20h18",
  wallet: "M3 7h16v13H3z M3 7l12-4v4 M15 13.5h3",
  logout: "M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M21 21l-5-5",
  clipboard: "M8 4h8v3H8z M6 5H5v16h14V5h-1 M9 13l2 2 4-4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4",
  send: "M4 12l16-8-6 16-2-7-8-1Z",
  edit: "M4 20h4L19 9l-4-4L4 16v4Z M13.5 6.5l4 4",
  mail: "M3 5h18v14H3z M3 6l9 7 9-7",
  back: "M19 12H5 M11 6l-6 6 6 6",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  lock: "M6 11h12v10H6z M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18 M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9 M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name].split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}
