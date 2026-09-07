
'use client'

import { Config } from '@/app/constants/config'
import styles from './WhatsAppFloat.module.css'

export function WhatsAppFloat() {
  return (
    <a
      href={Config.WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.whatsappFloat}
      aria-label="Falar com o Belo Cão pelo WhatsApp"
    >
      <span className={styles.whatsappMessage}>
        Posso ajudar?
      </span>

      <span className={styles.whatsappButton}>
        <svg
          className={styles.whatsappIcon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 2C6.486 2 2 6.486 2 12c0 1.76.456 3.413 1.252 4.882L2.06 21.94l5.184-1.162A9.95 9.95 0 0 0 12 22c5.514 0 10-4.486 10-10S17.514 2 12 2Zm0 18.25a8.23 8.23 0 0 1-4.196-1.148l-.3-.178-3.077.69.7-3.003-.196-.31A8.23 8.23 0 1 1 12 20.25Zm4.52-6.175c-.247-.124-1.46-.72-1.685-.802-.226-.083-.39-.124-.555.124-.165.247-.638.802-.782.967-.144.165-.288.186-.535.062-.247-.124-1.043-.384-1.986-1.226-.734-.655-1.23-1.465-1.374-1.712-.144-.247-.015-.38.109-.503.111-.11.247-.288.37-.432.124-.144.165-.247.247-.412.083-.165.042-.309-.02-.433-.062-.124-.555-1.338-.761-1.832-.2-.481-.404-.416-.555-.424l-.473-.008c-.165 0-.432.062-.658.309-.226.247-.864.844-.864 2.057s.885 2.387 1.008 2.552c.124.165 1.741 2.658 4.218 3.727.59.255 1.05.407 1.409.521.592.188 1.131.162 1.558.098.475-.071 1.46-.597 1.666-1.173.206-.577.206-1.07.144-1.173-.062-.103-.226-.165-.473-.288Z"
          />
        </svg>
      </span>
    </a>
  )
}

