import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import type { ComponentProps, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogContent({ className, ...props }: ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4">
        <DialogPrimitive.Popup
          className={cn(
            'relative flex max-h-full min-h-0 w-[calc(100%-2rem)] max-w-lg flex-col gap-4 overflow-hidden rounded-xl border border-[#e1e4e9] bg-white p-6 text-[#242932] shadow-lg outline-none transition-[scale,opacity] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0',
            className,
          )}
          {...props}
        />
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

function DialogScrollArea({
  className,
  children,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn('relative flex min-h-0 flex-auto overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="min-h-0 flex-auto overflow-y-auto overscroll-contain outline-none">
        <ScrollAreaPrimitive.Content className="flex flex-col">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className="pointer-events-none flex w-2 justify-center bg-black/5 opacity-0 transition-opacity data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100">
        <ScrollAreaPrimitive.Thumb className="w-full rounded-full bg-[#c2c7d0]" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 text-left', className)} {...props} />
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2', className)} {...props} />
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold tracking-[-0.02em] text-[#242932]', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm leading-5 text-[#858e9d]', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogScrollArea,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
