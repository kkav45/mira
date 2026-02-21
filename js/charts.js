/**
 * MIRA 0.2 | Небосвод - Charts Module
 * Визуализация данных с помощью Chart.js
 */

const ChartsManager = {
  charts: {},

  // Общие настройки Chart.js
  getDefaultOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 11 },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { size: 10 }
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { size: 10 }
          }
        }
      }
    };
  },

  // Временной ряд метеопараметров
  createTimeSeriesChart(ctx, data) {
    const config = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Температура (°C)',
            data: data.temperature,
            borderColor: '#9f7aea',
            backgroundColor: 'rgba(159, 122, 234, 0.1)',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Ветер 10м (м/с)',
            data: data.windSpeed,
            borderColor: '#4299e1',
            backgroundColor: 'rgba(66, 153, 225, 0.1)',
            borderWidth: 2,
            fill: true,
            yAxisID: 'y1'
          },
          {
            label: 'Влажность (%)',
            data: data.humidity,
            borderColor: '#48bb78',
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        ...this.getDefaultOptions(),
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { font: { size: 10 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Температура (°C)',
              font: { size: 11 }
            },
            grid: { color: 'rgba(66, 153, 225, 0.1)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Ветер (м/с)',
              font: { size: 11 }
            },
            grid: { color: 'rgba(72, 187, 120, 0.1)' }
          },
          y2: {
            type: 'linear',
            display: false,
            position: 'right'
          }
        }
      }
    };

    this.charts.timeSeries = new Chart(ctx, config);
    return this.charts.timeSeries;
  },

  // Вертикальный профиль ветра
  createWindProfileChart(ctx, data) {
    const config = {
      type: 'line',
      data: {
        labels: data.windSpeed,
        datasets: [{
          label: 'Ветер (м/с)',
          data: data.altitudes,
          borderColor: '#0dcaf0',
          backgroundColor: 'rgba(13, 202, 240, 0.2)',
          borderWidth: 3,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#0dcaf0',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        indexAxis: 'y',
        scales: {
          x: {
            title: {
              display: true,
              text: 'Скорость ветра (м/с)',
              font: { size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          y: {
            title: {
              display: true,
              text: 'Высота (м)',
              font: { size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    };

    this.charts.windProfile = new Chart(ctx, config);
    return this.charts.windProfile;
  },

  // Вертикальный профиль температуры
  createTemperatureProfileChart(ctx, data) {
    const config = {
      type: 'line',
      data: {
        labels: data.temperature,
        datasets: [{
          label: 'Температура (°C)',
          data: data.altitudes,
          borderColor: '#fd7e14',
          backgroundColor: 'rgba(253, 126, 20, 0.2)',
          borderWidth: 3,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fd7e14',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        indexAxis: 'y',
        scales: {
          x: {
            title: {
              display: true,
              text: 'Температура (°C)',
              font: { size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          y: {
            title: {
              display: true,
              text: 'Высота (м)',
              font: { size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        }
      }
    };

    this.charts.tempProfile = new Chart(ctx, config);
    return this.charts.tempProfile;
  },

  // Роза ветров
  createWindRoseChart(ctx, data) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    
    const config = {
      type: 'radar',
      data: {
        labels: directions,
        datasets: [{
          label: 'Частота направления (%)',
          data: data.frequencies,
          backgroundColor: 'rgba(13, 110, 253, 0.2)',
          borderColor: '#0d6efd',
          borderWidth: 2,
          pointBackgroundColor: '#0d6efd',
          pointRadius: 3
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        scales: {
          r: {
            angleLines: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            pointLabels: {
              font: { size: 11 }
            },
            ticks: {
              display: false,
              stepSize: 10
            },
            suggestedMax: 30
          }
        }
      }
    };

    this.charts.windRose = new Chart(ctx, config);
    return this.charts.windRose;
  },

  // Индекс турбулентности
  createTurbulenceChart(ctx, data) {
    const backgroundColor = data.values.map(v => {
      if (v < 0.0003) return 'rgba(25, 135, 84, 0.7)';
      if (v < 0.0005) return 'rgba(255, 193, 7, 0.7)';
      return 'rgba(220, 53, 69, 0.7)';
    });

    const config = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Индекс турбулентности',
          data: data.values,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor.map(c => c.replace('0.7', '1')),
          borderWidth: 1
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        scales: {
          y: {
            title: {
              display: true,
              text: 'Индекс',
              font: { size: 12 }
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                let risk = value < 0.0003 ? 'Низкий' : (value < 0.0005 ? 'Умеренный' : 'Высокий');
                return `Индекс: ${value.toFixed(4)} (${risk})`;
              }
            }
          }
        }
      }
    };

    this.charts.turbulence = new Chart(ctx, config);
    return this.charts.turbulence;
  },

  // Высота облаков
  createCeilingChart(ctx, data) {
    const backgroundColor = data.values.map(v => {
      if (v > 100) return 'rgba(25, 135, 84, 0.7)';
      if (v > 50) return 'rgba(255, 193, 7, 0.7)';
      return 'rgba(220, 53, 69, 0.7)';
    });

    const config = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Высота нижней границы (м)',
          data: data.values,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor.map(c => c.replace('0.7', '1')),
          borderWidth: 1
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        scales: {
          y: {
            title: {
              display: true,
              text: 'Высота (м)',
              font: { size: 12 }
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    };

    this.charts.ceiling = new Chart(ctx, config);
    return this.charts.ceiling;
  },

  // Энергетический профиль
  createEnergyProfileChart(ctx, data) {
    const config = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Остаток энергии (мАч)',
            data: data.remaining,
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            borderWidth: 3,
            fill: true,
            pointRadius: 3
          },
          {
            label: 'Потребление (мАч)',
            data: data.consumption,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Мин. запас (мАч)',
            data: data.minReserve,
            borderColor: '#ffc107',
            borderWidth: 2,
            borderDash: [10, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        ...this.getDefaultOptions(),
        scales: {
          x: {
            title: {
              display: true,
              text: 'Расстояние (км)',
              font: { size: 12 }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Энергия (мАч)',
              font: { size: 12 }
            }
          }
        }
      }
    };

    this.charts.energy = new Chart(ctx, config);
    return this.charts.energy;
  },

  // Тепловая карта временных окон
  createHeatmapChart(ctx, data) {
    const config = {
      type: 'bar',
      data: {
        labels: data.map(item => item.time),
        datasets: [{
          label: 'Статус окна',
          data: data.map((item, i) => ({
            x: i,
            status: item.status,
            time: item.time
          })).map((d, i) => d.status === 'allowed' ? 1 : d.status === 'restricted' ? 0.5 : 0.2),
          backgroundColor: data.map(item => {
            if (item.status === 'allowed') return 'rgba(25, 135, 84, 0.9)';
            if (item.status === 'restricted') return 'rgba(255, 193, 7, 0.9)';
            return 'rgba(220, 53, 69, 0.9)';
          }),
          borderColor: data.map(item => {
            if (item.status === 'allowed') return 'rgba(25, 135, 84, 1)';
            if (item.status === 'restricted') return 'rgba(255, 193, 7, 1)';
            return 'rgba(220, 53, 69, 1)';
          }),
          borderWidth: 1,
          borderRadius: 3
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        indexAxis: 'x',
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { 
              font: { size: 9 },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            display: false,
            min: 0,
            max: 1.2
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const label = data[context.dataIndex];
                const statusText = label.status === 'allowed' ? '✅ Разрешено' : 
                                   label.status === 'restricted' ? '⚠️ Ограничено' : '❌ Запрещено';
                return [`Время: ${label.time}`, `Статус: ${statusText}`];
              },
              title: function(items) {
                return 'Временное окно';
              }
            }
          }
        }
      }
    };

    this.charts.heatmap = new Chart(ctx, config);
    return this.charts.heatmap;
  },

  // Обновление всех графиков новыми данными
  updateAllCharts(data) {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.data) {
        chart.data = data;
        chart.update();
      }
    });
  },

  // Уничтожение графика
  destroyChart(chartName) {
    if (this.charts[chartName]) {
      this.charts[chartName].destroy();
      delete this.charts[chartName];
    }
  },

  // Уничтожение всех графиков
  destroyAllCharts() {
    Object.keys(this.charts).forEach(key => {
      this.destroyChart(key);
    });
  }
};
