import { useEffect } from 'react'
import type { Theme } from '../types'

const THEME_STORAGE_KEY = 'wotfit-theme'

export function useTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) {
      void error
    }

    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'light' ? '#fafafa' : '#09090b')

    const statusBar = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    )
    statusBar?.setAttribute(
      'content',
      theme === 'light' ? 'default' : 'black-translucent',
    )
  }, [theme])
}
