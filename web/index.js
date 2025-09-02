let co2Chart, tempChart, lightChart;

// Initialize charts
function initCharts() {
  const co2Ctx = document.getElementById("co2Chart").getContext("2d");
  co2Chart = new Chart(co2Ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "CO2 (ppm)",
          data: [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });

  const tempCtx = document.getElementById("tempChart").getContext("2d");
  tempChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Temperature (°C)",
          data: [],
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Humidity (%)",
          data: [],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });

  const lightCtx = document.getElementById("lightChart").getContext("2d");
  lightChart = new Chart(lightCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Light Level (lux)",
          data: [],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// Fetch latest sensor data
async function fetchSensorData() {
  try {
    const response = await fetch("http://localhost:3000/get-sensor-data");
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      updateDisplay(latest);
      updateCharts(latest);
      updateConnectionStatus(true);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    updateConnectionStatus(false);
  }
}

// Update values shown on dashboard
function updateDisplay(data) {
  document.getElementById("co2-value").textContent = Number(
    data.co2 || 0
  ).toFixed(2);
  document.getElementById("temp-value").textContent = Number(
    data.temperature || 0
  ).toFixed(2);
  document.getElementById("humidity-value").textContent = Number(
    data.humidity || 0
  ).toFixed(2);
  document.getElementById("light-value").textContent = Number(
    data.lux || 0
  ).toFixed(2);
  document.getElementById("air-quality-status").textContent =
    data.air_quality || "Unknown";

  document.getElementById("last-update").textContent =
    new Date().toLocaleTimeString();

  checkAlerts(data);
}

// Update all 3 charts
function updateCharts(data) {
  const time = new Date().toLocaleTimeString();

  // Avoid duplicate timestamps
  if (co2Chart.data.labels.at(-1) === time) return;

  // --- Air Quality ---
  co2Chart.data.labels.push(time);
  co2Chart.data.datasets[0].data.push(data.co2 || 0);
  if (co2Chart.data.labels.length > 20) {
    co2Chart.data.labels.shift();
    co2Chart.data.datasets[0].data.shift();
  }
  co2Chart.update("none");

  // --- Temperature & Humidity ---
  tempChart.data.labels.push(time);
  tempChart.data.datasets[0].data.push(parseFloat(data.temperature) || 0);
  tempChart.data.datasets[1].data.push(parseFloat(data.humidity) || 0);
  if (tempChart.data.labels.length > 20) {
    tempChart.data.labels.shift();
    tempChart.data.datasets[0].data.shift();
    tempChart.data.datasets[1].data.shift();
  }
  tempChart.update("none");

  // --- Light ---
  lightChart.data.labels.push(time);
  lightChart.data.datasets[0].data.push(data.lux || 0);
  if (lightChart.data.labels.length > 20) {
    lightChart.data.labels.shift();
    lightChart.data.datasets[0].data.shift();
  }
  lightChart.update("none");
}

// Show online/offline status
function updateConnectionStatus(connected) {
  const statusElement = document.getElementById("connection-status");
  statusElement.textContent = connected ? "● Online" : "● Offline";
  statusElement.className = connected ? "online" : "offline";
}

// Show warnings/alerts
function checkAlerts(data) {
  const alertsDiv = document.getElementById("alerts");
  let alerts = [];

  if (data.co2 > 600) {
    alerts.push({
      type: "alert",
      message: `High air pollution detected: ${Math.round(
        data.co2
      )} ppm (consider ventilation)`,
    });
  }

  if (data.temperature > 30) {
    alerts.push({
      type: "warning",
      message: `High temperature: ${data.temperature}°C (consider cooling)`,
    });
  }

  if (data.humidity > 80) {
    alerts.push({
      type: "warning",
      message: `High humidity: ${data.humidity}% (consider dehumidification)`,
    });
  }

  if (data.lux < 200) {
    alerts.push({
      type: "warning",
      message: `Low light level: ${Math.round(
        data.lux
      )} lux  (consider lighting)`,
    });
  }

  alertsDiv.innerHTML = alerts
    .map((alert) => `<div class="alert ${alert.type}">${alert.message}</div>`)
    .join("");
}

// Initialize dashboard
function init() {
  initCharts();
  fetchSensorData(); // initial fetch
  setInterval(fetchSensorData, 10000); // fetch every 60 seconds
}

document.addEventListener("DOMContentLoaded", init);
