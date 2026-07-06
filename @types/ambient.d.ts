declare module 'https://*';

interface BluetoothLEScanFilter {
  name?: string;
  namePrefix?: string;
  services?: BluetoothServiceUUID[];
}

type BluetoothServiceUUID = number | string;

interface BluetoothDevice extends EventTarget {
  readonly id?: string;
  readonly name?: string;
}

interface BluetoothRemoteGATTServer {
  readonly connected?: boolean;
}
