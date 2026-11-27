import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Filter, Home, Zap } from 'lucide-react'
import SelectDropdown, { type SelectOption } from '../SelectDropdown'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('SelectDropdown', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    document.body.innerHTML = ''
  })

  const memberOptions: SelectOption[] = [
    { value: 'all', label: 'All Members' },
    { value: 'u1', label: 'Arafat Jim' },
    { value: 'u2', label: 'Forhad Parvez' },
    { value: 'u3', label: 'Siam', disabled: true },
  ]

  it('opens listbox on click, highlights selected option with sage style, and notifies onChange', () => {
    const onChange = vi.fn()

    act(() => {
      root.render(
        <SelectDropdown
          ariaLabel="Filter by member"
          leadingIcon={Filter}
          options={memberOptions}
          value="all"
          onChange={onChange}
        />
      )
    })

    const trigger = container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement
    expect(trigger).not.toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent).toContain('All Members')
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    act(() => {
      trigger.click()
    })

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement
    expect(listbox).not.toBeNull()

    const options = Array.from(listbox.querySelectorAll('[role="option"]')) as HTMLButtonElement[]
    expect(options).toHaveLength(4)
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[0].className).toContain('bg-nex-primary-light')
    expect(options[3].disabled).toBe(true)

    act(() => {
      options[1].click()
    })

    expect(onChange).toHaveBeenCalledWith('u1')
  })

  it('renders placeholder when no option matches and displays option icons cleanly', () => {
    const iconOptions: SelectOption[] = [
      { value: 'rent', label: 'House Rent', icon: Home, iconBgClass: 'bg-nex-primary-light' },
      { value: 'electricity', label: 'Electricity Bill', icon: Zap, iconBgClass: 'bg-amber-50' },
    ]

    act(() => {
      root.render(
        <SelectDropdown
          placeholder="Select category"
          options={iconOptions}
          value=""
          onChange={() => {}}
        />
      )
    })

    const trigger = container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement
    expect(trigger.textContent).toContain('Select category')

    act(() => {
      root.render(
        <SelectDropdown
          placeholder="Select category"
          options={iconOptions}
          value="electricity"
          onChange={() => {}}
        />
      )
    })

    expect(trigger.textContent).toContain('Electricity Bill')
  })

  it('supports ArrowDown/Enter keyboard selection and stops Escape before parent window listeners', () => {
    const onChange = vi.fn()
    const parentEscapeSpy = vi.fn()
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') parentEscapeSpy(e)
    }
    window.addEventListener('keydown', handleWindowKeyDown)

    act(() => {
      root.render(
        <SelectDropdown
          ariaLabel="Member selector"
          options={memberOptions}
          value="all"
          onChange={onChange}
        />
      )
    })

    const trigger = container.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith('u1')

    act(() => {
      trigger.click()
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(parentEscapeSpy).not.toHaveBeenCalled()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    window.removeEventListener('keydown', handleWindowKeyDown)
  })
})
