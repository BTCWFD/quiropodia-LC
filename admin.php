<?php
// admin.php
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self';");

$adminConfig = require __DIR__ . '/admin_config.php';
$expectedUser = $adminConfig['user'];
$expectedHash = $adminConfig['hash'];

$user = $_SERVER['PHP_AUTH_USER'] ?? '';
$pass = $_SERVER['PHP_AUTH_PW'] ?? '';

if ($user !== $expectedUser || !password_verify($pass, $expectedHash)) {
    header('WWW-Authenticate: Basic realm="Admin Area"');
    http_response_code(401);
    echo "Authentication required.";
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Quiropodia LC - Panel de Administración</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <div class="admin-title-area">
        <h1>Quiropodia LC</h1>
        <p>Panel de Administración de Citas</p>
      </div>
      <div class="filter-group">
        <label for="filter-date">Filtrar por Fecha:</label>
        <input type="date" id="filter-date">
        <button id="clear-filter" class="slot-btn" style="padding: 0.35rem 0.75rem; margin-left: 0.5rem; font-size: 0.85rem;">Ver Todas</button>
      </div>
    </header>

    <main class="admin-content">
      <div id="admin-feedback" class="feedback-area hidden"></div>
      
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID/Código</th>
              <th>Paciente</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody id="appointments-body">
            <tr>
              <td colspan="5" class="no-data-row">Cargando citas...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const filterDateInput = document.getElementById('filter-date');
      const clearFilterBtn = document.getElementById('clear-filter');
      const tableBody = document.getElementById('appointments-body');
      const feedback = document.getElementById('admin-feedback');

      async function fetchAppointments(dateVal = '') {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data-row">Cargando citas...</td></tr>';
        feedback.classList.add('hidden');

        // Fetch using the clean path (which htaccess maps to api/admin_citas.php)
        let url = '/admin/citas';
        if (dateVal) {
          url += `?date=${encodeURIComponent(dateVal)}`;
        }

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Error en el servidor: HTTP ${response.status}`);
          }
          const appointments = await response.json();
          
          tableBody.innerHTML = '';
          
          if (!Array.isArray(appointments) || appointments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-data-row">No hay citas registradas para este criterio.</td></tr>';
            return;
          }

          appointments.forEach(app => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            const spanId = document.createElement('span');
            spanId.className = 'booking-id-badge';
            spanId.textContent = String(app.id || 'N/A');
            tdId.appendChild(spanId);
            
            const tdName = document.createElement('td');
            tdName.textContent = app.name || 'N/A';
            tdName.style.fontWeight = '600';
            
            const tdDate = document.createElement('td');
            tdDate.textContent = app.date || 'N/A';
            
            const tdTime = document.createElement('td');
            tdTime.textContent = app.time || 'N/A';
            tdTime.style.color = 'var(--primary-emerald)';
            tdTime.style.fontWeight = 'bold';
            
            const tdPhone = document.createElement('td');
            tdPhone.textContent = app.phone || 'N/A';
            
            tr.appendChild(tdId);
            tr.appendChild(tdName);
            tr.appendChild(tdDate);
            tr.appendChild(tdTime);
            tr.appendChild(tdPhone);
            
            tableBody.appendChild(tr);
          });

        } catch (err) {
          console.error(err);
          feedback.textContent = `Error al obtener las citas: ${err.message}`;
          feedback.className = 'feedback-area error';
          feedback.classList.remove('hidden');
          tableBody.innerHTML = '<tr><td colspan="5" class="no-data-row" style="color: var(--error-color);">Error de comunicación con el servidor.</td></tr>';
        }
      }

      // Initial load: fetch all appointments
      fetchAppointments();

      // Listen for filter date change
      filterDateInput.addEventListener('change', () => {
        fetchAppointments(filterDateInput.value);
      });

      // Clear filter
      clearFilterBtn.addEventListener('click', () => {
        filterDateInput.value = '';
        fetchAppointments();
      });
    });
  </script>
</body>
</html>
