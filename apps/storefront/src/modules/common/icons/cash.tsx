import React from "react"

import { IconProps } from "types/icon"

/** Banknotes — cash on delivery. */
const Cash: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...attributes}
    >
      <rect
        x="1.75"
        y="5.25"
        width="16.5"
        height="9.5"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.25" stroke={color} strokeWidth="1.5" />
      <path d="M4.5 8v4M15.5 8v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default Cash
