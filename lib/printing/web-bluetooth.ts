/**
 * Web Bluetooth client for ESC/POS thermal printers.
 *
 * Uses the standard "Serial Port Profile (SPP) over BLE" pattern:
 * a writable characteristic on a printer-specific service. Most cheap
 * thermal printers expose 0xFFE0 / 0xFFE1; some use the Nordic UART
 * service. We try a list of well-known services.
 */

const KNOWN_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / common BLE-UART bridge
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
]

export type BluetoothPrinter = {
  device: BluetoothDevice
  characteristic: BluetoothRemoteGATTCharacteristic
}

let cached: BluetoothPrinter | null = null

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

export async function connectBluetoothPrinter(): Promise<BluetoothPrinter> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser')
  }

  // Disconnect previous
  if (cached?.device.gatt?.connected) {
    cached.device.gatt.disconnect()
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: KNOWN_SERVICES.map((s) => ({ services: [s] })),
    optionalServices: KNOWN_SERVICES,
  })

  if (!device.gatt) throw new Error('Selected device does not expose GATT')

  const server = await device.gatt.connect()

  // Find a writable characteristic on any of the known services
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null
  for (const serviceUuid of KNOWN_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid)
      const chars = await service.getCharacteristics()
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse
      )
      if (writable) {
        characteristic = writable
        break
      }
    } catch {
      // service not present, try next
    }
  }

  if (!characteristic) {
    throw new Error('No writable characteristic found on this printer')
  }

  cached = { device, characteristic }
  return cached
}

export function getCachedPrinter(): BluetoothPrinter | null {
  if (cached?.device.gatt?.connected) return cached
  return null
}

export async function printBytes(bytes: Uint8Array): Promise<void> {
  if (!cached) {
    throw new Error('No printer connected')
  }
  if (!cached.device.gatt?.connected) {
    await cached.device.gatt?.connect()
  }

  // BLE characteristics typically cap at 20 bytes per write — chunk it
  const CHUNK = 20
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK)
    if (cached.characteristic.properties.writeWithoutResponse) {
      await cached.characteristic.writeValueWithoutResponse(slice)
    } else {
      await cached.characteristic.writeValueWithResponse(slice)
    }
  }
}
