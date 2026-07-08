/**
 * Double E Reserve — Property Overview Card
 * A modern, dark-themed land management dashboard card for Home Assistant.
 * Inspired by advanced irrigation dashboard designs.
 */

const CARD_VERSION = '0.1.0';

class DoubleECard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
  }

  setConfig(config) {
    this._config = {
      daystrom_url: config.daystrom_url || 'http://192.168.1.218:8090',
      show_garden: config.show_garden !== false,
      show_irrigation: config.show_irrigation !== false,
      show_pasture: config.show_pasture !== false,
      show_livestock: config.show_livestock !== false,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getState(entityId) {
    if (!this._hass || !this._hass.states[entityId]) return null;
    return this._hass.states[entityId];
  }

  _stateValue(entityId, fallback = '--') {
    const s = this._getState(entityId);
    return s ? s.state : fallback;
  }

  _render() {
    if (!this._hass) return;

    const weather = this._getState('weather.home');
    const temp = this._stateValue('sensor.agribuddy_temperature');
    const humidity = this._stateValue('sensor.agribuddy_humidity');
    const wind = this._stateValue('sensor.agribuddy_wind_speed');
    const precip = this._stateValue('sensor.agribuddy_precipitation', '0');

    const beds = [
      { id: 1, name: 'Peppers', entity: 'binary_sensor.agribuddy_raised_bed_1_all_thirsty' },
      { id: 2, name: 'Squash', entity: 'binary_sensor.garden_agribuddy_raised_bed_2_all_thirsty' },
      { id: 3, name: 'Tomatoes & Herbs', entity: 'binary_sensor.garden_agribuddy_raised_bed_3_all_thirsty' },
      { id: 4, name: 'Cucumbers & Beans', entity: 'binary_sensor.garden_agribuddy_raised_bed_4_all_thirsty' },
      { id: 5, name: 'Okra', entity: 'binary_sensor.garden_agribuddy_raised_bed_5_all_thirsty' },
      { id: 6, name: 'Carrots & Greens', entity: 'binary_sensor.garden_agribuddy_raised_bed_6_all_thirsty' },
    ];

    const autoSchedule = this._stateValue('input_boolean.irrigation_auto_schedule_enabled') === 'on';
    const rainDelay = this._stateValue('input_boolean.irrigation_rain_delay') === 'on';

    const weatherIcon = this._weatherIcon(weather?.state);
    const weatherLabel = weather?.attributes?.friendly_name || 'Weather';
    const weatherState = weather?.state?.replace(/_/g, ' ') || '--';

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="card">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <span class="header-icon">🏡</span>
            <div>
              <h1>Double E Reserve</h1>
              <span class="header-sub">${this._formatDate()}</span>
            </div>
          </div>
          <div class="header-right">
            <span class="version">v${CARD_VERSION}</span>
          </div>
        </div>

        <!-- Status Banner -->
        <div class="status-banner ${rainDelay ? 'status-rain' : 'status-good'}">
          <span class="status-icon">${rainDelay ? '🌧️' : '☀️'}</span>
          <div class="status-text">
            <strong>${temp}°F</strong> · ${weatherState} · ${humidity}% humidity · Wind ${wind} mph
            ${rainDelay ? '<br><em>Rain delay active — irrigation paused</em>' : ''}
            ${precip && precip !== '0' && precip !== 'unknown' ? `<br><em>${precip}" precipitation expected</em>` : ''}
          </div>
          <div class="status-stats">
            <div class="stat"><span class="stat-val">${beds.length}</span><span class="stat-label">BEDS</span></div>
            <div class="stat"><span class="stat-val">18</span><span class="stat-label">PLANTS</span></div>
            <div class="stat"><span class="stat-val">${beds.filter(b => this._stateValue(b.entity) === 'on').length}</span><span class="stat-label">THIRSTY</span></div>
          </div>
        </div>

        <!-- Garden Section -->
        ${this._config.show_garden ? `
        <div class="section">
          <div class="section-header">
            <h2>🌱 Garden — Raised Beds</h2>
          </div>
          <div class="zone-grid">
            ${beds.map(bed => this._renderBedGauge(bed)).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Irrigation Section -->
        ${this._config.show_irrigation ? `
        <div class="section">
          <div class="section-header">
            <h2>💧 Irrigation</h2>
            <span class="badge ${autoSchedule ? 'badge-on' : 'badge-off'}">${autoSchedule ? 'AUTO' : 'MANUAL'}</span>
          </div>
          <div class="irrigation-status">
            <div class="irr-item">
              <div class="irr-indicator ${autoSchedule ? 'ind-on' : 'ind-off'}"></div>
              <span>Auto Schedule</span>
            </div>
            <div class="irr-item">
              <div class="irr-indicator ${rainDelay ? 'ind-warn' : 'ind-off'}"></div>
              <span>Rain Delay</span>
            </div>
            <div class="irr-note">OpenSprinkler integration pending — zone gauges will appear here</div>
          </div>
        </div>
        ` : ''}

        <!-- Pasture Section -->
        ${this._config.show_pasture ? `
        <div class="section">
          <div class="section-header">
            <h2>🌾 Pasture</h2>
            <span class="badge badge-pending">PENDING</span>
          </div>
          <div class="placeholder">
            <p>~15 acres · Rotational grazing · Paddock tracking</p>
            <p class="placeholder-sub">Add paddock data to Daystrom to activate</p>
          </div>
        </div>
        ` : ''}

        <!-- Livestock Section -->
        ${this._config.show_livestock ? `
        <div class="section">
          <div class="section-header">
            <h2>🐄 Livestock</h2>
            <span class="badge badge-pending">PENDING</span>
          </div>
          <div class="placeholder">
            <p>Cattle · Chickens · Herd management</p>
            <p class="placeholder-sub">Add livestock assets to Daystrom to activate</p>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  _renderBedGauge(bed) {
    const thirsty = this._stateValue(bed.entity) === 'on';
    const pct = thirsty ? 35 : 85;
    const color = thirsty ? '#e74c3c' : '#1D9E75';
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (pct / 100) * circumference;

    return `
      <div class="zone-card">
        <svg class="gauge" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#2a2a3e" stroke-width="6"/>
          <circle cx="40" cy="40" r="36" fill="none" stroke="${color}" stroke-width="6"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 40 40)"/>
          <text x="40" y="44" text-anchor="middle" fill="#fff" font-size="14" font-weight="600">${pct}%</text>
        </svg>
        <div class="zone-label">Bed ${bed.id}</div>
        <div class="zone-sub">${bed.name}</div>
        <div class="zone-status" style="color:${color}">${thirsty ? '● Needs water' : '● Good'}</div>
      </div>
    `;
  }

  _weatherIcon(state) {
    const icons = {
      'sunny': '☀️', 'clear-night': '🌙', 'partlycloudy': '⛅',
      'cloudy': '☁️', 'rainy': '🌧️', 'lightning-rainy': '⛈️',
      'snowy': '❄️', 'fog': '🌫️', 'windy': '💨',
    };
    return icons[state] || '🌤️';
  }

  _formatDate() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  _styles() {
    return `
      :host {
        display: block;
      }
      .card {
        background: #1a1a2e;
        border-radius: 16px;
        padding: 24px;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      /* Header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .header-icon {
        font-size: 28px;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #fff;
      }
      .header-sub {
        font-size: 12px;
        color: #888;
      }
      .version {
        font-size: 11px;
        color: #555;
        background: #2a2a3e;
        padding: 3px 8px;
        border-radius: 4px;
      }

      /* Status Banner */
      .status-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 24px;
      }
      .status-good {
        background: linear-gradient(135deg, #1D9E75 0%, #16a085 100%);
        color: #fff;
      }
      .status-rain {
        background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%);
        color: #fff;
      }
      .status-icon {
        font-size: 24px;
      }
      .status-text {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
      }
      .status-text strong {
        font-size: 16px;
      }
      .status-text em {
        opacity: 0.9;
        font-size: 12px;
      }
      .status-stats {
        display: flex;
        gap: 16px;
      }
      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 48px;
      }
      .stat-val {
        font-size: 20px;
        font-weight: 700;
      }
      .stat-label {
        font-size: 9px;
        letter-spacing: 0.5px;
        opacity: 0.8;
        margin-top: 2px;
      }

      /* Sections */
      .section {
        margin-bottom: 24px;
        padding: 16px;
        background: #16213e;
        border-radius: 12px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .section-header h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      /* Badges */
      .badge {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 4px 10px;
        border-radius: 4px;
      }
      .badge-on {
        background: #1D9E75;
        color: #fff;
      }
      .badge-off {
        background: #555;
        color: #aaa;
      }
      .badge-pending {
        background: #2a2a3e;
        color: #888;
        border: 1px dashed #555;
      }

      /* Zone Grid (Circular Gauges) */
      .zone-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 16px;
      }
      .zone-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #1a1a2e;
        border-radius: 12px;
        padding: 16px 8px 12px;
        transition: background 0.2s;
      }
      .zone-card:hover {
        background: #222240;
      }
      .gauge {
        width: 80px;
        height: 80px;
        margin-bottom: 8px;
      }
      .zone-label {
        font-size: 13px;
        font-weight: 600;
        color: #fff;
      }
      .zone-sub {
        font-size: 11px;
        color: #888;
        margin-top: 2px;
      }
      .zone-status {
        font-size: 10px;
        margin-top: 6px;
        font-weight: 500;
      }

      /* Irrigation */
      .irrigation-status {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
      }
      .irr-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .irr-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .ind-on { background: #1D9E75; }
      .ind-off { background: #555; }
      .ind-warn { background: #d4a017; }
      .irr-note {
        width: 100%;
        font-size: 12px;
        color: #666;
        font-style: italic;
        margin-top: 8px;
      }

      /* Placeholder */
      .placeholder {
        text-align: center;
        padding: 12px;
      }
      .placeholder p {
        margin: 4px 0;
        font-size: 13px;
        color: #aaa;
      }
      .placeholder-sub {
        font-size: 11px !important;
        color: #666 !important;
        font-style: italic;
      }
    `;
  }

  getCardSize() {
    return 8;
  }

  static getConfigElement() {
    return document.createElement('double-e-card-editor');
  }

  static getStubConfig() {
    return {
      daystrom_url: 'http://192.168.1.218:8090',
      show_garden: true,
      show_irrigation: true,
      show_pasture: true,
      show_livestock: true,
    };
  }
}

customElements.define('double-e-card', DoubleECard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'double-e-card',
  name: 'Double E Reserve',
  description: 'Property management overview for Double E Reserve',
  preview: true,
});

console.info(`%c DOUBLE-E-CARD %c v${CARD_VERSION} `, 'background:#1D9E75;color:#fff;font-weight:700;', 'background:#1a1a2e;color:#1D9E75;');
