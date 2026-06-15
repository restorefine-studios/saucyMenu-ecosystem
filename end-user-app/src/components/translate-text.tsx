import { useEffect, useState } from 'react'

const TranslateText = ({ children }: { children: string }) => {
  const [translated, setTranslated] = useState<string>(children)

  useEffect(() => {
    const translate = async () => {
      const TARGET_LANG = localStorage.getItem('i18nextLng') ?? 'EN'

      if (
        TARGET_LANG.toUpperCase() === 'EN' ||
        TARGET_LANG.toUpperCase() === 'HI' ||
        !children
      ) {
        setTranslated(children)
        return
      }

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: children, target_lang: TARGET_LANG }),
        })

        if (!res.ok) throw new Error('Translation failed')
        const data = await res.json()
        setTranslated(data.translations[0].text)
      } catch (err) {
        console.error('❌ Error:', err)
      }
    }

    translate()
  }, [children])

  return <>{translated}</>
}

export default TranslateText
