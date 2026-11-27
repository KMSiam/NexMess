import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  icon?: LucideIcon
  iconBgClass?: string
  iconTextClass?: string
  disabled?: boolean
}

interface SelectDropdownProps<T extends string = string> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  placeholder?: string
  leadingIcon?: LucideIcon
  id?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  required?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  triggerClassName?: string
  menuClassName?: string
}

interface MenuCoords {
  top: number
  left: number
  minWidth: number
  maxWidth: number
  maxHeight: number
  placement: 'top' | 'bottom'
}

function findNextEnabledIndex<T extends string>(
  options: SelectOption<T>[],
  startIndex: number,
  step: 1 | -1
): number {
  if (options.length === 0) return -1
  for (let offset = 0; offset < options.length; offset++) {
    const idx = (startIndex + step * offset + options.length) % options.length
    if (!options[idx]?.disabled) return idx
  }
  return -1
}

export default function SelectDropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder,
  leadingIcon: LeadingIcon,
  id,
  ariaLabel,
  ariaLabelledBy,
  required = false,
  disabled = false,
  size = 'md',
  className = '',
  triggerClassName = '',
  menuClassName = '',
}: SelectDropdownProps<T>) {
  const generatedId = useId()
  const triggerId = id || `select-trigger-${generatedId}`
  const listboxId = `select-listbox-${generatedId}`

  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [coords, setCoords] = useState<MenuCoords | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const typeAheadRef = useRef<{ query: string; timer: number | null }>({
    query: '',
    timer: null,
  })

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value),
    [options, value]
  )
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const SelectedOptionIcon = selectedOption?.icon

  const computeMenuCoords = useCallback((): MenuCoords | null => {
    const trigger = triggerRef.current
    if (!trigger) return null

    const rect = trigger.getBoundingClientRect()
    const viewportW = window.innerWidth || 1024
    const viewportH = window.innerHeight || 768
    const gap = 6
    const edgePadding = 8
    const spaceBelow = viewportH - rect.bottom - gap - edgePadding
    const spaceAbove = rect.top - gap - edgePadding
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.min(260, Math.max(120, openUpward ? spaceAbove : spaceBelow))
    const minWidth = Math.min(Math.max(rect.width, 190), viewportW - edgePadding * 2)
    const maxWidth = viewportW - edgePadding * 2
    const left = Math.min(
      Math.max(edgePadding, rect.left),
      Math.max(edgePadding, viewportW - minWidth - edgePadding)
    )
    const top = openUpward ? Math.max(edgePadding, rect.top - gap) : rect.bottom + gap

    return {
      top,
      left,
      minWidth,
      maxWidth,
      maxHeight,
      placement: openUpward ? 'top' : 'bottom',
    }
  }, [])

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false)
    setHighlightedIndex(-1)
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }, [])

  const openMenu = useCallback(
    (initialHighlightIndex?: number) => {
      if (disabled) return
      const nextCoords = computeMenuCoords()
      if (nextCoords) setCoords(nextCoords)
      const fallbackIndex =
        selectedIndex >= 0 && !options[selectedIndex]?.disabled
          ? selectedIndex
          : findNextEnabledIndex(options, 0, 1)
      setHighlightedIndex(
        initialHighlightIndex !== undefined ? initialHighlightIndex : fallbackIndex
      )
      setOpen(true)
    },
    [computeMenuCoords, disabled, options, selectedIndex]
  )

  const selectOption = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled) return
      onChange(option.value)
      closeMenu(true)
    },
    [closeMenu, onChange]
  )

  useEffect(() => {
    if (!open) return

    const handleReposition = () => {
      const nextCoords = computeMenuCoords()
      if (nextCoords) setCoords(nextCoords)
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu(false)
      }
    }

    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        closeMenu(true)
      }
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleCaptureKeyDown, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleCaptureKeyDown, true)
    }
  }, [closeMenu, computeMenuCoords, open])

  useEffect(() => {
    if (!open || highlightedIndex < 0) return
    optionRefs.current[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [highlightedIndex, open])

  useEffect(() => {
    const typeAhead = typeAheadRef.current
    return () => {
      if (typeAhead.timer !== null) {
        window.clearTimeout(typeAhead.timer)
      }
    }
  }, [])

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (!open) {
          openMenu()
        } else {
          const base = highlightedIndex >= 0 ? highlightedIndex + 1 : 0
          setHighlightedIndex(findNextEnabledIndex(options, base, 1))
        }
        return
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (!open) {
          openMenu()
        } else {
          const base = highlightedIndex >= 0 ? highlightedIndex - 1 : options.length - 1
          setHighlightedIndex(findNextEnabledIndex(options, base, -1))
        }
        return
      }
      case 'Home': {
        if (!open) return
        e.preventDefault()
        setHighlightedIndex(findNextEnabledIndex(options, 0, 1))
        return
      }
      case 'End': {
        if (!open) return
        e.preventDefault()
        setHighlightedIndex(findNextEnabledIndex(options, options.length - 1, -1))
        return
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (!open) {
          openMenu()
        } else if (highlightedIndex >= 0 && options[highlightedIndex]) {
          selectOption(options[highlightedIndex])
        } else {
          closeMenu(false)
        }
        return
      }
      case 'Tab': {
        if (open) closeMenu(false)
        return
      }
      default: {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const state = typeAheadRef.current
          if (state.timer !== null) window.clearTimeout(state.timer)
          state.query += e.key.toLowerCase()
          state.timer = window.setTimeout(() => {
            state.query = ''
            state.timer = null
          }, 500)

          const start = highlightedIndex >= 0 ? highlightedIndex + 1 : 0
          for (let offset = 0; offset < options.length; offset++) {
            const idx = (start + offset) % options.length
            const opt = options[idx]
            if (opt && !opt.disabled && opt.label.toLowerCase().startsWith(state.query)) {
              if (!open) {
                openMenu(idx)
              } else {
                setHighlightedIndex(idx)
              }
              break
            }
          }
        }
      }
    }
  }

  const triggerPadding = size === 'sm' ? 'px-3 py-2 text-sm' : 'px-3.5 py-2.5 text-sm'
  const activeDescendantId =
    open && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined

  const menuPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.div
                ref={menuRef}
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-activedescendant={activeDescendantId}
                initial={{
                  opacity: 0,
                  scale: 0.98,
                  y: coords.placement === 'top' ? 6 : -6,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.98,
                  y: coords.placement === 'top' ? 4 : -4,
                }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  minWidth: coords.minWidth,
                  maxWidth: coords.maxWidth,
                  maxHeight: coords.maxHeight,
                  transform: coords.placement === 'top' ? 'translateY(-100%)' : undefined,
                }}
                className={`bg-nex-surface border-nex-border z-[70] overflow-y-auto rounded-xl border p-1.5 shadow-xl shadow-black/10 dark:border-[#323238] dark:bg-[#1b1b1f] dark:shadow-black/50 ${menuClassName}`}
              >
                {options.map((opt, index) => {
                  const OptionIcon = opt.icon
                  const isSelected = opt.value === value
                  const isHighlighted = index === highlightedIndex

                  return (
                    <button
                      key={`${opt.value}-${index}`}
                      ref={(el) => {
                        optionRefs.current[index] = el
                      }}
                      id={`${listboxId}-opt-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIndex(index)
                      }}
                      onClick={() => selectOption(opt)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 focus:outline-none ${
                        opt.disabled
                          ? 'text-nex-muted cursor-not-allowed opacity-45'
                          : isSelected
                            ? `bg-nex-primary-light text-nex-primary-ink font-semibold ${
                                isHighlighted ? 'ring-nex-primary/25 ring-1' : ''
                              }`
                            : isHighlighted
                              ? 'bg-nex-hover text-nex-text'
                              : 'text-nex-text hover:bg-nex-hover'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {OptionIcon && (
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              opt.iconBgClass || 'bg-nex-elevated'
                            }`}
                          >
                            <OptionIcon
                              className={`h-3.5 w-3.5 ${opt.iconTextClass || 'text-nex-primary-ink'}`}
                            />
                          </span>
                        )}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && <Check className="text-nex-primary-ink h-4 w-4 shrink-0" />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          onInvalid={(e) => {
            e.preventDefault()
            openMenu()
            triggerRef.current?.focus()
          }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`nex-input flex items-center justify-between gap-2 text-left transition-all duration-150 ${triggerPadding} ${
          open ? 'border-nex-primary ring-nex-primary/15 ring-3' : ''
        } ${disabled ? 'bg-nex-elevated cursor-not-allowed opacity-55' : 'cursor-pointer'} ${triggerClassName}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {SelectedOptionIcon ? (
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                selectedOption?.iconBgClass || 'bg-nex-elevated'
              }`}
            >
              <SelectedOptionIcon
                className={`h-3.5 w-3.5 ${
                  selectedOption?.iconTextClass || 'text-nex-primary-ink'
                }`}
              />
            </span>
          ) : (
            LeadingIcon && <LeadingIcon className="text-nex-muted h-4 w-4 shrink-0" />
          )}
          <span
            className={`truncate text-sm ${
              selectedOption && selectedOption.value !== ''
                ? 'text-nex-text font-medium'
                : placeholder && !selectedOption
                  ? 'text-nex-muted'
                  : 'text-nex-text font-medium'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder || ''}
          </span>
        </span>
        <ChevronDown
          className={`text-nex-muted h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menuPortal}
    </div>
  )
}
