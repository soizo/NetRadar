import React, { useEffect, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import appIcon from '../../../../resources/icon.png'

export default function TitleBar({ appTitle = 'NetRadar' }) {
  const { t } = useT()
  const [isMaximized, setIsMaximized] = useState(false)
  const api = window.api || {}

  const TITLEBAR_ICONS = {
    minimize: '\uF030',
    maximize: '\uF031',
    restore: '\uF032',
    close: '\uF072'
  }

  useEffect(() => {
    let unsubscribe = null

    async function syncWindowState() {
      if (!api.getWindowState) return

      const state = await api.getWindowState()
      setIsMaximized(Boolean(state?.isMaximized))
    }

    syncWindowState()

    if (api.onWindowStateChange) {
      unsubscribe = api.onWindowStateChange((state) => {
        setIsMaximized(Boolean(state?.isMaximized))
      })
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [api])

  function handleMinimize() {
    if (api.windowMinimize) api.windowMinimize()
  }

  function handleMaximize() {
    if (api.windowMaximize) api.windowMaximize()
  }

  function handleClose() {
    if (api.windowClose) api.windowClose()
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    if (e.target.closest('.titlebar-controls')) return

    const startMouseX = e.screenX
    const startMouseY = e.screenY
    const startWinX   = window.screenX
    const startWinY   = window.screenY

    function onMouseMove(me) {
      const dx = me.screenX - startMouseX
      const dy = me.screenY - startMouseY
      if (api.windowSetPosition) api.windowSetPosition(startWinX + dx, startWinY + dy)
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const controls = (
    <div className="titlebar-controls">
      <button
        className="titlebar-btn titlebar-btn--minimize"
        onClick={handleMinimize}
        title={t('tb_minimize')}
        aria-label={t('tb_minimize')}
      >
        <span className="titlebar-btn-icon">{TITLEBAR_ICONS.minimize}</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--maximize"
        onClick={handleMaximize}
        title={isMaximized ? t('tb_restore') : t('tb_maximize')}
        aria-label={isMaximized ? t('tb_restore') : t('tb_maximize')}
      >
        <span className="titlebar-btn-icon">{isMaximized ? TITLEBAR_ICONS.restore : TITLEBAR_ICONS.maximize}</span>
      </button>
      <button
        className="titlebar-btn titlebar-btn--close"
        onClick={handleClose}
        title={t('tb_close')}
        aria-label={t('tb_close')}
      >
        <span className="titlebar-btn-icon">{TITLEBAR_ICONS.close}</span>
      </button>
    </div>
  )

  return (
    <div className="titlebar titlebar--win" onMouseDown={handleMouseDown} onDoubleClick={handleMaximize}>
      <div className="titlebar-brand">
        <img className="titlebar-app-icon" src={appIcon} alt="" aria-hidden="true" />
        <span className="titlebar-title">{appTitle}</span>
      </div>
      {controls}
    </div>
  )
}
