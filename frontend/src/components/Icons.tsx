import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Icon = ({ size = 16, children, ...rest }: IconProps) => (
  <svg
    className="ico"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const Instagram = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="3" />
    <circle cx="8" cy="8" r="2.5" />
    <circle cx="11.3" cy="4.7" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);

export const XSocial = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l10 10M13 3 3 13" />
  </Icon>
);

export const LinkedIn = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
    <path d="M5 7v4M5 5v.01M8 11V7M8 9c0-1 .5-2 2-2s2 1 2 2v2" />
  </Icon>
);

export const Facebook = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
    <path d="M10 5H9c-.5 0-1 .3-1 1v2H6.5M6.5 10H10" />
  </Icon>
);

export const Sparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
    <path d="M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5" />
  </Icon>
);

export const Save = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3h8l2 2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M5 3v3.5h5V3M5 14v-4h6v4" />
  </Icon>
);

export const Heart = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

export const Comment = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const PaperSend = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

export const Bookmark = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Icon>
);

export const Repost = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Icon>
);

export const MoreHoriz = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

export const Globe = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 14} height={p.size ?? 14}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);

export const ThumbsUp = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </Icon>
);
