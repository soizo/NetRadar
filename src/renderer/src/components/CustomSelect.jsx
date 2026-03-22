import { useEffect, useId, useRef, useState } from 'react'

export default function CustomSelect({ value, onChange, options = [], disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listboxId = useId()
  const selected = options.find((option) => option.value === value) || options[0] || null

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function commit(nextValue) {
    if (nextValue !== value) onChange(nextValue)
    setOpen(false)
  }

  function handleButtonKeyDown(event) {
    const currentIndex = Math.max(0, options.findIndex((option) => option.value === value))

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const next = options[Math.min(options.length - 1, currentIndex + 1)]
      if (next) commit(next.value)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const next = options[Math.max(0, currentIndex - 1)]
      if (next) commit(next.value)
    }
  }

  return (
    <div ref={rootRef} className={`xp-select ${open ? 'xp-select--open' : ''} ${disabled ? 'xp-select--disabled' : ''}`}>
      <button
        type="button"
        className="xp-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="xp-select__value">{selected?.label || ''}</span>
        <span className="xp-select__caret" aria-hidden="true">▼</span>
      </button>

      {open && !disabled && (
        <div className="xp-select__menu" role="listbox" id={listboxId}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`xp-select__option ${option.value === value ? 'xp-select__option--selected' : ''}`}
              onClick={() => commit(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
