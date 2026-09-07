
'use client'

import Image from 'next/image'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import styles from './Header.module.css'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  /* =========================================================
     CONTROLE DA ROLAGEM
     ========================================================= */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }

    handleScroll()

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  /* =========================================================
     CONTROLE DO BODY NO MENU MOBILE
     ========================================================= */

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  /* =========================================================
     AÇÕES
     ========================================================= */

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const toggleMenu = () => {
    setMenuOpen((current) => !current)
  }

  return (
    <header
      className={`${styles.header} ${
        scrolled ? styles.headerScrolled : ''
      }`}
    >
      {/* =====================================================
          MARCA
         ===================================================== */}

      <a
        href="#inicio"
        className={styles.logo}
        onClick={closeMenu}
        aria-label="Belo Cão — início"
      >
        <span className={styles.logoImage}>
          <Image
            src="/images/logo-header.jpg"
            alt="Logo Belo Cão Estética Animal"
            fill
            priority
            sizes="(max-width: 390px) 102px, (max-width: 600px) 122px, (max-width: 900px) 136px, 150px"
            style={{
              objectFit: 'contain',
              objectPosition: 'center',
            }}
          />
        </span>
      </a>

      {/* =====================================================
          NAVEGAÇÃO
         ===================================================== */}

      <nav
        id="main-navigation"
        className={`${styles.nav} ${
          menuOpen ? styles.navOpen : ''
        }`}
        aria-label="Navegação principal"
      >
        <a
          href="#especialidades"
          onClick={closeMenu}
        >
          <span>Cuidar</span>
        </a>

        <a
          href="#sobre"
          onClick={closeMenu}
        >
          <span>Sobre</span>
        </a>

        <a
          href="#experiencia"
          onClick={closeMenu}
        >
          <span>Experiência</span>
        </a>

        <a
          href="#localizacao"
          onClick={closeMenu}
        >
          <span>Onde estamos</span>
        </a>
      </nav>

      {/* =====================================================
          AGENDAR
         ===================================================== */}

      <a
        href="https://wa.me/5512991361808"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.schedule}
        aria-label="Agendar atendimento pelo WhatsApp"
      >
        <span>Agendar</span>

        <ArrowUpRight
          aria-hidden="true"
          size={17}
          strokeWidth={2.2}
        />
      </a>

      {/* =====================================================
          MENU MOBILE
         ===================================================== */}

      <button
        type="button"
        className={`${styles.mobileToggle} ${
          menuOpen ? styles.mobileToggleOpen : ''
        }`}
        onClick={toggleMenu}
        aria-label={
          menuOpen
            ? 'Fechar menu'
            : 'Abrir menu'
        }
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
      >
        {menuOpen ? (
          <X
            aria-hidden="true"
            size={20}
            strokeWidth={2.2}
          />
        ) : (
          <Menu
            aria-hidden="true"
            size={21}
            strokeWidth={2.2}
          />
        )}
      </button>
    </header>
  )
}
