// CONTROLLER: one-shot, permission-gated device location. No storage or network
// request is performed by SideQuest. Never request GPS before a user action.
import type { DeviceCoordinates } from './campusMapLinks'

export type DeviceLocationResult =
  | { status: 'ready'; coordinates: DeviceCoordinates }
  | { status: 'error'; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout' }

type GeolocationPort = Pick<Geolocation, 'getCurrentPosition'>

export function requestDeviceLocation(device?: GeolocationPort): Promise<DeviceLocationResult> {
  const geolocation = device ?? (typeof navigator !== 'undefined' ? navigator.geolocation : undefined)
  if (!geolocation) return Promise.resolve({ status: 'error', reason: 'unsupported' })
  return new Promise(resolve => {
    try {
      geolocation.getCurrentPosition(
        result => {
          const { latitude, longitude } = result.coords
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
              latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            resolve({ status: 'error', reason: 'unavailable' })
            return
          }
          resolve({ status: 'ready', coordinates: { latitude, longitude } })
        },
        error => {
          resolve({
            status: 'error',
            reason: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
          })
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      )
    } catch {
      resolve({ status: 'error', reason: 'unavailable' })
    }
  })
}
