# Double E Reserve Card

Custom Home Assistant card for the Double E Reserve property management dashboard.

## Installation

1. Add this repository as a custom repository in HACS (category: Lovelace)
2. Install "Double E Reserve Card"
3. Add to your dashboard:

```yaml
type: custom:double-e-card
daystrom_url: http://192.168.1.218:8090
```

## Features

- Dark-themed property overview with SVG circular gauges
- Real-time HA entity state via hass object
- Sections: Garden (raised beds), Irrigation, Pasture, Livestock
- Modular — show/hide sections via config

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `daystrom_url` | `http://192.168.1.218:8090` | Daystrom API endpoint |
| `show_garden` | `true` | Show garden section |
| `show_irrigation` | `true` | Show irrigation section |
| `show_pasture` | `true` | Show pasture section |
| `show_livestock` | `true` | Show livestock section |
