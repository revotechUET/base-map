module.exports.getCoordFromDepth = getCoordFromDepth;
module.exports.getDepthSpecsFromWell = getDepthSpecsFromWell;
module.exports.getWellIconMarker = getWellIconMarker;
module.exports.getWellColorMarker = getWellColorMarker;
module.exports.getWellType = getWellType;
module.exports.getX = getX;
module.exports.getY = getY;
module.exports.getLat = getLat;
module.exports.getLong = getLong;
module.exports.getDpi = getDpi;

async function getCoordFromDepth(depth, well, curveRawDataFn, zoneMap, wiApi, alertFn, options = {}) {
    let x, y, lat, lng;
    if (Array.isArray(depth)) {
        x = []; y = []; lat = []; lng = [];
    }
    const indexDataset = well.datasets.find(ds => ds.name == "INDEX");
    if (indexDataset) {
        const xOffsetCurve = indexDataset.curves.find(c => c.idFamily == 762)
        const yOffsetCurve = indexDataset.curves.find(c => c.idFamily == 764)

        if (xOffsetCurve && yOffsetCurve) {
            const top = Number(indexDataset.top);
            const step = Number(indexDataset.step);
            const xOffsetData = await new Promise((res) => {
                curveRawDataFn(xOffsetCurve.idCurve, (err, data) => {
                    res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign(d, { depth: top + step * d.y })));
                });
            });
            const yOffsetData = await new Promise((res) => {
                curveRawDataFn(yOffsetCurve.idCurve, (err, data) => {
                    res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign(d, { depth: top + step * d.y })));
                });
            });

            if (xOffsetData.length && yOffsetData.length) {
                const firstProjection = zoneMap;
                const secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

                const _lat = getLat(well.well_headers);
                const _lng = getLong(well.well_headers);
                const _x = getX(well.well_headers);
                const _y = getY(well.well_headers);

                let _xOffset, _yOffset;
                const xScale = d3.scaleLinear().domain(xOffsetData.map(p => p.depth || p.y)).range(xOffsetData.map(p => p.x));
                const yScale = d3.scaleLinear().domain(yOffsetData.map(p => p.depth || p.y)).range(yOffsetData.map(p => p.x));
                if (Array.isArray(depth)) {
                    _xOffset = depth.map(d => wiApi.convertUnit(xScale(d), xOffsetCurve.unit, "m"));
                    _yOffset = depth.map(d => wiApi.convertUnit(yScale(d), yOffsetCurve.unit, "m"));
                } else {
                    _xOffset = wiApi.convertUnit(xScale(depth), xOffsetCurve.unit, "m");
                    _yOffset = wiApi.convertUnit(yScale(depth), yOffsetCurve.unit, "m");
                }

                const _checkCoordResult = checkCoordinate(_lat, _lng, _x, _y, options.preferXY);
                // have valid lat, long coordinates, ignore x, y
                if (_checkCoordResult == true) {
                    // calculate new lat/lng, x/y from x, y offset
                    if (Array.isArray(depth)) {
                        const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
                        depth.forEach((d, i) => {
                            const _originalXY = proj4(secondProjection, firstProjection, [_lng, _lat]);
                            x[i] = _originalXY[0] + _xOffset[i];
                            y[i] = _originalXY[1] + _yOffset[i];
                            const _destLatLng = proj4(firstProjection,secondProjection, [x[i], y[i]]);
                            lat[i] = _destLatLng[1];
                            lng[i] = _destLatLng[0];
                        })
                    } else {
                        const _originalXY = proj4(secondProjection, firstProjection, [_lng, _lat]);
                        x = _originalXY[0] + _xOffset;
                        y = _originalXY[1] + _yOffset;
                        const _destLatLng = proj4(firstProjection,secondProjection, [x, y]);
                        lat = _destLatLng[1];
                        lng = _destLatLng[0];
                    }
                // have valid x, y coordinates
                } else if (_checkCoordResult == false) {
                    // calculate new lat/lng from new x, y
                    if (Array.isArray(depth)) {
                        depth.forEach((d, i) => {
                            x[i] = _x + _xOffset[i];
                            y[i] = _y + _yOffset[i];
                            const prjResult = proj4(firstProjection, secondProjection, [x[i], y[i]]);
                            lat[i] = prjResult[1];
                            lng[i] = prjResult[0];
                        })
                    } else {
                        x = _x + _xOffset;
                        y = _y + _yOffset;
                        const prjResult = proj4(firstProjection, secondProjection, [x, y]);
                        lat = prjResult[1];
                        lng = prjResult[0];
                    }
                }
            }
        } else {
            console.warn(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`);
            alertFn && alertFn(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`, well.name);
        }
    } else {
        console.warn(`Cannot find INDEX dataset in well ${well.name}`);
        alertFn && alertFn(`Cannot find INDEX dataset in well ${well.name}`, well.name);
    }
    if (Array.isArray(depth)) {
        return depth.map((d, i) => {
            return { x: x[i], y: y[i], lat: lat[i], lng: lng[i] };
        })
    }
    return { x, y, lat, lng };
}

function getLat(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "LATI") {
            if (isNaN(wellIndex[index].value)) {
                return Number(ConvertDMSToDD(wellIndex[index].value));
            }
            return Number(wellIndex[index].value);
        }
    }
    return 0;
}

function getLong(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "LONG") {
            if (isNaN(wellIndex[index].value)) {
                return Number(ConvertDMSToDD(wellIndex[index].value));
            }
            return Number(wellIndex[index].value);
        }
    }
    return 0;
}

function getX(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "E" && _.isFinite(wellIndex[index].value)) {
            const value = Number(wellIndex[index].value);
            return isNaN(value) ? 0 : value;
        }
    }
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "X") {
            const value = Number(wellIndex[index].value);
            return isNaN(value) ? 0 : value;
        }
    }
    return 0;
}

function getY(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "N" && _.isFinite(wellIndex[index].value)) {
            const value = Number(wellIndex[index].value);
            return isNaN(value) ? 0 : value;
        }
    }
    for (let index = 0; index < wellIndex.length; index++) {
        if (wellIndex[index].header === "Y") {
            const value = Number(wellIndex[index].value);
            return isNaN(value) ? 0 : value;
        }
    }
    return 0;
}

function checkCoordinate(lat, long, x, y, preferXY = false) {
    if (preferXY && (x && y))
        return false;
    if ((!lat || !long) && (x && y)) {
        return false;
    } else if ((!lat || !long) && (!x || !y)) {
        return undefined;
    }
    return true;
}

function getDepthSpecsFromWell(well, wiApi) {
    const headerSpec = {
        topDepth: wiApi.convertUnit(Number((well.well_headers.find(h => h.header == "STRT") || {}).value), well.unit, "m"),
        bottomDepth: wiApi.convertUnit(Number((well.well_headers.find(h => h.header == "STOP") || {}).value), well.unit, "m")
    };
    if (headerSpec.topDepth != headerSpec.bottomDepth) return headerSpec;
    if (!well.datasets || !well.datasets.length) return headerSpec;
    const mergedTop = _.min(well.datasets.map(d => wiApi.convertUnit(Number(d.top), d.unit, 'm')))
    const mergedBot = _.max(well.datasets.map(d => wiApi.convertUnit(Number(d.bottom), d.unit, 'm')));
    return {
        topDepth: mergedTop,
        bottomDepth: mergedBot
    }
}
function getWellIconMarker (wellHeader) {
    if (getWellType(wellHeader) === 'exploration') {
      return "search";
    } else if (getWellType(wellHeader) === 'production') {
      return "arrow_up";
    } else if (getWellType(wellHeader) === 'injection') {
      return "arrow_down";
    } else {
      return "well";
    }
}

function getWellColorMarker(wellHeader) {
    if (getFluidCode(wellHeader) === 'gas') {
      return '#ff6868'
    } else if (getFluidCode(wellHeader) === 'water') {
      return '#559bf3'
    } else if (getFluidCode(wellHeader) === 'condensate') {
      return '#a0a0a0'
    } else if (getFluidCode(wellHeader) === 'oil') {
      return '#15b153'
    } else {
      return '#585858'
    }
}

function getFluidCode(wellHeader) {
    if (!(wellHeader || []).length) return 0;
    for (let index = 0; index < wellHeader.length; index++) {
      if (wellHeader[index].header === "FLUID") {
        return wellHeader[index].value.replace(/\s+/g, '').toLowerCase();
      }
    }
    return 0;
}

function getWellType(wellHeader) {
    if (!(wellHeader || []).length) return 0;
    for (let index = 0; index < wellHeader.length; index++) {
        if (wellHeader[index].header === "WTYPE") {
            return wellHeader[index].value.replace(/\s+/g, '').toLowerCase();
        }
    }
    return 0;
}

let __cachedDpi = {};
const CACHED_DPI_TIMEOUT = 60000; // 1 minute
function getDpi() {
    if(__cachedDpi.value && (Date.now() - __cachedDpi.lastUpdate) <= CACHED_DPI_TIMEOUT) {
        return __cachedDpi.value;
    }

    let inch = document.createElement('inch');
    inch.style = 'height: 1in; width: 1in; left: -100%; position: absolute; top: -100%;';
    document.body.appendChild(inch);
    let devicePixelRatio = window.devicePixelRatio || 1;
    let dpi = inch.clientWidth * devicePixelRatio;
    document.body.removeChild(inch);

    __cachedDpi.value = dpi;
    __cachedDpi.lastUpdate = Date.now();

    return dpi;
}
