export class Config {
  /**
   * Nome da loja
   */
  static readonly STORE_NAME =
    process.env.NEXT_PUBLIC_STORE_NAME || 'Belo Cão'

  /**
   * Número oficial do WhatsApp
   *
   * Formato esperado:
   * 5512997093459
   */
  static readonly WHATSAPP_NUMBER =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || ''

  /**
   * Endereço da loja para retirada
   */
  static readonly STORE_ADDRESS =
    process.env.NEXT_PUBLIC_STORE_ADDRESS || ''

  /**
   * Instagram da loja
   */
  static readonly INSTAGRAM_URL =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL || ''
}