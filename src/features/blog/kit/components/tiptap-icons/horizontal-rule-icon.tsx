import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const HorizontalRuleIcon = memo(function HorizontalRuleIcon(props: SvgProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
})
