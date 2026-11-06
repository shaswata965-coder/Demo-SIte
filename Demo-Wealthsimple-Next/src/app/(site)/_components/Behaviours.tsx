'use client'

import { useEffect } from 'react'

import { initScenes } from '../_lib/scenes'
import { initSite } from '../_lib/site'

/* Starts the page's behaviour once the server-rendered page has hydrated,
   and releases it on unmount. Renders nothing. */
export function Behaviours() {
  useEffect(() => {
    const site = initSite()
    const scenes = initScenes()
    return () => {
      site()
      scenes()
    }
  }, [])
  return null
}
