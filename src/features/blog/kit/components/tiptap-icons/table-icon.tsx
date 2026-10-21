import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableIcon = memo(function TableIcon(props: SvgProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M3 15h18M9 4v16M15 4v16" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
})
