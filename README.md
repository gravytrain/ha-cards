# Double E Reserve — HA Custom Cards

Custom Home Assistant cards for the Double E Reserve property management dashboard.

## Structure

```
www/
  double-e-card.js      # Main property overview card
  irrigation-card.js    # Irrigation zone management (future)
  pasture-card.js       # Rotational grazing tracker (future)
```

## Deployment

This repo is synced to Home Assistant's `/config/www/` directory via the **Git Pull** addon.
Cards are served at `/local/<filename>.js` and registered as dashboard resources.

## Development

Edit cards locally, push to GitHub, then trigger a pull in HA (or wait for the scheduled sync).
Hard-refresh the browser to pick up changes (or bump the `?v=` query param on the resource URL).
