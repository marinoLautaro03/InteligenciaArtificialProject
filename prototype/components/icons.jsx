// Lightweight inline icon set — geometric, single-stroke, 16px viewbox
const Icon = ({ d, size = 16, fill = "none", stroke = "currentColor", strokeWidth = 1.6, className = "ico", children, ...rest }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children || <path d={d} />}
  </svg>
);

const Icons = {
  Plus: (p) => <Icon {...p} d="M8 3v10M3 8h10" />,
  Sparkle: (p) => <Icon {...p}><path d="M8 2v4M8 10v4M2 8h4M10 8h4"/><path d="M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5"/></Icon>,
  Folder: (p) => <Icon {...p} d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .8.4l.7.95a1 1 0 0 0 .8.4h4.1A1.5 1.5 0 0 1 14 6.25v5.25A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />,
  Layers: (p) => <Icon {...p}><path d="M8 2 1.5 5 8 8l6.5-3L8 2Z"/><path d="M1.5 8 8 11l6.5-3"/><path d="M1.5 11 8 14l6.5-3"/></Icon>,
  History: (p) => <Icon {...p}><path d="M8 4v4l2.5 1.5"/><circle cx="8" cy="8" r="6"/></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M14.4 4.5l-1.7 1M3.3 10.5l-1.7 1M14.4 11.5l-1.7-1M3.3 5.5l-1.7-1M15 8h-2M3 8H1"/></Icon>,
  Search: (p) => <Icon {...p}><circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3.2-3.2"/></Icon>,
  Copy: (p) => <Icon {...p}><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10V4a1 1 0 0 1 1-1h6"/></Icon>,
  Refresh: (p) => <Icon {...p}><path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4"/><path d="M12 1.5V4h-2.5M4 14.5V12h2.5"/></Icon>,
  Wand: (p) => <Icon {...p}><path d="M3 13 12 4M11 3l2 2M2 5l1.5.5L4 7l.5-1.5L6 5l-1.5-.5L4 3l-.5 1.5L2 5Z"/></Icon>,
  Download: (p) => <Icon {...p}><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5"/><path d="M2.5 12v1.5h11V12"/></Icon>,
  Trash: (p) => <Icon {...p}><path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4"/></Icon>,
  Check: (p) => <Icon {...p} d="m3 8 3.5 3.5L13 5" />,
  Save: (p) => <Icon {...p}><path d="M3 3h8l2 2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M5 3v3.5h5V3M5 14v-4h6v4"/></Icon>,
  Edit: (p) => <Icon {...p}><path d="M2 14h12"/><path d="m3 12 .5-2.5L10 3l2 2-6.5 6.5L3 12Z"/></Icon>,
  Image: (p) => <Icon {...p}><rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="6" cy="7" r="1.2"/><path d="m2 12 4-3.5 5 4 3-2"/></Icon>,
  Text: (p) => <Icon {...p}><path d="M3 4h10M3 8h10M3 12h6"/></Icon>,
  Eye: (p) => <Icon {...p}><path d="M1.5 8S3.5 4 8 4s6.5 4 6.5 4-2 4-6.5 4S1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/></Icon>,
  Code: (p) => <Icon {...p}><path d="m5 5-3 3 3 3M11 5l3 3-3 3"/></Icon>,
  ChevronRight: (p) => <Icon {...p} d="m6 3 5 5-5 5" />,
  ChevronDown: (p) => <Icon {...p} d="m3 6 5 5 5-5" />,
  Link: (p) => <Icon {...p}><path d="M9 5h2.5a2.5 2.5 0 0 1 0 5H9M7 5H4.5a2.5 2.5 0 0 0 0 5H7M5.5 7.5h5"/></Icon>,
  More: (p) => <Icon {...p}><circle cx="3.5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.5" cy="8" r="1" fill="currentColor"/></Icon>,
  X: (p) => <Icon {...p} d="m4 4 8 8M12 4l-8 8" />,
  Send: (p) => <Icon {...p} d="M2 8 14 2l-4 12-2-5-4-1Z" />,
  Heart: (p) => <Icon {...p} d="M8 13s-5-3.2-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 3.8-5 7-5 7Z" />,
  Comment: (p) => <Icon {...p} d="M3 4h10v6H8.5L5 13v-3H3V4Z" />,
  Repost: (p) => <Icon {...p}><path d="M4 5h7l-2-2M12 11H5l2 2"/></Icon>,
  Like: (p) => <Icon {...p}><path d="M5 14V8M5 8l3-6 1 1v3h4l-1 7H5"/></Icon>,
  Share: (p) => <Icon {...p}><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="m5.3 7 5.4-3M5.3 9l5.4 3"/></Icon>,
  // Brand glyphs (simplified geometric, not exact logos)
  Instagram: (p) => <Icon {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="3"/><circle cx="8" cy="8" r="2.5"/><circle cx="11.3" cy="4.7" r="0.6" fill="currentColor" stroke="none"/></Icon>,
  XSocial: (p) => <Icon {...p} d="M3 3l10 10M13 3 3 13" />,
  LinkedIn: (p) => <Icon {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M5 7v4M5 5v.01M8 11V7M8 9c0-1 .5-2 2-2s2 1 2 2v2"/></Icon>,
  Facebook: (p) => <Icon {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M10 5H9c-.5 0-1 .3-1 1v2H6.5M6.5 10H10"/></Icon>,
  Globe: (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/></Icon>,
};

window.Icons = Icons;
