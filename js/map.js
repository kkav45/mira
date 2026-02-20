/**
 * MIRA 0.2 | Небосвод - Map Module
 * Визуализация карты с помощью OpenLayers
 */

const MapManager = {
  map: null,
  layers: {},
  features: {},

  // Инициализация карты
  init(targetId = 'map') {
    // Базовый слой OSM
    const osmLayer = new ol.layer.Tile({
      source: new ol.source.OSM({
        attributions: '© OpenStreetMap contributors | Данные: Open-Meteo'
      }),
      visible: true
    });

    // Слой маршрута
    const routeSource = new ol.source.Vector();
    const routeLayer = new ol.layer.Vector({
      source: routeSource,
      style: this.getRouteStyle()
    });

    // Слой точек анализа
    const pointsSource = new ol.source.Vector();
    const pointsLayer = new ol.layer.Vector({
      source: pointsSource,
      zIndex: 10
    });

    // Слой зон посадки
    const landingSource = new ol.source.Vector();
    const landingLayer = new ol.layer.Vector({
      source: landingSource,
      style: this.getLandingZoneStyle()
    });

    // Слой зон риска
    const riskSource = new ol.source.Vector();
    const riskLayer = new ol.layer.Vector({
      source: riskSource,
      style: this.getRiskZoneStyle()
    });

    // Слой PNR (точка невозврата)
    const pnrSource = new ol.source.Vector();
    const pnrLayer = new ol.layer.Vector({
      source: pnrSource,
      style: this.getPnrStyle()
    });

    // Создание карты
    this.map = new ol.Map({
      target: targetId,
      layers: [
        osmLayer,
        riskLayer,
        pnrLayer,
        routeLayer,
        landingLayer,
        pointsLayer
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([66.6, 55.28]),
        zoom: 9,
        minZoom: 6,
        maxZoom: 18
      }),
      controls: ol.control.defaults.defaults({
        zoom: true,
        attribution: true,
        rotation: false
      })
    });

    // Сохранение источников слоёв
    this.layers = {
      osm: osmLayer,
      route: routeLayer,
      points: pointsLayer,
      landing: landingLayer,
      risk: riskLayer,
      pnr: pnrLayer
    };

    this.features = {
      route: routeSource,
      points: pointsSource,
      landing: landingSource,
      risk: riskSource,
      pnr: pnrSource
    };

    // Добавление всплывающих подсказок
    this.addPopup();

    return this.map;
  },

  // Стили для маршрута
  getRouteStyle() {
    return function(feature) {
      const risk = feature.get('risk') || 'low';
      let color;

      switch (risk) {
        case 'high': color = '#dc3545'; break;
        case 'moderate': color = '#ffc107'; break;
        default: color = '#198754';
      }

      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: color,
          width: 4
        }),
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color: color }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
      });
    };
  },

  // Стили для зон посадки
  getLandingZoneStyle() {
    return function(feature) {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#198754',
          width: 2,
          lineDash: [5, 5]
        }),
        fill: new ol.style.Fill({
          color: 'rgba(25, 135, 84, 0.1)'
        }),
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({ color: '#198754' }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
      });
    };
  },

  // Стили для зон риска
  getRiskZoneStyle() {
    return function(feature) {
      const level = feature.get('level') || 'moderate';
      let color, fillColor;

      if (level === 'high') {
        color = '#dc3545';
        fillColor = 'rgba(220, 53, 69, 0.15)';
      } else {
        color = '#ffc107';
        fillColor = 'rgba(255, 193, 7, 0.15)';
      }

      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: color,
          width: 2
        }),
        fill: new ol.style.Fill({ color: fillColor })
      });
    };
  },

  // Стили для PNR
  getPnrStyle() {
    return function(feature) {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#0d6efd',
          width: 2,
          lineDash: [5, 5]
        }),
        fill: new ol.style.Fill({
          color: 'rgba(13, 110, 253, 0.05)'
        }),
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color: '#0d6efd' }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
      });
    };
  },

  // Добавление маршрута
  addRoute(coordinates) {
    const features = [];
    const lineCoordinates = [];

    coordinates.forEach((point, index) => {
      const lonLat = ol.proj.fromLonLat([point.lon, point.lat]);
      lineCoordinates.push(lonLat);

      // Точки маршрута
      const pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(lonLat),
        name: point.name || `Точка ${index + 1}`,
        altitude: point.altitude || 500,
        risk: point.risk || 'low'
      });

      features.push(pointFeature);
    });

    // Линия маршрута
    const lineFeature = new ol.Feature({
      geometry: new ol.geom.LineString(lineCoordinates)
    });

    features.push(lineFeature);

    // Очистка и добавление
    this.features.route.clear();
    this.features.points.clear();
    this.features.route.addFeature(lineFeature);
    features.forEach(f => {
      if (!(f.getGeometry() instanceof ol.geom.LineString)) {
        this.features.points.addFeature(f);
      }
    });

    // Центрирование на маршруте
    this.fitToFeatures([...features]);
  },

  // Добавление зон посадки
  addLandingZones(zones) {
    this.features.landing.clear();

    zones.forEach(zone => {
      const center = ol.proj.fromLonLat([zone.lon, zone.lat]);
      
      // Круглая зона
      const circle = ol.geom.Polygon.circular(center, zone.radius || 500, 32);
      const feature = new ol.Feature({
        geometry: circle,
        name: zone.name || 'Зона посадки',
        radius: zone.radius || 500
      });

      this.features.landing.addFeature(feature);
    });
  },

  // Добавление зон риска
  addRiskZones(zones) {
    this.features.risk.clear();

    zones.forEach(zone => {
      const center = ol.proj.fromLonLat([zone.lon, zone.lat]);
      
      const circle = ol.geom.Polygon.circular(center, zone.radius || 1000, 32);
      const feature = new ol.Feature({
        geometry: circle,
        name: zone.name || 'Зона риска',
        level: zone.level || 'moderate'
      });

      this.features.risk.addFeature(feature);
    });
  },

  // Добавление PNR (точка невозврата)
  addPNR(center, radius) {
    this.features.pnr.clear();

    const centerLonLat = ol.proj.fromLonLat([center.lon, center.lat]);
    const circle = ol.geom.Polygon.circular(centerLonLat, radius * 1000, 64);
    
    const feature = new ol.Feature({
      geometry: circle,
      name: 'Точка невозврата (PNR)',
      radius: radius
    });

    this.features.pnr.addFeature(feature);

    // Маркер центра
    const centerFeature = new ol.Feature({
      geometry: new ol.geom.Point(centerLonLat),
      name: 'Центр PNR'
    });

    this.features.pnr.addFeature(centerFeature);
  },

  // Добавление маркера аэродрома
  addAerodromeMarker(aerodrome) {
    const center = ol.proj.fromLonLat([aerodrome.lon, aerodrome.lat]);
    
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(center),
      name: aerodrome.name || 'Аэродром',
      icao: aerodrome.icao,
      elevation: aerodrome.elevation,
      type: 'aerodrome'
    });

    feature.setStyle(new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [0.5, 1],
        src: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0d6efd">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        `)
      })
    }));

    this.features.points.addFeature(feature);
  },

  // Добавление векторов ветра
  addWindVectors(vectors) {
    // vectors: [{lat, lon, speed, direction, altitude}]
    const features = vectors.map(v => {
      const center = ol.proj.fromLonLat([v.lon, v.lat]);
      
      // Создание стрелки ветра
      const arrow = this.createWindArrow(center, v.speed, v.direction);
      
      const feature = new ol.Feature({
        geometry: arrow,
        name: `Ветер ${v.altitude}м`,
        speed: v.speed,
        direction: v.direction,
        altitude: v.altitude
      });

      // Цвет в зависимости от скорости
      let color = '#0dcaf0';
      if (v.speed > 15) color = '#dc3545';
      else if (v.speed > 10) color = '#ffc107';
      
      feature.setStyle(new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: color,
          width: 3
        })
      }));

      return feature;
    });

    // Очистка и добавление (можно выделить в отдельный слой)
    // this.features.wind.clear();
    // features.forEach(f => this.features.wind.addFeature(f));
  },

  // Добавление сегментов маршрута с рисками
  addRouteWithRisks(coordinates, risks = []) {
    const features = [];
    const lineCoordinates = [];

    coordinates.forEach((point, index) => {
      const lonLat = ol.proj.fromLonLat([point.lon, point.lat]);
      lineCoordinates.push(lonLat);

      // Определение риска для точки
      const risk = risks[index] || 'low';
      
      // Точки маршрута
      const pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(lonLat),
        name: point.name || `Точка ${index + 1}`,
        altitude: point.altitude || 500,
        risk: risk
      });

      features.push(pointFeature);
    });

    // Создание сегментов с разным цветом риска
    for (let i = 0; i < lineCoordinates.length - 1; i++) {
      const segment = new ol.geom.LineString([
        lineCoordinates[i],
        lineCoordinates[i + 1]
      ]);
      
      const risk = risks[i] || 'low';
      const segmentFeature = new ol.Feature({
        geometry: segment,
        risk: risk,
        segmentIndex: i
      });

      segmentFeature.setStyle(this.getRouteSegmentStyle(risk));
      features.push(segmentFeature);
    }

    // Очистка и добавление
    this.features.route.clear();
    this.features.points.clear();
    
    features.forEach(f => {
      const geom = f.getGeometry();
      if (geom instanceof ol.geom.LineString) {
        this.features.route.addFeature(f);
      } else if (geom instanceof ol.geom.Point) {
        this.features.points.addFeature(f);
      }
    });

    // Центрирование на маршруте
    this.fitToFeatures(features);
  },

  // Стили для сегмента маршрута
  getRouteSegmentStyle(risk) {
    let color, width;

    switch (risk) {
      case 'high':
        color = '#dc3545';
        width = 5;
        break;
      case 'moderate':
        color = '#ffc107';
        width = 4;
        break;
      default:
        color = '#198754';
        width = 3;
    }

    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: color,
        width: width,
        lineCap: 'round'
      })
    });
  },

  // Создание стрелки ветра
  createWindArrow(center, speed, direction) {
    const length = Math.min(50, speed * 5);
    const rotation = (direction + 180) * Math.PI / 180;

    const dx = Math.cos(rotation) * length;
    const dy = Math.sin(rotation) * length;

    const line = new ol.geom.LineString([
      [center[0] - dx, center[1] - dy],
      [center[0], center[1]]
    ]);

    return line;
  },

  // Центрирование на элементах
  fitToFeatures(features, padding = 50) {
    if (!features || features.length === 0) return;

    const extent = ol.extent.createEmpty();
    features.forEach(feature => {
      ol.extent.extend(extent, feature.getGeometry().getExtent());
    });

    this.map.getView().fit(extent, {
      padding: [padding, padding, padding, padding],
      duration: 500
    });
  },

  // Центрирование на координатах
  centerOn(lat, lon, zoom = 10) {
    this.map.getView().animate({
      center: ol.proj.fromLonLat([lon, lat]),
      zoom: zoom,
      duration: 500
    });
  },

  // Добавление всплывающего окна
  addPopup() {
    const container = document.createElement('div');
    container.className = 'ol-popup';
    container.id = 'popup';

    const content = document.createElement('div');
    content.id = 'popup-content';

    const closer = document.createElement('div');
    closer.className = 'ol-popup-closer';
    closer.innerHTML = '×';
    closer.style.cssText = 'position:absolute;top:5px;right:8px;cursor:pointer;font-size:18px;color:#666;';
    closer.onclick = () => {
      container.style.display = 'none';
      return false;
    };

    container.appendChild(closer);
    container.appendChild(content);
    document.getElementById('map').appendChild(container);

    const overlay = new ol.Overlay({
      element: container,
      autoPan: true,
      autoPanAnimation: { duration: 250 }
    });

    this.map.addOverlay(overlay);

    // Обработчик клика
    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      
      if (feature) {
        const props = feature.getProperties();
        let html = `<div class="ol-popup__title">${props.name || 'Объект'}</div>`;
        
        if (props.altitude) html += `<div class="ol-popup__row"><span>Высота:</span><span>${props.altitude} м</span></div>`;
        if (props.speed) html += `<div class="ol-popup__row"><span>Скорость:</span><span>${props.speed} м/с</span></div>`;
        if (props.direction) html += `<div class="ol-popup__row"><span>Направление:</span><span>${props.direction}°</span></div>`;
        if (props.icao) html += `<div class="ol-popup__row"><span>ICAO:</span><span>${props.icao}</span></div>`;
        if (props.elevation) html += `<div class="ol-popup__row"><span>Высота над уровнем моря:</span><span>${props.elevation} м</span></div>`;
        if (props.radius) html += `<div class="ol-popup__row"><span>Радиус:</span><span>${props.radius} м</span></div>`;
        if (props.risk) {
          const riskText = props.risk === 'high' ? 'Высокий' : (props.risk === 'moderate' ? 'Умеренный' : 'Низкий');
          html += `<div class="ol-popup__row"><span>Риск:</span><span>${riskText}</span></div>`;
        }

        content.innerHTML = html;
        overlay.setPosition(evt.coordinate);
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });

    // Обработчик клика для получения координат
    this.map.on('click', (evt) => {
      const coordinate = evt.coordinate;
      const lonLat = ol.proj.toLonLat(coordinate);
      const lon = lonLat[0];
      const lat = lonLat[1];

      // Обновление UI
      const coordsEl = document.getElementById('click-coords');
      if (coordsEl) {
        coordsEl.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }

      // Обновление полей ввода
      const latInput = document.getElementById('input-lat');
      const lonInput = document.getElementById('input-lon');
      if (latInput) latInput.value = lat.toFixed(4);
      if (lonInput) lonInput.value = lon.toFixed(4);

      // Обновление координат в заголовке
      const headerCoordsEl = document.getElementById('header-coords');
      if (headerCoordsEl) {
        headerCoordsEl.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
      }

      // Запрос высоты
      WeatherAPI.fetchElevation(lat, lon).then(elevation => {
        const elevationEl = document.getElementById('click-elevation');
        if (elevationEl) {
          elevationEl.textContent = elevation ? `${elevation} м` : '-- м';
        }
      }).catch(() => {
        const elevationEl = document.getElementById('click-elevation');
        if (elevationEl) {
          elevationEl.textContent = '-- м';
        }
      });

      // Добавление маркера клика
      this.addClickMarker(coordinate, lat, lon);
    });

    // Курсор при наведении
    this.map.on('pointermove', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      this.map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    });
  },

  // Добавление маркера клика
  addClickMarker(coordinate, lat, lon) {
    // Очистка предыдущих маркеров клика
    const existingMarkers = this.features.points.getFeatures().filter(f => f.get('type') === 'click-marker');
    existingMarkers.forEach(f => this.features.points.removeFeature(f));

    // Создание нового маркера
    const marker = new ol.Feature({
      geometry: new ol.geom.Point(coordinate),
      name: 'Точка анализа',
      type: 'click-marker',
      lat: lat,
      lon: lon
    });

    marker.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,
        fill: new ol.style.Fill({ color: '#0d6efd' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      })
    }));

    this.features.points.addFeature(marker);
  },

  // Добавление тепловой карты рисков
  addRiskHeatmap(riskData) {
    // riskData: [{lat, lon, risk: 0-1}]
    const features = riskData.map(point => {
      const center = ol.proj.fromLonLat([point.lon, point.lat]);
      
      // Цвет на основе уровня риска
      const risk = point.risk;
      let color;
      
      if (risk < 0.3) {
        color = 'rgba(25, 135, 84, 0.3)'; // зелёный
      } else if (risk < 0.6) {
        color = 'rgba(255, 193, 7, 0.3)'; // жёлтый
      } else {
        color = 'rgba(220, 53, 69, 0.3)'; // красный
      }
      
      // Круг влияния
      const circle = ol.geom.Polygon.circular(center, 5000, 32);
      const feature = new ol.Feature({
        geometry: circle,
        risk: risk
      });
      
      feature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({
          color: color.replace('0.3', '0.6'),
          width: 1
        })
      }));
      
      return feature;
    });

    // Можно добавить в отдельный слой heatmap
    // this.features.heatmap.clear();
    // features.forEach(f => this.features.heatmap.addFeature(f));
  },

  // Добавление слоя облачности
  addCloudLayer(cloudData) {
    // cloudData: [{lat, lon, coverage: 0-100, base: высота}]
    const features = cloudData.map(point => {
      const center = ol.proj.fromLonLat([point.lon, point.lat]);
      
      // Прозрачность на основе покрытия
      const opacity = point.coverage / 100 * 0.5;
      
      const circle = ol.geom.Polygon.circular(center, 10000, 32);
      const feature = new ol.Feature({
        geometry: circle,
        cloudCover: point.coverage,
        cloudBase: point.base
      });
      
      feature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: `rgba(200, 200, 200, ${opacity})`
        })
      }));
      
      return feature;
    });

    // this.features.clouds.clear();
    // features.forEach(f => this.features.clouds.addFeature(f));
  },

  // Включение/выключение слоёв
  toggleLayer(layerName, visible) {
    if (this.layers[layerName]) {
      this.layers[layerName].setVisible(visible);
    }
  },

  // Получить видимость слоя
  isLayerVisible(layerName) {
    return this.layers[layerName] ? this.layers[layerName].getVisible() : false;
  },

  // Очистка всех слоёв
  clearAll() {
    Object.values(this.features).forEach(source => {
      if (source) source.clear();
    });
  },

  // Уничтожение карты
  destroy() {
    if (this.map) {
      this.map.setTarget(null);
      this.map = null;
      this.layers = {};
      this.features = {};
    }
  }
};
