export function useAudioAlerts() {
  const audioMap: Record<string, string> = {
    'SUCCESS': '/audio/success.mp3',
    'MISSING_CEDULA': '/audio/error_generic.mp3',
    'DINER_NOT_FOUND': '/audio/diner_not_found.mp3',
    'NO_APPROVED_REQUEST': '/audio/no_approved_request.mp3',
    'NO_REQUEST_FOR_ACTIVE_SHIFT': '/audio/no_approved_request.mp3',
    'WRONG_DINING_ROOM': '/audio/wrong_dining_room.mp3',
    'MASSIVE_REQUEST': '/audio/wrong_dining_room.mp3',
    'OUT_OF_SCHEDULE': '/audio/out_of_schedule.mp3',
    'ALREADY_DISPATCHED': '/audio/already_dispatched.mp3',
    'FINGERPRINT_NO_MATCH': '/audio/fingerprint_no_match.mp3',
    'GENERIC_ERROR': '/audio/error_generic.mp3'
  }

  let currentAudio: HTMLAudioElement | null = null

  function playAlert(code: string) {
    if (typeof window === 'undefined') return // SSR safety

    // Detener audio anterior si estuviera sonando
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
    }

    const audioPath = audioMap[code] || audioMap['GENERIC_ERROR']
    
    currentAudio = new Audio(audioPath)
    
    // Capturamos el error (ej: si el archivo no existe a�n) para que no rompa el hilo de ejecuci�n
    currentAudio.play().catch(e => {
      console.warn('No se pudo reproducir el audio para el c�digo ' + code + ' (' + audioPath + '):', e)
    })
  }

  return {
    playAlert
  }
}
