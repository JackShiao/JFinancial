import { useState, useEffect } from 'react'
import './BackToTopButton.css'

function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      className={`back-to-top-btn${visible ? ' visible' : ''}`}
      onClick={handleClick}
      aria-label="回到頂端"
      title="回到頂端"
    >
      <i className="bi bi-arrow-up" />
    </button>
  )
}

export default BackToTopButton
