module.exports = Contour;
const MIN_COOR = 0.1;
const PROPAGATE_RATE = 9/10;
const NUM_OF_CONTOURS = 10;
function Contour(container, map, data) {
    const self = this;
    this.container = d3.select(container);
    this.map = map;
    this.data = data;

    const viewWidth = this.container.node().offsetWidth;
    const viewHeight = this.container.node().offsetHeight;

    // create canvas
    let canvas = this.container.select('canvas');
    if (!canvas.node())
        canvas = this.container
            .append('canvas')
            .attr('width', viewWidth)
            .attr('height', viewHeight)
            .style('background-color', 'rgba(230, 230, 230, 0.1)');
    this.canvas = canvas.node();

    const DEBOUNCED_TIMEOUT = 0;
    this.drawGrid = drawGrid;
    this.drawContour = drawContour;
    this.drawGridDebounced = _.debounce(drawGrid, DEBOUNCED_TIMEOUT);
    this.drawContourDebounced = _.debounce(drawContour, DEBOUNCED_TIMEOUT);

    function clearLayer() {
        requestAnimationFrame(() => {
            const context = self.canvas.getContext('2d');
            context.clearRect(0, 0, viewWidth, viewHeight);
        })
    }

    const EPSILON = 10e-9;
    function getBounds() {
        const minLat = d3.min(self.data, (d => d.lat));
        const maxLat = d3.max(self.data, (d => d.lat));
        const minLng = d3.min(self.data, (d => d.lng));
        const maxLng = d3.max(self.data, (d => d.lng));
        if (minLat && maxLat && minLng && maxLng)
            return {
                _sw: { lat: Math.floor(minLat - EPSILON), lng: Math.floor(minLng - EPSILON) },
                _ne: { lat: Math.ceil(maxLat + EPSILON), lng: Math.ceil(maxLng + EPSILON) }
            }
        else
            return {
                _sw: { lat: 0, lng: 0 },
                _ne: { lat: 0, lng: 0 }
            };
        /*
        const zoneNumberRegex = /\+zone=([0-9]+)/g
        const isSouthRegex = /\+south/g
        if (self.zoneMap && typeof(self.zoneMap) === 'string') {
            const zoneNumberTest = zoneNumberRegex.exec(self.zoneMap);
            const isSouthTest = isSouthRegex.exec(self.zoneMap);
            const _ne = { lat: 0, lng: 0 };
            const _sw = { lat: 0, lng: 0 };
            if (zoneNumberTest && zoneNumberTest.length) {
                const zoneNum = Number(zoneNumberTest[1])
                if (isSouthTest) {
                    // _sw.lat = ;
                    // _sw.lng = ;
                    // _ne.lat = ;
                    // _ne.lng = ;
                    return { _ne, _sw};
                } else {
                    // _sw.lat = ;
                    // _sw.lng = ;
                    // _ne.lat = ;
                    // _ne.lng = ;
                    return { _ne, _sw};
                }
            } else {
                return { _ne, _sw };
            }
        }
        return null;
        */
    }

    function getGrid() {
        const bounds = getBounds();
        const sw = bounds._sw;
        const ne = bounds._ne;
        const lats = [Math.floor(sw.lat), Math.ceil(ne.lat)];
        const lngs = [Math.floor(sw.lng), Math.ceil(ne.lng)];
        return {
            lats: d3.range(d3.min(lats), d3.max(lats) + 1, MIN_COOR),
            lngs: d3.range(d3.min(lngs), d3.max(lngs), MIN_COOR)
        }
    }
    function drawGrid() {
        clearLayer();
        requestAnimationFrame(_drawGrid);
    }
    function _drawGrid() {
        const context = self.canvas.getContext('2d');
        // context.clearRect(0, 0, viewWidth, viewHeight);
        const { lats, lngs } = getGrid();
        context.strokeStyle = 'rgba(50, 50, 50, 0.1)';
        lats.forEach(lat => {
            context.beginPath();
            lngs.forEach((lng, i) => {
                const { x, y } = map.project({ lat, lng });
                if (i == 0)
                    context.moveTo(x, y);
                else
                    context.lineTo(x, y);
            });
            context.stroke();
        })
        lngs.forEach(lng => {
            context.beginPath();
            lats.forEach((lat, i) => {
                const { x, y } = map.project({ lat, lng });
                if (i == 0)
                    context.moveTo(x, y);
                else
                    context.lineTo(x, y);
            });
            context.stroke();
        })
    }
    function getColorScale(contourData) {
        interpolateTerrain = (() => {
            const i0 = d3.interpolateHsvLong(d3.hsv(120, 1, 0.65), d3.hsv(60, 1, 0.90));
            const i1 = d3.interpolateHsvLong(d3.hsv(60, 1, 0.90), d3.hsv(0, 0, 0.95));
            return t => t < MIN_COOR ? i0(t * 2) : i1((t - MIN_COOR) * 2);
        })();
        return d3.scaleSequential(interpolateTerrain).domain(d3.extent(contourData.values)).nice();
    }
    function calcValueFromDistance(value, distance, {totalValue, meanValue}) {
        return value / ((distance / MIN_COOR) ** 1);
    }
    function getLng(lng) {
        return self.map.getCenter().lng < 0 ? -1 * (360 - lng):lng;
    }
    function generalizeData(data, {minLat, minLng}) {
        return data.map(d => ({
            lat: minLat + Math.ceil((d.lat - minLat) / MIN_COOR) * MIN_COOR,
            lng: minLng + Math.floor((getLng(d.lng) - minLng) / MIN_COOR) * MIN_COOR,
            value: d.value
        }))
    }
    function isInSide({lat, lng}, {lats, lngs}, {ignoreCenterPoint}={}) {
        const minLat = d3.min(lats);
        const maxLat = d3.max(lats);
        const minLng = d3.min(lngs);
        const maxLng = d3.max(lngs);
        return (lat - minLat) * (lat - maxLat) <= 0
            && (
                    ignoreCenterPoint
                    ? ((lng - minLng) * (lng - maxLng) <= 0)
                    : ((getLng(lng) - minLng) * (getLng(lng) - maxLng) <= 0)
                );
    }
    function calcValue(index, contourData, data, maxLat, minLng) {
        const lat = maxLat - Math.floor(index / contourData.width) * MIN_COOR;
        const lng = minLng + (index % contourData.width) * MIN_COOR;

        const totalValue = data.reduce((acc, curr) => (acc + curr.value), 0);
        const meanValue = totalValue / data.length

        const combinedVector = data.reduce((acc, curr) => {
            if (isInSide(curr, getGrid(), {ignoreCenterPoint: true})) {
                const vector = {
                    lat: (curr.lat - lat),
                    lng: (curr.lng - lng)
                };
                const distance = Math.sqrt(vector.lat ** 2 + vector.lng ** 2);
                const mag = calcValueFromDistance(curr.value, distance, { totalValue, meanValue });

                let latMag = 0;
                let lngMag = 0;
                if (vector.lat != 0) {
                    const lnglatRatio = vector.lng / vector.lat;
                    latMag = mag / Math.sqrt(1 + lnglatRatio ** 2);
                    lngMag = latMag * lnglatRatio;
                } else {
                    latMag = 0;
                    lngMag = mag;
                }

                acc.lat += Math.sign(vector.lat) * latMag;
                acc.lng += Math.sign(vector.lng) * lngMag;
                // acc.lat *= PROPAGATE_RATE;
                // acc.lng *= PROPAGATE_RATE;
            }
            return acc;
        }, {lat: 0, lng: 0});
        return Math.sqrt(combinedVector.lat ** 2 + combinedVector.lng ** 2);
    }
    function getContourData(data) {
        const { lats, lngs } = getGrid();
        const contourData = {
            width: lngs.length,
            height: lats.length,
            values: new Array(lats.length * lngs.length).fill(null)
        }
        const minLat = d3.min(lats);
        const maxLat = d3.max(lats);
        const minLng = d3.min(lngs);
        data.forEach(d => {
            if (isInSide(d, {lats, lngs})) {
                contourData.values[
                    Math.round(Math.floor((maxLat - d.lat) / MIN_COOR) * contourData.width
                    + Math.floor((getLng(d.lng) - minLng) / MIN_COOR))
                ] = d.value;
            }
        });
        contourData.values.forEach((d, i) => {
            if (d == null) {
                contourData.values[i] = calcValue(i, contourData, generalizeData(data, {minLat, minLng}), maxLat, minLng);
            }
        })
        return contourData;
    }

    function drawContour() {
        clearLayer();
        requestAnimationFrame(_drawContour);
    }
    function _drawContour() {
        const context = self.canvas.getContext('2d');
        /*
        data.forEach(d => {
          const {x, y} = map.project(d);
          const next = map.project({lat: d.lat-1, lng: d.lng+1});
          context.fillRect(x, y, next.x - x, next.y - y);
        });
        */

        const contourData = getContourData(self.data);
        self._contourData = contourData;
        const color = getColorScale(contourData);
        const { lats, lngs } = getGrid();
        const maxLat = d3.max(lats);
        const minLng = d3.min(lngs);
        if (!maxLat || !minLng) return;
        const transformToPx = ({ type, value, coordinates }) => {
            return {
                type, value, coordinates: coordinates.map(rings => {
                    return rings.map(points => {
                        return points.map(([x, y]) => {
                            const lat = maxLat - y * MIN_COOR;
                            const lng = minLng + x * MIN_COOR;
                            const projected = map.project({ lat, lng });
                            return [projected.x, projected.y];
                        });
                    });
                })
            };
        }

        const minVal = d3.min(contourData.values);
        const maxVal = d3.max(contourData.values);
        const rangeVal = maxVal - minVal;

        const contours = d3.contours()
            .size([contourData.width, contourData.height])
            .thresholds(d3.range(minVal + rangeVal * 1/NUM_OF_CONTOURS, maxVal, rangeVal * 1/NUM_OF_CONTOURS))
            // .thresholds(color.ticks(10))
            (contourData.values)
            .map(transformToPx);
        context.strokeStyle = 'black';
        context.globalAlpha = 0.3;
        contours.forEach(contour => {
            const path = d3.geoPath()(contour);
            const path2D = new Path2D(path);
            context.stroke(path2D);
            context.fillStyle = color(contour.value);
            context.fill(path2D);
        })

        // fill text
        /*
        context.font = 'bold 16px san-serif';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        contourData.values.forEach((d, i) => {
            const lat = maxLat - Math.floor(i / contourData.width) * MIN_COOR;
            const lng = minLng + (i % contourData.width) * MIN_COOR;
            const {x, y} = map.project({lat, lng});
            const next = map.project({lat: lat-1*MIN_COOR, lng: lng+1*MIN_COOR})
            context.fillText(d.toFixed(2), x + (next.x - x) / 2, y + (next.y - y) / 2);
        })
        */
    }
}