'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Lang, DEFAULT_LANG, LANGUAGES, t as translate, type TranslationKey } from './translations'

type LanguageContextType = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: string }) {
  const [lang, setLangState] = useState<Lang>(
    (initialLang && initialLang in LANGUAGES ? initialLang : DEFAULT_LANG) as Lang
  )

  useEffect(() => {
    const cookie = document.cookie.match(/(?:^|; )lang=([^;]+)/)?.[1]
    if (cookie && cookie in LANGUAGES) setLangState(cookie as Lang)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (key: TranslationKey) => translate(lang, key) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
