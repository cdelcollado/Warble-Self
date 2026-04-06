/**
 * Class for managing the radio connection via the Web Serial API.
 * Supports common chips used in programming cables such as Prolific PL2303, FTDI or CP2102.
 */
export class SerialConnection {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  // Optional callback to reactively notify state changes or incoming data
  public onDataCallback: ((data: Uint8Array) => void) | null = null;

  // Synchronous-style read emulation
  private receiveBuffer: number[] = [];
  private waitingForBytes: { count: number, resolve: (data: Uint8Array) => void, reject: (err: Error) => void, timeoutId: any } | null = null;

  async requestPort(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API is not supported in this browser.');
      }
      this.port = await navigator.serial.requestPort({});
      return true;
    } catch (error) {
      console.error('Error requesting serial port:', error);
      return false;
    }
  }

  async connect(baudRate: number = 9600): Promise<void> {
    if (!this.port) throw new Error("No port selected.");

    await this.port.open({ baudRate });

    if (this.port.readable) {
      this.reader = this.port.readable.getReader();
      this.readLoop();
    }

    if (this.port.writable) {
      this.writer = this.port.writable.getWriter();
    }
  }

  private async readLoop() {
    if (!this.reader) return;

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          if (this.onDataCallback) this.onDataCallback(value);
          for(let i=0; i<value.length; i++) {
            this.receiveBuffer.push(value[i]);
          }
          this.checkWaitingBytes();
        }
      }
    } catch (error) {
      console.error('Serial port read error:', error);
    } finally {
      if(this.reader) this.reader.releaseLock();
    }
  }

  private checkWaitingBytes() {
    if (this.waitingForBytes && this.receiveBuffer.length >= this.waitingForBytes.count) {
      clearTimeout(this.waitingForBytes.timeoutId);
      const data = new Uint8Array(this.receiveBuffer.splice(0, this.waitingForBytes.count));
      const resolve = this.waitingForBytes.resolve;
      this.waitingForBytes = null;
      resolve(data);
    }
  }

  /**
   * Reads exactly 'count' bytes, blocking until they arrive or a TIMEOUT occurs.
   */
  readBytes(count: number, timeoutMs: number = 2000): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      // If the data is already in the buffer
      if (this.receiveBuffer.length >= count) {
        resolve(new Uint8Array(this.receiveBuffer.splice(0, count)));
        return;
      }
      // Prevent race conditions if another read is already pending
      if (this.waitingForBytes) {
        reject(new Error("Another serial read is already pending"));
        return;
      }
      const timeoutId = setTimeout(() => {
        this.waitingForBytes = null;
        reject(new Error(`Timeout waiting for ${count} bytes from radio.`));
      }, timeoutMs);

      this.waitingForBytes = { count, resolve, reject, timeoutId };
    });
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('Port is not ready for writing.');
    await this.writer.write(data);
  }

  clearBuffer() {
    this.receiveBuffer = [];
    if(this.waitingForBytes) {
      clearTimeout(this.waitingForBytes.timeoutId);
      this.waitingForBytes.reject(new Error("Buffer cleared"));
      this.waitingForBytes = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reader) {
      try { await this.reader.cancel(); } catch { /* ignore */ }
      this.reader = null;
    }
    if (this.writer) {
      try { await this.writer.close(); } catch { /* ignore */ }
      this.writer = null;
    }
    if (this.port) {
      try { await this.port.close(); } catch { /* ignore */ }
      // Intentionally not setting this.port = null so the user can reopen it.
    }
    // Clear any residual buffer
    this.receiveBuffer = [];
  }

  isConnected(): boolean {
    return this.port !== null && this.reader !== null;
  }
}
