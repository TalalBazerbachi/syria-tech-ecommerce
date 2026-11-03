import React from "react"

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "placeholder"
> & {
  label: string
  name: string
}

/** Floating-label textarea matching `Input`. */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ name, label, required, rows = 3, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current!)

    return (
      <div className="flex flex-col w-full">
        <div className="flex relative z-0 w-full txt-compact-medium">
          <textarea
            name={name}
            id={name}
            placeholder=" "
            required={required}
            rows={rows}
            className="pt-5 pb-2 block w-full px-4 mt-0 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover resize-y"
            {...props}
            ref={innerRef}
          />
          <label
            htmlFor={name}
            onClick={() => innerRef.current?.focus()}
            className="flex items-center justify-center mx-3 px-1 transition-all absolute duration-300 top-3 -z-1 origin-0 text-ui-fg-subtle"
          >
            {label}
            {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export default Textarea
