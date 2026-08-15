import { logger } from '../../../core/logger/index.js';

export type AutopilotMode = 'approval' | 'assisted' | 'autonomous';

export class AutopilotService {
  private currentMode: AutopilotMode = 'assisted';
  private isPaused: boolean = false;

  async setMode(mode: AutopilotMode) {
    logger.info(`[Autopilot Service] Switching mode to: ${mode}`);
    this.currentMode = mode;
    return { mode: this.currentMode, isPaused: this.isPaused };
  }

  async togglePause() {
    this.isPaused = !this.isPaused;
    logger.warn(`[Autopilot Service] Emergency pause state set to: ${this.isPaused}`);
    return { isPaused: this.isPaused, mode: this.currentMode };
  }
}

export const autopilotService = new AutopilotService();
