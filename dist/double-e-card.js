/**
 * Double E Reserve — Property Overview Card
 * A modern, dark-themed land management dashboard card for Home Assistant.
 * Inspired by advanced irrigation dashboard designs.
 */

const CARD_VERSION = '0.5.2';

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
    const oldHass = this._hass;
    this._hass = hass;

    if (!this._animalsLoaded) {
      this._animalsLoaded = true;
      this._loadAnimals();
      setInterval(() => this._loadAnimals(), 300000);
    }

    if (!oldHass) {
      this._render();
      return;
    }

    const watched = [
      'weather.home',
      'sensor.agribuddy_temperature',
      'sensor.agribuddy_humidity',
      'sensor.agribuddy_wind_speed',
      'sensor.agribuddy_precipitation',
      'input_boolean.irrigation_auto_schedule_enabled',
      'input_boolean.irrigation_rain_delay',
      'binary_sensor.agribuddy_raised_bed_1_all_thirsty',
      'binary_sensor.garden_agribuddy_raised_bed_2_all_thirsty',
      'binary_sensor.garden_agribuddy_raised_bed_3_all_thirsty',
      'binary_sensor.garden_agribuddy_raised_bed_4_all_thirsty',
      'binary_sensor.garden_agribuddy_raised_bed_5_all_thirsty',
      'binary_sensor.garden_agribuddy_raised_bed_6_all_thirsty',
    ];

    const changed = watched.some(id =>
      oldHass.states[id] !== hass.states[id]
    );

    if (changed) this._render();
  }

  async _loadAnimals() {
    if (this._animalsLoading) return;
    this._animalsLoading = true;
    try {
      const res = await fetch(`${this._config.daystrom_url}/api/assets?type=animal&status=active`);
      const { data } = await res.json();
      this._animals = (data || []).map(a => ({
        ...a,
        attributes: typeof a.attributes === 'string' ? JSON.parse(a.attributes) : a.attributes || {},
      }));
    } catch (err) {
      this._animals = [];
    }
    this._animalsLoading = false;
    this._renderAnimalsSection();
  }

  _renderAnimalsHTML() {
    const animals = this._animals || [];
    if (animals.length === 0) {
      return `<div class="placeholder"><p>No animals found</p><p class="placeholder-sub">Add animals to Daystrom to activate</p></div>`;
    }

    const grouped = {};
    for (const a of animals) {
      const cat = a.attributes.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    }

    const categoryLabels = { pet: '🐾 Pets', livestock: '🐄 Livestock', farm_animal: '🐈 Farm Animals', other: '📋 Other' };
    const speciesIcons = { dog: '🐕', cat: '🐈', cattle: '🐄', chicken: '🐔', horse: '🐴', goat: '🐐', pig: '🐖' };

    let html = '';
    for (const [cat, list] of Object.entries(grouped)) {
      html += `<div class="animal-group">
        <div class="animal-group-label">${categoryLabels[cat] || cat}</div>
        <div class="animal-list">
          ${list.map(a => {
            const attrs = a.attributes;
            const icon = speciesIcons[attrs.species] || '🐾';
            const avatar = attrs.photo_url
              ? `<img class="animal-avatar" src="${attrs.photo_url}" alt="${a.name}">`
              : `<span class="animal-icon">${icon}</span>`;
            const details = [attrs.breed, attrs.color, attrs.sex].filter(Boolean).join(' · ');
            const healthBadges = [];
            if (attrs.vaccinations_current) healthBadges.push('<span class="animal-badge badge-good">Vacc ✓</span>');
            if (attrs.spayed_neutered) healthBadges.push('<span class="animal-badge badge-good">Fixed ✓</span>');
            if (attrs.microchipped) healthBadges.push('<span class="animal-badge badge-good">Chipped ✓</span>');
            return `<div class="animal-card" data-id="${a.id}">
              ${avatar}
              <div class="animal-info">
                <div class="animal-name">${a.name}</div>
                <div class="animal-details">${details || attrs.species || 'Unknown'}</div>
                ${healthBadges.length ? `<div class="animal-badges">${healthBadges.join('')}</div>` : ''}
              </div>
              ${attrs.weight_lbs ? `<div class="animal-weight">${attrs.weight_lbs} lbs</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    return html;
  }

  _renderAnimalsSection() {
    const container = this.shadowRoot?.querySelector('.animals-content');
    if (!container) return;
    container.innerHTML = this._renderAnimalsHTML();
    this._bindAnimalClicks();
  }

  _bindAnimalClicks() {
    const cards = this.shadowRoot.querySelectorAll('.animal-card[data-id]');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const animal = (this._animals || []).find(a => a.id === card.dataset.id);
        if (animal) this._openAnimalEditor(animal);
      });
    });
    const addBtn = this.shadowRoot.querySelector('.btn-add-animal');
    if (addBtn) addBtn.addEventListener('click', () => this._openAnimalEditor(null));
  }

  _openAnimalEditor(animal) {
    const isNew = !animal;
    const attrs = animal?.attributes || {};
    const speciesIcons = { dog: '🐕', cat: '🐈', cattle: '🐄', chicken: '🐔', horse: '🐴', goat: '🐐', pig: '🐖' };
    const categoryLabels = { pet: 'Pet', farm_animal: 'Farm Animal', livestock: 'Livestock' };
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const photoLarge = attrs.photo_url
      ? `<img class="detail-photo" src="${attrs.photo_url}" alt="${animal?.name || ''}">`
      : `<div class="detail-photo-placeholder">${speciesIcons[attrs.species] || '🐾'}</div>`;

    const detailRows = [
      ['Species', attrs.species || '—'],
      ['Category', categoryLabels[attrs.category] || attrs.category || '—'],
      ['Breed', attrs.breed || '—'],
      ['Color', attrs.color || '—'],
      ['Sex', attrs.sex ? attrs.sex.charAt(0).toUpperCase() + attrs.sex.slice(1) : '—'],
      ['Date of Birth', attrs.date_of_birth || '—'],
      ['Weight', attrs.weight_lbs ? `${attrs.weight_lbs} lbs` : '—'],
      ['Diet', attrs.diet || '—'],
      ['Health Notes', attrs.health_notes || '—'],
      ['Vaccinations', attrs.vaccinations_current ? '✓ Current' : '✗ Not current'],
      ['Spayed/Neutered', attrs.spayed_neutered ? '✓ Yes' : '✗ No'],
      ['Microchipped', attrs.microchipped ? '✓ Yes' : '✗ No'],
      ['Vet', attrs.vet_name || '—'],
      ['Vet Phone', attrs.vet_phone || '—'],
    ];

    overlay.innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-header">
          <h3>${isNew ? 'Add Animal' : animal.name}</h3>
          <button class="overlay-close">✕</button>
        </div>
        <div class="overlay-body">
          <!-- Detail View (read-only) -->
          <div class="detail-view" ${isNew ? 'style="display:none"' : ''}>
            <div class="detail-photo-wrap">${photoLarge}</div>
            <div class="detail-fields">
              ${detailRows.map(([label, val]) => `
                <div class="detail-row">
                  <span class="detail-label">${label}</span>
                  <span class="detail-value">${val}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <!-- Edit Form (hidden until Edit clicked) -->
          <div class="edit-view" ${isNew ? '' : 'style="display:none"'}>
            <label class="form-label">Name</label>
            <input type="text" class="form-input" id="ae-name" value="${animal?.name || ''}">

            <label class="form-label">Species</label>
            <select class="form-input" id="ae-species">
              ${['dog','cat','cattle','chicken','horse','goat','pig','other'].map(s =>
                `<option value="${s}" ${attrs.species === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>

            <label class="form-label">Category</label>
            <select class="form-input" id="ae-category">
              ${['pet','farm_animal','livestock'].map(c =>
                `<option value="${c}" ${attrs.category === c ? 'selected' : ''}>${c.replace('_',' ')}</option>`
              ).join('')}
            </select>

            <label class="form-label">Photo URL</label>
            <input type="url" class="form-input" id="ae-photo" value="${attrs.photo_url || ''}" placeholder="https://...">

            <label class="form-label">Breed</label>
            <input type="text" class="form-input" id="ae-breed" value="${attrs.breed || ''}">

            <label class="form-label">Color</label>
            <input type="text" class="form-input" id="ae-color" value="${attrs.color || ''}">

            <label class="form-label">Sex</label>
            <select class="form-input" id="ae-sex">
              <option value="" ${!attrs.sex ? 'selected' : ''}>—</option>
              <option value="male" ${attrs.sex === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${attrs.sex === 'female' ? 'selected' : ''}>Female</option>
            </select>

            <label class="form-label">Date of Birth</label>
            <input type="date" class="form-input" id="ae-dob" value="${attrs.date_of_birth || ''}">

            <label class="form-label">Weight (lbs)</label>
            <input type="number" class="form-input" id="ae-weight" value="${attrs.weight_lbs || ''}">

            <label class="form-label">Diet / Feed Notes</label>
            <input type="text" class="form-input" id="ae-diet" value="${attrs.diet || ''}">

            <label class="form-label">Health Notes</label>
            <textarea class="form-input form-textarea" id="ae-health">${attrs.health_notes || ''}</textarea>

            <div class="form-checks">
              <label><input type="checkbox" id="ae-vacc" ${attrs.vaccinations_current ? 'checked' : ''}> Vaccinations current</label>
              <label><input type="checkbox" id="ae-fixed" ${attrs.spayed_neutered ? 'checked' : ''}> Spayed / Neutered</label>
              <label><input type="checkbox" id="ae-chip" ${attrs.microchipped ? 'checked' : ''}> Microchipped</label>
            </div>

            <label class="form-label">Vet Name</label>
            <input type="text" class="form-input" id="ae-vet" value="${attrs.vet_name || ''}">

            <label class="form-label">Vet Phone</label>
            <input type="text" class="form-input" id="ae-vetphone" value="${attrs.vet_phone || ''}">
          </div>
        </div>
        <div class="overlay-footer">
          <!-- Detail mode footer -->
          <div class="footer-detail" ${isNew ? 'style="display:none"' : ''}>
            <button class="btn btn-edit" id="ae-edit">✏️ Edit</button>
            <button class="btn btn-cancel" id="ae-close-detail">Close</button>
          </div>
          <!-- Edit mode footer -->
          <div class="footer-edit" ${isNew ? '' : 'style="display:none"'}>
            ${!isNew ? '<button class="btn btn-delete" id="ae-delete">🗑 Delete</button>' : '<span></span>'}
            <div class="action-buttons">
              <button class="btn btn-cancel" id="ae-cancel">${isNew ? 'Cancel' : 'Cancel'}</button>
              <button class="btn btn-save" id="ae-save">${isNew ? 'Add' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.shadowRoot.appendChild(overlay);

    const detailView = overlay.querySelector('.detail-view');
    const editView = overlay.querySelector('.edit-view');
    const footerDetail = overlay.querySelector('.footer-detail');
    const footerEdit = overlay.querySelector('.footer-edit');

    const closeOverlay = () => overlay.remove();
    overlay.querySelector('.overlay-close').addEventListener('click', closeOverlay);
    overlay.querySelector('#ae-close-detail')?.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

    // Edit button switches to edit mode
    overlay.querySelector('#ae-edit')?.addEventListener('click', () => {
      detailView.style.display = 'none';
      editView.style.display = '';
      footerDetail.style.display = 'none';
      footerEdit.style.display = '';
    });

    // Cancel in edit mode goes back to detail (or closes if new)
    overlay.querySelector('#ae-cancel').addEventListener('click', () => {
      if (isNew) { closeOverlay(); return; }
      editView.style.display = 'none';
      detailView.style.display = '';
      footerEdit.style.display = 'none';
      footerDetail.style.display = '';
    });

    overlay.querySelector('#ae-save').addEventListener('click', async () => {
      const payload = {
        name: overlay.querySelector('#ae-name').value.trim(),
        type: 'animal',
        status: 'active',
        attributes: {
          species: overlay.querySelector('#ae-species').value,
          category: overlay.querySelector('#ae-category').value,
          photo_url: overlay.querySelector('#ae-photo').value || null,
          breed: overlay.querySelector('#ae-breed').value || null,
          color: overlay.querySelector('#ae-color').value || null,
          sex: overlay.querySelector('#ae-sex').value || null,
          date_of_birth: overlay.querySelector('#ae-dob').value || null,
          weight_lbs: overlay.querySelector('#ae-weight').value ? Number(overlay.querySelector('#ae-weight').value) : null,
          diet: overlay.querySelector('#ae-diet').value || null,
          health_notes: overlay.querySelector('#ae-health').value || null,
          vaccinations_current: overlay.querySelector('#ae-vacc').checked,
          spayed_neutered: overlay.querySelector('#ae-fixed').checked,
          microchipped: overlay.querySelector('#ae-chip').checked,
          vet_name: overlay.querySelector('#ae-vet').value || null,
          vet_phone: overlay.querySelector('#ae-vetphone').value || null,
        },
      };
      if (!payload.name) return;
      try {
        const url = isNew
          ? `${this._config.daystrom_url}/api/assets`
          : `${this._config.daystrom_url}/api/assets/${animal.id}`;
        const method = isNew ? 'POST' : 'PATCH';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        closeOverlay();
        await this._loadAnimals();
      } catch (err) {
        overlay.querySelector('#ae-save').textContent = 'Error!';
      }
    });

    if (!isNew) {
      overlay.querySelector('#ae-delete').addEventListener('click', async () => {
        if (!confirm(`Delete ${animal.name}?`)) return;
        try {
          await fetch(`${this._config.daystrom_url}/api/assets/${animal.id}`, { method: 'DELETE' });
          closeOverlay();
          await this._loadAnimals();
        } catch (err) {}
      });
    }
  }

  async _logEventForAllPlants(eventType, note = '') {
    const btn = this.shadowRoot.querySelector(`[data-action="${eventType}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Logging...';
    }
    try {
      const res = await fetch(`${this._config.daystrom_url}/api/plants?status=active`);
      const { data: plants } = await res.json();
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const results = await Promise.all(
        plants.map(p =>
          fetch(`${this._config.daystrom_url}/api/plants/${p.id}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: eventType, date: today, note }),
          })
        )
      );
      const succeeded = results.filter(r => r.ok).length;
      if (btn) {
        btn.textContent = `Done! (${succeeded}/${plants.length})`;
        btn.classList.add('btn-success');
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = eventType === 'watered' ? '💧 Watered All' : '🌿 Fertilized All';
          btn.classList.remove('btn-success');
        }, 3000);
      }
    } catch (err) {
      if (btn) {
        btn.textContent = 'Error!';
        btn.classList.add('btn-error');
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = eventType === 'watered' ? '💧 Watered All' : '🌿 Fertilized All';
          btn.classList.remove('btn-error');
        }, 3000);
      }
    }
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
            <div class="action-buttons">
              <button class="btn btn-water" data-action="watered">💧 Watered All</button>
              <button class="btn btn-fert" data-action="fertilized">🌿 Fertilized All</button>
            </div>
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

        <!-- Animals Section -->
        ${this._config.show_livestock ? `
        <div class="section">
          <div class="section-header">
            <h2>🐾 Animals</h2>
            <div class="action-buttons">
              <button class="btn btn-add-animal">+ Add Animal</button>
              <span class="badge badge-on">${(this._animals || []).length}</span>
            </div>
          </div>
          <div class="animals-content">
            ${this._animals ? this._renderAnimalsHTML() : '<div class="placeholder"><p>Loading...</p></div>'}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    const waterBtn = this.shadowRoot.querySelector('[data-action="watered"]');
    const fertBtn = this.shadowRoot.querySelector('[data-action="fertilized"]');
    if (waterBtn) waterBtn.addEventListener('click', () => this._logEventForAllPlants('watered'));
    if (fertBtn) fertBtn.addEventListener('click', () => this._logEventForAllPlants('fertilized'));
    this._bindAnimalClicks();
  }

  _renderBedGauge(bed) {
    const thirsty = this._stateValue(bed.entity) === 'on';
    const pct = thirsty ? 35 : 85;
    const color = thirsty ? 'var(--needle)' : 'var(--ledger)';
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (pct / 100) * circumference;

    return `
      <div class="zone-card">
        <svg class="gauge" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bezel)" stroke-width="6"/>
          <circle cx="40" cy="40" r="36" fill="none" stroke="${color}" stroke-width="6"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 40 40)"/>
          <text x="40" y="44" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="600">${pct}%</text>
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
        --housing: #14161b;
        --panel: #1c2027;
        --panel-2: #23282f;
        --well: #171a20;
        --bezel: #2c323b;
        --hairline: #333a44;
        --brass: #d9a441;
        --brass-dim: #a67f34;
        --needle: #c8483a;
        --ledger: #9fbf8f;
        --ink: #e7e3d8;
        --ink-dim: #9aa0ab;
        --ink-faint: #6b7280;
        --font-display: 'Oswald', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'JetBrains Mono', ui-monospace, monospace;
        --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        display: block;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--bezel);
        border-radius: 8px;
        padding: 20px;
        color: var(--ink);
        font-family: var(--font-body);
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
        font: 600 24px/1 var(--font-display);
        letter-spacing: .035em;
        text-transform: uppercase;
        color: var(--ink);
      }
      .header-sub {
        font-size: 12px;
        color: var(--ink-dim);
      }
      .version {
        font-size: 11px;
        color: var(--ink-faint);
        background: var(--bezel);
        padding: 3px 8px;
        border-radius: 4px;
      }

      /* Status Banner */
      .status-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        border: 1px solid var(--bezel);
        border-radius: 5px;
        margin-bottom: 20px;
      }
      .status-good {
        background: linear-gradient(135deg, var(--ledger) 0%, #6e967a 100%);
        color: var(--ink);
      }
      .status-rain {
        background: linear-gradient(135deg, var(--brass) 0%, var(--brass-dim) 100%);
        color: var(--ink);
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
        background: var(--well);
        border: 1px solid var(--bezel);
        border-radius: 5px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .section-header h2 {
        margin: 0;
        font: 500 18px/1 var(--font-display);
        letter-spacing: .035em;
        text-transform: uppercase;
        color: var(--ink);
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
        background: var(--ledger);
        color: var(--ink);
      }
      .badge-off {
        background: var(--ink-faint);
        color: var(--ink-dim);
      }
      .badge-pending {
        background: var(--bezel);
        color: var(--ink-dim);
        border: 1px dashed var(--ink-faint);
      }

      /* Action Buttons */
      .action-buttons {
        display: flex;
        gap: 8px;
      }
      .btn {
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        border: 1px solid var(--bezel);
        border-radius: 4px;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--ink);
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .btn-water {
        background: #5b9bd5;
      }
      .btn-water:hover:not(:disabled) {
        background: #78afe2;
      }
      .btn-fert {
        background: var(--ledger);
      }
      .btn-fert:hover:not(:disabled) {
        background: #b3d5a3;
      }
      .btn-success {
        background: var(--ledger) !important;
      }
      .btn-error {
        background: var(--needle) !important;
      }

      /* Animals */
      .animal-group {
        margin-bottom: 12px;
      }
      .animal-group:last-child {
        margin-bottom: 0;
      }
      .animal-group-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--ink-dim);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      .animal-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .animal-card {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--panel);
        border: 1px solid var(--bezel);
        border-radius: 5px;
        padding: 12px 14px;
        min-width: 180px;
        flex: 1;
        cursor: pointer;
        transition: background 0.2s;
      }
      .animal-card:hover {
        background: var(--panel-2);
      }
      .animal-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid var(--brass-dim);
        flex-shrink: 0;
      }
      .animal-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .animal-info {
        flex: 1;
        min-width: 0;
      }
      .animal-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--ink);
      }
      .animal-details {
        font-size: 11px;
        color: var(--ink-dim);
        margin-top: 2px;
      }
      .animal-badges {
        display: flex;
        gap: 4px;
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .animal-badge {
        font-size: 9px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .badge-good {
        background: rgba(29, 158, 117, 0.2);
        color: var(--ledger);
      }
      .animal-weight {
        font-size: 12px;
        font-weight: 600;
        color: var(--ink-dim);
        white-space: nowrap;
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
        background: var(--panel);
        border: 1px solid var(--bezel);
        border-radius: 5px;
        padding: 16px 8px 12px;
        transition: background 0.2s;
      }
      .zone-card:hover {
        background: var(--panel-2);
      }
      .gauge {
        width: 80px;
        height: 80px;
        margin-bottom: 8px;
      }
      .zone-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }
      .zone-sub {
        font-size: 11px;
        color: var(--ink-dim);
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
      .ind-on { background: var(--ledger); }
      .ind-off { background: var(--ink-faint); }
      .ind-warn { background: var(--brass); }
      .irr-note {
        width: 100%;
        font-size: 12px;
        color: var(--ink-faint);
        font-style: italic;
        margin-top: 8px;
      }

      /* Overlay / Editor */
      .overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .overlay-panel {
        background: var(--panel);
        border-radius: 7px;
        width: 90%;
        max-width: 420px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--bezel);
      }
      .overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--bezel);
      }
      .overlay-header h3 {
        margin: 0;
        font-size: 16px;
        color: var(--ink);
      }
      .overlay-close {
        background: none;
        border: none;
        color: var(--ink-dim);
        font-size: 18px;
        cursor: pointer;
      }
      .overlay-close:hover { color: var(--ink); }
      .overlay-body {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
      }
      .overlay-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid var(--bezel);
      }
      .form-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: var(--ink-dim);
        margin: 12px 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .form-label:first-child { margin-top: 0; }
      .form-input {
        display: block;
        width: 100%;
        padding: 8px 10px;
        background: var(--well);
        border: 1px solid var(--bezel);
        border-radius: 6px;
        color: var(--ink);
        font-size: 13px;
        box-sizing: border-box;
      }
      .form-input:focus {
        outline: none;
        border-color: var(--ledger);
      }
      .form-textarea {
        min-height: 60px;
        resize: vertical;
      }
      .form-checks {
        margin: 12px 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .form-checks label {
        font-size: 13px;
        color: var(--ink-dim);
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      /* Detail View */
      .detail-view {
        display: flex;
        flex-direction: column;
      }
      .detail-photo-wrap {
        margin-bottom: 16px;
        width: 100%;
        border-radius: 12px;
        overflow: hidden;
        background: var(--bezel);
      }
      .detail-photo {
        width: 100%;
        max-height: 280px;
        object-fit: cover;
        display: block;
      }
      .detail-photo-placeholder {
        width: 100%;
        height: 160px;
        background: var(--bezel);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
      }
      .detail-fields {
        width: 100%;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--bezel);
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        font-size: 12px;
        color: var(--ink-dim);
        font-weight: 600;
      }
      .detail-value {
        font-size: 12px;
        color: var(--ink);
        text-align: right;
      }
      .footer-detail, .footer-edit {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .btn-edit {
        background: #5b9bd5;
      }
      .btn-edit:hover { background: #78afe2; }

      .btn-add-animal {
        background: var(--bezel);
        color: var(--ink-dim);
        font-size: 11px;
      }
      .btn-add-animal:hover { background: #333; color: var(--ink); }
      .btn-save {
        background: var(--ledger);
      }
      .btn-save:hover { background: #24b888; }
      .btn-cancel {
        background: var(--ink-faint);
      }
      .btn-cancel:hover { background: var(--ink-faint); }
      .btn-delete {
        background: var(--needle);
      }
      .btn-delete:hover { background: #9f382f; }

      /* Placeholder */
      .placeholder {
        text-align: center;
        padding: 12px;
      }
      .placeholder p {
        margin: 4px 0;
        font-size: 13px;
        color: var(--ink-dim);
      }
      .placeholder-sub {
        font-size: 11px !important;
        color: var(--ink-faint) !important;
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

console.info(`%c DOUBLE-E-CARD %c v${CARD_VERSION} `, 'background:var(--ledger);color:var(--ink);font-weight:700;', 'background:var(--panel);color:var(--ledger);');
