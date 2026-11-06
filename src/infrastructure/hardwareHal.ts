/**
 * ApexPOS Enterprise - Hardware Abstraction Layer (HAL)
 * Provides unified interface for Barcode Scanners, Thermal Printers, Cash Drawers, and Customer Displays.
 * Includes Web Audio synthesized acoustic feedback for desktop simulation.
 */

export interface ThermalReceiptPayload {
  storeName: string;
  storeTaxNumber: string;
  invoiceNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: string;
    total: string;
  }>;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  payments: Array<{ method: string; amount: string }>;
  change: string;
  qrPayload: string;
}

class SoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Barcode scanner confirmation beep (2600Hz high pitch chirp, 45ms)
   */
  playScannerBeep() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Cash drawer solenoid pulse & mechanical chime ("Ka-Ching")
   */
  playDrawerKick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Solenoid mechanical clack
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(120, t);
      clickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      clickGain.gain.setValueAtTime(0.3, t);
      clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(t);
      clickOsc.stop(t + 0.08);

      // Bell chime
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(1800, t + 0.04);
      bellGain.gain.setValueAtTime(0.2, t + 0.04);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      bellOsc.connect(bellGain);
      bellGain.connect(this.ctx.destination);
      bellOsc.start(t + 0.04);
      bellOsc.stop(t + 0.6);
    } catch {
      // Fallback
    }
  }

  /**
   * Thermal printer stepper motor print chirp
   */
  playPrinterFeed() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(750, t + 0.06);
      osc.frequency.setValueAtTime(500, t + 0.12);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Fallback
    }
  }
}

export const hardwareSounds = new SoundEngine();

export class HardwareAbstractionLayer {
  private static customerDisplayLine1 = 'WELCOME TO APEXPOS';
  private static customerDisplayLine2 = 'READY FOR NEXT ORDER';

  static kickCashDrawer(): { commandHex: string; success: boolean } {
    hardwareSounds.playDrawerKick();
    // ESC p 0 25 250 (Standard Epson ESC/POS drawer kick command)
    return {
      commandHex: '1B 70 00 19 FA',
      success: true,
    };
  }

  static printThermalReceipt(receipt: ThermalReceiptPayload): { success: boolean; byteLength: number } {
    hardwareSounds.playPrinterFeed();
    const simulatedEscPos = `\x1B@\x1Ba1${receipt.storeName}\n${receipt.storeTaxNumber}\n\x1Ba0INV: ${receipt.invoiceNumber}\n${receipt.date}\n--------------------------------\n${receipt.items.map(i => `${i.name.padEnd(20)} x${i.qty}  ${i.total}`).join('\n')}\n--------------------------------\nTOTAL: ${receipt.total}\n\x1DV1`;
    return {
      success: true,
      byteLength: simulatedEscPos.length,
    };
  }

  static updateCustomerDisplay(line1: string, line2: string): void {
    this.customerDisplayLine1 = line1.slice(0, 20).padEnd(20);
    this.customerDisplayLine2 = line2.slice(0, 20).padEnd(20);
  }

  static getCustomerDisplay(): { line1: string; line2: string } {
    return {
      line1: this.customerDisplayLine1,
      line2: this.customerDisplayLine2,
    };
  }
}
