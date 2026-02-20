/**
 * MIRA 0.2 | Небосвод - Route Calculation Module
 * Расчёт маршрута, сегментов, энергопотребления
 */

const RouteCalculator = {
  // Параметры БВС по умолчанию
  defaultAircraft: {
    speed: 62, // км/ч
    batteryCapacity: 25300, // мАч
    consumptionRate: 177.3, // мАч/мин
    minReservePercent: 25 // минимальный запас %
  },

  // Расчёт расстояния между двумя точками (гаверсинус)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Расчёт компонентов ветра
  calculateWindComponents(windSpeed, windDirection, courseDirection) {
    const windAngleRad = (windDirection - courseDirection) * Math.PI / 180;
    
    const headwind = windSpeed * Math.cos(windAngleRad);
    const crosswind = windSpeed * Math.sin(windAngleRad);
    
    return {
      headwind: headwind > 0 ? headwind : 0,
      tailwind: headwind < 0 ? -headwind : 0,
      crosswind: Math.abs(crosswind)
    };
  },

  // Расчёт путевой скорости
  calculateGroundSpeed(airspeed, windSpeed, windDirection, courseDirection) {
    const windAngle = (windDirection - courseDirection) * Math.PI / 180;
    const groundSpeed = Math.sqrt(
      Math.pow(airspeed, 2) + Math.pow(windSpeed, 2) + 
      2 * airspeed * windSpeed * Math.cos(windAngle)
    );
    return groundSpeed;
  },

  // Расчёт энергетического коэффициента
  calculateEnergyCoefficient(headwind, tailwind, crosswind) {
    return 1.0 + 0.12 * (headwind / 5) - 0.08 * (tailwind / 5) + 0.05 * (crosswind / 5);
  },

  // Расчёт сегментов маршрута
  calculateSegments(routePoints, weatherData, aircraft = null) {
    const config = { ...this.defaultAircraft, ...aircraft };
    const segments = [];
    
    for (let i = 0; i < routePoints.length - 1; i++) {
      const start = routePoints[i];
      const end = routePoints[i + 1];
      
      // Расстояние
      const distance = this.calculateDistance(start.lat, start.lon, end.lat, end.lon);
      
      // Курс (направление)
      const course = this.calculateCourse(start.lat, start.lon, end.lat, end.lon);
      
      // Ветер на высоте полёта
      const windSpeed = weatherData?.wind || 5;
      const windDirection = weatherData?.windDir || 240;
      
      // Компоненты ветра
      const windComponents = this.calculateWindComponents(windSpeed, windDirection, course);
      
      // Путевая скорость
      const groundSpeed = this.calculateGroundSpeed(config.speed, windSpeed, windDirection, course);
      
      // Время прохождения
      const timeMinutes = (distance / groundSpeed) * 60;
      
      // Энергетический коэффициент
      const energyCoeff = this.calculateEnergyCoefficient(
        windComponents.headwind,
        windComponents.tailwind,
        windComponents.crosswind
      );
      
      // Энергопотребление
      const energy = timeMinutes * config.consumptionRate * energyCoeff;
      
      // Риск (упрощённо)
      let risk = 'low';
      if (windSpeed > 15 || windComponents.crosswind > 10) risk = 'high';
      else if (windSpeed > 10 || windComponents.crosswind > 5) risk = 'moderate';
      
      segments.push({
        id: i + 1,
        name: `${start.name || 'Точка ' + (i + 1)} → ${end.name || 'Точка ' + (i + 2)}`,
        start,
        end,
        distance: parseFloat(distance.toFixed(1)),
        time: Math.round(timeMinutes),
        energy: Math.round(energy),
        groundSpeed: parseFloat(groundSpeed.toFixed(1)),
        windComponents,
        course: Math.round(course),
        risk
      });
    }
    
    return segments;
  },

  // Расчёт направления (курс) между двумя точками
  calculateCourse(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  },

  // Расчёт точки невозврата (PNR)
  calculatePNR(segments, aircraft = null) {
    const config = { ...this.defaultAircraft, ...aircraft };
    
    const minReserve = config.batteryCapacity * config.minReservePercent / 100;
    const availableEnergy = config.batteryCapacity - minReserve;
    
    let accumulatedEnergy = 0;
    let accumulatedDistance = 0;
    let accumulatedTime = 0;
    let pnrIndex = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (accumulatedEnergy + segment.energy * 2 <= availableEnergy) {
        accumulatedEnergy += segment.energy;
        accumulatedDistance += segment.distance;
        accumulatedTime += segment.time;
        pnrIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Расчёт точного расстояния до PNR
    const remainingEnergy = availableEnergy - accumulatedEnergy;
    const nextSegment = segments[pnrIndex];
    
    let pnrDistance = accumulatedDistance;
    let pnrTime = accumulatedTime;
    
    if (nextSegment) {
      const ratio = remainingEnergy / (nextSegment.energy * 2);
      pnrDistance += nextSegment.distance * ratio;
      pnrTime += nextSegment.time * ratio;
    }
    
    return {
      distance: parseFloat(pnrDistance.toFixed(1)),
      time: Math.round(pnrTime),
      minReserve: Math.round(minReserve),
      availableEnergy: Math.round(availableEnergy),
      index: pnrIndex
    };
  },

  // Расчёт общего энергопотребления
  calculateTotalEnergy(segments) {
    return segments.reduce((sum, s) => sum + s.energy, 0);
  },

  // Расчёт общего времени полёта
  calculateTotalTime(segments) {
    return segments.reduce((sum, s) => sum + s.time, 0);
  },

  // Расчёт общего расстояния
  calculateTotalDistance(segments) {
    return segments.reduce((sum, s) => sum + s.distance, 0);
  },

  // Проверка возможности полёта
  checkFlightFeasibility(segments, aircraft = null) {
    const config = { ...this.defaultAircraft, ...aircraft };
    
    const totalEnergy = this.calculateTotalEnergy(segments);
    const totalDistance = this.calculateTotalDistance(segments);
    const totalTime = this.calculateTotalTime(segments);
    const minReserve = config.batteryCapacity * config.minReservePercent / 100;
    
    const requiredEnergy = totalEnergy + minReserve;
    const isFeasible = requiredEnergy <= config.batteryCapacity;
    
    return {
      isFeasible,
      totalEnergy: Math.round(totalEnergy),
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      totalTime,
      minReserve: Math.round(minReserve),
      requiredEnergy: Math.round(requiredEnergy),
      energyMargin: Math.round(config.batteryCapacity - requiredEnergy),
      marginPercent: ((config.batteryCapacity - requiredEnergy) / config.batteryCapacity * 100).toFixed(1)
    };
  },

  // Генерация отчёта по маршруту
  generateRouteReport(routePoints, weatherData, aircraft = null) {
    const segments = this.calculateSegments(routePoints, weatherData, aircraft);
    const pnr = this.calculatePNR(segments, aircraft);
    const feasibility = this.checkFlightFeasibility(segments, aircraft);
    
    return {
      segments,
      pnr,
      feasibility,
      summary: {
        totalDistance: feasibility.totalDistance,
        totalTime: feasibility.totalTime,
        totalEnergy: feasibility.totalEnergy,
        riskLevel: this.calculateOverallRisk(segments)
      }
    };
  },

  // Расчёт общего уровня риска
  calculateOverallRisk(segments) {
    const riskScores = { low: 1, moderate: 2, high: 3 };
    const totalScore = segments.reduce((sum, s) => sum + riskScores[s.risk], 0);
    const avgScore = totalScore / segments.length;
    
    if (avgScore < 1.5) return 'low';
    if (avgScore < 2.5) return 'moderate';
    return 'high';
  }
};
