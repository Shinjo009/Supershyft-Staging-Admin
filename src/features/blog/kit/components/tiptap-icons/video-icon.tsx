import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const VideoIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 6C2 4.89543 2.89543 4 4 4H14C15.1046 4 16 4.89543 16 6V8.382L19.4472 6.10557C20.2174 5.59158 21.25 6.14248 21.25 7.07295V16.927C21.25 17.8575 20.2174 18.4084 19.4472 17.8944L16 15.618V18C16 19.1046 15.1046 20 14 20H4C2.89543 20 2 19.1046 2 18V6ZM14 6H4V18H14V6ZM16 13.382L19.25 15.549V8.451L16 10.618V13.382Z"
        fill="currentColor"
      />
    </svg>
  )
})

VideoIcon.displayName = "VideoIcon"
