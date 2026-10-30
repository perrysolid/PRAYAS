import { useId } from "react";

/**
 * Sahayak's face: an original illustrated character in a teal-and-gold saree, greeting with namaste.
 * Drawn in SVG so it stays sharp at any size and weighs a few KB. She blinks, breathes, and
 * moves her lips while a reply is being read aloud. All motion stops under prefers-reduced-motion.
 */
export function SahayakAvatar({ size = 48, speaking = false, className = "" }: { size?: number; speaking?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      className={`avatar${speaking ? " is-speaking" : ""} ${className}`}
      viewBox="0 0 200 220"
      width={size}
      height={size * 1.1}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id("skin")} cx="45%" cy="38%" r="70%"><stop offset="0" stopColor="#F6D2B4" /><stop offset=".65" stopColor="#E8B48E" /><stop offset="1" stopColor="#C98E68" /></radialGradient>
        <radialGradient id={id("hand")} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#F3CBA9" /><stop offset="1" stopColor="#CF946C" /></radialGradient>
        <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C58A64" /><stop offset="1" stopColor="#DDA47C" /></linearGradient>
        <radialGradient id={id("hair")} cx="40%" cy="25%" r="80%"><stop offset="0" stopColor="#3B3B48" /><stop offset=".5" stopColor="#17171F" /><stop offset="1" stopColor="#08080C" /></radialGradient>
        <linearGradient id={id("teal")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2AA3A6" /><stop offset="1" stopColor="#11686E" /></linearGradient>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F1D58A" /><stop offset=".5" stopColor="#C9A24A" /><stop offset="1" stopColor="#9C7A2C" /></linearGradient>
        <radialGradient id={id("iris")} cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#8A5A34" /><stop offset=".7" stopColor="#4A2C16" /><stop offset="1" stopColor="#22140A" /></radialGradient>
        <clipPath id={id("eyeL")}><ellipse cx="81" cy="99" rx="11.5" ry="12.5" /></clipPath>
        <clipPath id={id("eyeR")}><ellipse cx="119" cy="99" rx="11.5" ry="12.5" /></clipPath>
      </defs>

      <g className="avatar__body">
        {/* braid over her right shoulder */}
        <g fill={url("hair")}>
          <path d="M56 100 C40 130 44 160 50 190 L62 188 C58 160 58 132 66 108Z" />
          <ellipse cx="56" cy="150" rx="9" ry="12" />
          <ellipse cx="54" cy="168" rx="8.5" ry="11" />
          <ellipse cx="55" cy="185" rx="8" ry="10" />
        </g>
        <ellipse cx="100" cy="86" rx="57" ry="58" fill={url("hair")} />

        {/* blouse, saree and pallu */}
        <path d="M22 220 C24 186 40 170 72 162 Q100 156 128 162 C160 170 176 186 178 220Z" fill={url("gold")} />
        <path d="M60 220 C62 190 74 170 92 162 L108 162 C126 170 138 190 140 220Z" fill={url("teal")} />
        <path d="M120 160 C140 162 156 170 166 182 L118 220 L84 220Z" fill={url("teal")} />
        <path d="M131 162 C146 166 156 172 162 180 L114 220 L100 220Z" fill={url("gold")} />
        <path d="M120 160 L84 220 L88 220 L123 161Z" fill="#E9C46A" />

        <path d="M86 128 L114 128 L116 158 C108 166 92 166 84 158Z" fill={url("neck")} />
        <ellipse cx="56" cy="100" rx="7" ry="10" fill="#E3AA82" />
        <ellipse cx="144" cy="100" rx="7" ry="10" fill="#E3AA82" />
        <circle cx="56" cy="113" r="3" fill={url("gold")} />
        <circle cx="144" cy="113" r="3" fill={url("gold")} />

        <g className="avatar__head">
          <path d="M100 42 C130 42 146 66 146 96 C146 124 126 146 100 146 C74 146 54 124 54 96 C54 66 70 42 100 42Z" fill={url("skin")} />
          <path d="M100 38 C70 36 50 56 50 90 C50 98 52 104 54 108 C56 86 66 66 98 56 L100 52Z" fill={url("hair")} />
          <path d="M100 38 C130 36 150 56 150 90 C150 98 148 104 146 108 C144 86 134 66 102 56 L100 52Z" fill={url("hair")} />
          <path d="M100 39 L100 54" stroke="#C87A7A" strokeWidth="1.2" opacity=".6" />

          <ellipse cx="74" cy="118" rx="9" ry="5.5" fill="#F08C8C" opacity=".28" />
          <ellipse cx="126" cy="118" rx="9" ry="5.5" fill="#F08C8C" opacity=".28" />
          <path d="M68 83 Q80 75 92 81" stroke="#1C1414" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M108 81 Q120 75 132 83" stroke="#1C1414" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="79" r="2.6" fill="#B3202A" />

          <g clipPath={url("eyeL")}>
            <ellipse cx="81" cy="99" rx="11.5" ry="12.5" fill="#fff" />
            <g className="avatar__gaze">
              <circle cx="82" cy="101" r="8.5" fill={url("iris")} />
              <circle cx="82" cy="101" r="4.2" fill="#0d0705" />
              <circle cx="85" cy="97" r="2.6" fill="#fff" />
              <circle cx="79.5" cy="104" r="1.2" fill="#fff" opacity=".8" />
            </g>
            <rect className="avatar__lid" x="68" y="86" width="26" height="27" fill="#E2A982" />
          </g>
          <g clipPath={url("eyeR")}>
            <ellipse cx="119" cy="99" rx="11.5" ry="12.5" fill="#fff" />
            <g className="avatar__gaze">
              <circle cx="118" cy="101" r="8.5" fill={url("iris")} />
              <circle cx="118" cy="101" r="4.2" fill="#0d0705" />
              <circle cx="121" cy="97" r="2.6" fill="#fff" />
              <circle cx="115.5" cy="104" r="1.2" fill="#fff" opacity=".8" />
            </g>
            <rect className="avatar__lid" x="106" y="86" width="26" height="27" fill="#E2A982" />
          </g>
          <path d="M68.5 95 Q81 84 93.5 94" stroke="#120c0a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M106.5 94 Q119 84 131.5 95" stroke="#120c0a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M69 95 l-3.5 -2.5 M131 95 l3.5 -2.5" stroke="#120c0a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M98 108 Q100 114 104 113" stroke="#B87650" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          <path className="avatar__smile" d="M90 124 Q100 131 110 124 Q100 127 90 124Z" fill="#B54A4A" stroke="#9A3A3A" strokeWidth="1.2" strokeLinejoin="round" />
          <ellipse className="avatar__mouth" cx="100" cy="126" rx="6" ry="4.5" fill="#7A2626" />
        </g>

        {/* namaste */}
        <g fill={url("hand")}>
          <path d="M93 190 C86 198 72 210 60 220 L82 220 C90 213 98 206 102 199Z" />
          <path d="M107 190 C114 198 128 210 140 220 L118 220 C110 213 102 206 98 199Z" />
          <path d="M100 152 C93 153 87 163 87 178 C87 189 91 197 100 201Z" />
          <path d="M100 152 C107 153 113 163 113 178 C113 189 109 197 100 201Z" />
        </g>
        <path d="M100 154 L100 200" stroke="#A8704C" strokeWidth="1.2" />
        <path d="M89 199 L83 207" stroke={url("gold")} strokeWidth="5" strokeLinecap="round" />
        <path d="M111 199 L117 207" stroke={url("gold")} strokeWidth="5" strokeLinecap="round" />
        <path d="M86 205 L80 213" stroke="#B3202A" strokeWidth="3" strokeLinecap="round" />
        <path d="M114 205 L120 213" stroke="#B3202A" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
