(function () {
  'use strict';

  class ChartManager {
    constructor() {
      this.charts = {};
    }

    init() {
      if (!window.Chart) return;

      this.charts.bins = new Chart(document.getElementById('chart-bin-levels'), {
        type: 'bar',
        data: {
          labels: ['Organic', 'Recyclable', 'Metal', 'Hazardous', 'E-Waste'],
          datasets: [{ label: 'Fill %', data: [68,45,30,82,25], borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
      });

      this.charts.compost = new Chart(document.getElementById('chart-compost-telemetry'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            { label: 'Temperature °C', data: [], tension: 0.35, yAxisID: 'y' },
            { label: 'Moisture %', data: [], tension: 0.35, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: false, title: { display: true, text: 'Temperature °C' } },
            y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Moisture %' } }
          }
        }
      });

      this.charts.segregation = new Chart(document.getElementById('chart-segregation-split'), {
        type: 'doughnut',
        data: {
          labels: ['Wet / Organic', 'Dry', 'Metal'],
          datasets: [{ data: [54,32,14] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      this.charts.sanitization = new Chart(document.getElementById('chart-sanitization-trend'), {
        type: 'line',
        data: {
          labels: [],
          datasets: [{ label: 'VOC / Odor PPM', data: [], tension: 0.35, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }

    update(state) {
      if (!this.charts.bins) return;

      const h = state.histories;
      const labels = h.timestamps.map(ts =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      this.charts.bins.data.datasets[0].data = Object.values(state.bins).map(v => Number(v.toFixed(1)));

      this.charts.compost.data.labels = labels;
      this.charts.compost.data.datasets[0].data = h.compostTemp;
      this.charts.compost.data.datasets[1].data = h.compostMoisture;

      this.charts.segregation.data.datasets[0].data = [
        state.sorter.segregation.wet,
        state.sorter.segregation.dry,
        state.sorter.segregation.metal
      ];

      this.charts.sanitization.data.labels = labels;
      this.charts.sanitization.data.datasets[0].data = h.odorPpm;

      Object.values(this.charts).forEach(chart => chart.update('none'));
    }
  }

  window.chartManager = new ChartManager();
})();
