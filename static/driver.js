const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const dateLabel = value => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
const eventLabels = {
  crowd: 'Crowd report',
  overcrowding: 'Overcrowding',
  congestion: 'Congestion',
  medical_emergency: 'Medical emergency',
  vehicle_breakdown: 'Vehicle breakdown',
  safety_threat: 'Safety threat',
  door_obstruction: 'Door obstruction',
  other: 'Other incident'
};

let selectedVehicleId = window.initialDriverVehicle || '';
let loading = false;
const previousStatuses = new Map();

function setDriverNotice(message, tone = 'info') {
  const notice = $('driverNotice');
  notice.textContent = message;
  notice.className = `driver-notice ${tone}`;
  notice.hidden = !message;
}

function renderVehicleOptions(vehicles) {
  const select = $('vehicleSelect');
  const options = ['<option value="">Select a registered vehicle</option>'];
  for (const vehicle of vehicles) {
    const label = [vehicle.vehicle_id, vehicle.route, vehicle.driver_name || 'Driver not assigned']
      .filter(Boolean).join(' · ');
    options.push(`<option value="${esc(vehicle.vehicle_id)}">${esc(label)}</option>`);
  }
  select.innerHTML = options.join('');
  select.value = selectedVehicleId;
}

function renderAlerts(alerts) {
  const container = $('driverAlerts');
  if (!alerts.length) {
    container.innerHTML = '<p class="empty">No alerts are recorded for this vehicle.</p>';
    return;
  }
  container.innerHTML = alerts.map(alert => {
    const status = String(alert.status || 'NEW').toUpperCase();
    const statusMessage = status === 'ACKNOWLEDGED'
      ? 'Transport authority has acknowledged this alert.'
      : status === 'RESOLVED'
        ? 'Transport authority has resolved this alert.'
        : 'This alert is awaiting an authority response.';
    const statusTimestamp = status === 'ACKNOWLEDGED'
      ? `<p><span>Acknowledged</span><strong>${esc(dateLabel(alert.acknowledged_at))}</strong></p>`
      : status === 'RESOLVED'
        ? `<p><span>Resolved</span><strong>${esc(dateLabel(alert.resolved_at))}</strong></p>`
        : '';
    return `<article class="driver-alert">
      <div class="driver-alert-head">
        <div><p class="eyebrow">ALERT #${esc(alert.id)}</p><h3>${esc(eventLabels[alert.event_type] || alert.event_type)}</h3></div>
        <span class="status ${esc(status)}">${esc(status)}</span>
      </div>
      <div class="driver-alert-details">
        <p><span>Bus number</span><strong>${esc(alert.vehicle_id)}</strong></p>
        <p><span>Route number</span><strong>${esc(alert.route)}</strong></p>
        <p><span>Alert type</span><strong>${esc(eventLabels[alert.event_type] || alert.event_type)}</strong></p>
        <p><span>Location</span><strong>${esc(alert.stop_name)}</strong></p>
        <p><span>Reported</span><strong>${esc(dateLabel(alert.created_at))}</strong></p>
        ${statusTimestamp}
      </div>
      ${alert.message ? `<p class="driver-alert-message">${esc(alert.message)}</p>` : ''}
      <p class="driver-status-message ${esc(status)}">${esc(statusMessage)}</p>
    </article>`;
  }).join('');
}

function announceStatusChanges(alerts) {
  const changes = [];
  for (const alert of alerts) {
    const previous = previousStatuses.get(alert.id);
    if (previous && previous !== alert.status) {
      if (alert.status === 'ACKNOWLEDGED') {
        changes.push(`Authority acknowledged alert #${alert.id}.`);
      } else if (alert.status === 'RESOLVED') {
        changes.push(`Authority resolved alert #${alert.id}.`);
      }
    }
    previousStatuses.set(alert.id, alert.status);
  }
  if (changes.length) setDriverNotice(changes.join(' '), 'success');
}

async function loadDriverDashboard() {
  if (loading) return;
  loading = true;
  const refresh = $('refreshDriverAlerts');
  refresh.disabled = true;
  try {
    const query = new URLSearchParams();
    if (selectedVehicleId) query.set('vehicle_id', selectedVehicleId);
    const response = await fetch(`/api/driver/dashboard?${query.toString()}`);
    const data = await response.json();
    renderVehicleOptions(data.vehicles || []);
    if (!response.ok) throw new Error(data.error || 'Could not load driver alerts.');
    if (!data.selected_vehicle) {
      $('driverIdentity').textContent = 'Select your registered vehicle to see its alerts.';
      renderAlerts([]);
      setDriverNotice('', 'info');
      return;
    }
    const vehicle = data.selected_vehicle;
    $('driverIdentity').textContent =
      `${vehicle.driver_name || 'Driver not assigned'} · ${vehicle.vehicle_id} · ${vehicle.route}`;
    renderAlerts(data.alerts || []);
    announceStatusChanges(data.alerts || []);
  } catch (error) {
    setDriverNotice(error.message || 'Could not load driver alerts. Try again.', 'error');
    $('driverAlerts').innerHTML = '<p class="empty">Driver alerts could not be loaded.</p>';
  } finally {
    loading = false;
    refresh.disabled = false;
  }
}

$('vehicleSelect').addEventListener('change', event => {
  selectedVehicleId = event.target.value;
  const url = new URL(window.location.href);
  if (selectedVehicleId) url.searchParams.set('vehicle_id', selectedVehicleId);
  else url.searchParams.delete('vehicle_id');
  window.history.replaceState({}, '', url);
  setDriverNotice('', 'info');
  loadDriverDashboard();
});
$('refreshDriverAlerts').addEventListener('click', loadDriverDashboard);

loadDriverDashboard();
window.setInterval(loadDriverDashboard, 3000);
