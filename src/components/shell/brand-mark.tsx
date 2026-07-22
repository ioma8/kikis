interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className = 'size-7' }: BrandMarkProps) {
  return (
    <img
      src="/icon-kikis.png"
      alt=""
      aria-hidden="true"
      className={`shrink-0 rounded-[9px] object-cover ${className}`}
    />
  )
}

interface BrandWordmarkProps {
  className?: string
}

export function BrandWordmark({ className = 'h-7 w-20' }: BrandWordmarkProps) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden ${className}`}>
      <img src="/kikis-full.png" alt="kikis" className="size-full object-cover object-center" />
    </span>
  )
}
