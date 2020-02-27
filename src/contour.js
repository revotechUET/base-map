module.exports = Contour;
const MIN_COOR = 0.001; // degrees
const NUM_OF_CONTOURS = 10;
const MAX_GRID_AREA = 100000;
const GRID_TOO_LARGE = { lats: [], lngs: [], maxLat: 0, minLat: 0, maxLng: 0, minLng: 0 };
window.test = 0.5;

function isLightColor(color) {

    // Variables for red, green, blue values
    var r, g, b, hsp;
    
    // Check the format of the color, HEX or RGB?
    if (color.match(/^rgb/)) {

        // If HEX --> store the red, green, blue values in separate variables
        color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
        
        r = color[1];
        g = color[2];
        b = color[3];
    } 
    else {
        
        // If RGB --> Convert it to HEX: http://gist.github.com/983661
        color = +("0x" + color.slice(1).replace( 
        color.length < 5 && /./g, '$&$&'));

        r = color >> 16;
        g = color >> 8 & 255;
        b = color & 255;
    }
    
    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
    );

    // Using the HSP value, determine whether the color is light or dark
    if (hsp>127.5) {
        return true;
    } else {
        return false;
    }
}

function Contour(container, map, data, transparency, textFormatFunc) {
    const self = this;
    this.container = d3.select(container);
    this.map = map;
    this.data = data;

    let viewWidth = this.container.node().offsetWidth;
    let viewHeight = this.container.node().offsetHeight;

    // create canvas
    let canvas = this.container.select('canvas.graphic-canvas');
    if (!canvas.node())
        canvas = this.container
            .append('canvas')
            .attr("class", "graphic-canvas")
            .attr('width', viewWidth)
            .attr('height', viewHeight)
            .style("opacity", _.isNumber(transparency) ? transparency:1);
            // .style('background-color', 'rgba(230, 230, 230, 1)');
    this.canvas = canvas.node();

    let labelCanvas = this.container.select("canvas.label-canvas");
    if (!labelCanvas.node())
        labelCanvas = this.container
            .append('canvas')
            .attr("class", "label-canvas")
            .attr('width', viewWidth)
            .attr('height', viewHeight)
    this.labelCanvas = labelCanvas.node();

    const DEBOUNCED_TIMEOUT = 1/getMinCoord();
    this.drawGrid = drawGrid;
    this.drawContour = drawContour;
    this.drawGridDebounced = _.debounce(drawGrid, DEBOUNCED_TIMEOUT);
    this.drawContourDebounced = _.debounce(drawContour, DEBOUNCED_TIMEOUT);

    function latLng2Point(latLng) {
        var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
        var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
        var scale = Math.pow(2, map.getZoom());
        var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
        return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
    }

    function getProjectionFn() {
        if (map instanceof google.maps.Map) {
            // return map.getProjection().fromLatLngToPoint;
            return latLng2Point;
        }
        return map.project.bind(map);
    }
    function getLatLngObj(lat, lng) {
        if (map instanceof google.maps.Map) {
            return new google.maps.LatLng(lat, lng);
        }
        return {lat, lng};
    }

    this.updateCanvasSize = function() {
        viewWidth = self.container.node().offsetWidth;
        viewHeight = self.container.node().offsetHeight;
        d3.select(self.canvas)
            .attr("width", viewWidth)
            .attr("height", viewHeight);
        d3.select(self.labelCanvas)
            .attr("width", viewWidth)
            .attr("height", viewHeight);
    }

    function clearLayer() {
        requestAnimationFrame(() => {
            const context = self.canvas.getContext('2d');
            context.clearRect(0, 0, viewWidth, viewHeight);

            const lContext = self.labelCanvas.getContext('2d');
            lContext.clearRect(0, 0, viewWidth, viewHeight);
        })
    }

    function getBounds() {
        const mapBounds = self.map.getBounds();
        const sw = mapBounds._sw ? mapBounds._sw : {lat: mapBounds.getSouthWest().lat(), lng: mapBounds.getSouthWest().lng() };
        const ne = mapBounds._ne ? mapBounds._ne : {lat: mapBounds.getNorthEast().lat(), lng: mapBounds.getNorthEast().lng() };

        const minLat = Math.max(d3.min(self.data, (d => d.lat)), sw.lat);
        const maxLat = Math.min(d3.max(self.data, (d => d.lat)), ne.lat);
        const minLng = Math.max(d3.min(self.data, (d => d.lng)), sw.lng);
        const maxLng = Math.min(d3.max(self.data, (d => d.lng)), ne.lng);
        /*
        const minLat = d3.min(self.data, (d => d.lat));
        const maxLat = d3.max(self.data, (d => d.lat));
        const minLng = d3.min(self.data, (d => d.lng));
        const maxLng = d3.max(self.data, (d => d.lng));
        */
        if (minLat && maxLat && minLng && maxLng)
            return {
                _sw: { lat: minLat - getMinCoord(), lng: minLng - getMinCoord() },
                _ne: { lat: maxLat + getMinCoord(), lng: maxLng + getMinCoord() }
            }
        else
            return {
                _sw: { lat: 0, lng: 0 },
                _ne: { lat: 0, lng: 0 }
            };
    }

    function getGrid() {
        const bounds = getBounds();
        const sw = bounds._sw;
        const ne = bounds._ne;
        /*
        const lats = [Math.floor(sw.lat), Math.ceil(ne.lat)];
        const lngs = [Math.floor(sw.lng), Math.ceil(ne.lng)];

        // VER 2
        const lats = [sw.lat - getMinCoord(), ne.lat + getMinCoord()];
        const lngs = [sw.lng - getMinCoord(), ne.lng + getMinCoord()];
        */

        const lats = [sw.lat, ne.lat];
        const lngs = [sw.lng, ne.lng];

        const grid = {
            // lats: d3.range(d3.min(lats), d3.max(lats), getMinCoord()),
            // lngs: d3.range(d3.min(lngs), d3.max(lngs), getMinCoord())
            lats: d3.range(d3.min(lats), d3.max(lats), getMinCoord()),
            lngs: d3.range(d3.min(lngs), d3.max(lngs), getMinCoord())
        }
        const statistic = {
            minLat: d3.min(grid.lats),
            maxLat: d3.max(grid.lats),
            minLng: d3.min(grid.lngs),
            maxLng: d3.max(grid.lngs)
        }
        if (grid.lats.length * grid.lngs.length > MAX_GRID_AREA) {
            return GRID_TOO_LARGE;
        }
        return Object.assign(grid, statistic);
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
                // const { x, y } = map.project({ lat, lng });
                const { x, y } = getProjectionFn()(getLatLngObj(lat, lng));
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
                // const { x, y } = map.project({ lat, lng });
                const { x, y } = getProjectionFn()(getLatLngObj(lat, lng));
                if (i == 0)
                    context.moveTo(x, y);
                else
                    context.lineTo(x, y);
            });
            context.stroke();
        })
    }
    /*
    function getColorScale(contourData) {
        interpolateTerrain = (() => {
            const i0 = d3.interpolateHsvLong(d3.hsv(120, 1, 0.65), d3.hsv(60, 1, 0.90));
            const i1 = d3.interpolateHsvLong(d3.hsv(60, 1, 0.90), d3.hsv(0, 1, 0.95));
            return t => t < getMinCoord() ? i0(t * 2) : i1((t - getMinCoord()) * 2);
        })();
        return d3.scaleSequential(interpolateTerrain).domain(d3.extent(contourData.values)).nice();
    }
    */
    function getColorScale(contourData) {
        // return d3.scaleSequential(d3.interpolateRainbow).domain(d3.extent(contourData.values)).nice();
        return d3.scaleSequential(d3.interpolateTurbo).domain(d3.extent(contourData.values)).nice();
    }
    function getMinCoord() {
        const zoom = map.getZoom();
        if (zoom >= 13)
            return MIN_COOR;
        else if (zoom >= 11)
            return MIN_COOR * 10;
        else if (zoom >= 9)
            return MIN_COOR * 100;
    }
    function getLabelSpacingUnit() {
        const zoom = map.getZoom();
        if (zoom >= 11)
            return 2;
        else if (zoom >= 9)
            return 3;
        else
            return 4;
    }
    function getLng(lng) {
        if (typeof(self.map.getCenter().lng) == "function")
            return self.map.getCenter().lng() < 0 ? -1 * (360 - lng):lng;
        return self.map.getCenter().lng < 0 ? -1 * (360 - lng):lng;
    }
    function generalizeData(data, {minLat, minLng}) {
        return data.map(d => ({
            lat: minLat + Math.ceil((d.lat - minLat) / getMinCoord()) * getMinCoord(),
            lng: minLng + Math.floor((getLng(d.lng) - minLng) / getMinCoord()) * getMinCoord(),
            value: d.value
        }))
    }
    function isInSide({lat, lng}, {minLat, maxLat, minLng, maxLng}, {ignoreCenterPoint}={}) {
        return (lat - minLat) * (lat - maxLat) <= 0
            && (
                    ignoreCenterPoint
                    ? ((lng - minLng) * (lng - maxLng) <= 0)
                    : ((getLng(lng) - minLng) * (getLng(lng) - maxLng) <= 0)
                );
    }
    /*
    function maxDistanceFromGrid(datum, grid) {
        const {minLat, maxLat, minLng, maxLng} = grid;
        const _nw = {lat: maxLat, lng: getLng(minLng)};
        const _ne = {lat: maxLat, lng: getLng(maxLng)};
        const _sw = {lat: minLat, lng: getLng(minLng)};
        const _se = {lat: minLat, lng: getLng(maxLng)};
        return d3.max([_nw,_ne,_sw,_se].map(conner => {
            const lat = (conner.lat - datum.lat) / getMinCoord();
            const lng = (conner.lng - datum.lng) / getMinCoord();
            return Math.sqrt( lat ** 2 + lng ** 2);
        }));
    }
    function calcValueFromDistance(value, distance) {
        // return value * ((PROPAGATE_RATE) ** (distance*MIN_COOR));
        return value - value * distance * MIN_COOR * (1 - PROPAGATE_RATE);
    }
    function getWeightFromDistance(distance, datum, grid) {
        return distance / maxDistanceFromGrid(datum, grid);
    }
    */
    function calcValue(index, contourData, data, maxLat, minLng) {
        const lat = maxLat - Math.floor(index / contourData.width) * getMinCoord();
        const lng = minLng + (index % contourData.width) * getMinCoord();

        // const totalValue = data.reduce((acc, curr) => (acc + curr.value), 0);
        // const meanValue = totalValue / data.length
        const grid = getGrid();
        if (grid == GRID_TOO_LARGE) return;

        // const _data = data.filter(d => isInSide(d, grid, {ignoreCenterPoint: true}));
        const _data = data;
        /*
        const combinedData = _data.reduce((acc, curr) => {
            const vector = {
                lat: (curr.lat - lat) / MIN_COOR,
                lng: (curr.lng - lng) / MIN_COOR
            };
            const distance = Math.sqrt(vector.lat ** 2 + vector.lng ** 2);
            const mag = (1 - getWeightFromDistance(distance, curr, grid)) * calcValueFromDistance(curr.value, distance);
            acc += Math.max(mag, 0);
            return acc;
        }, 0);
        return combinedData;
        */
        const sumVerticesValue = d3.sum(_data, d => d.value);
        const denomimator = _data.reduce((acc, curr) => {
            const vector = {
                lat: (curr.lat - lat) / getMinCoord(),
                lng: (curr.lng - lng) / getMinCoord()
            };
            const distance = Math.sqrt(vector.lat ** 2 + vector.lng ** 2);
            acc += 1 / distance ** 2;
            return acc;
        }, 0);
        const numerator = _data.reduce((acc, curr) => {
            const vector = {
                lat: (curr.lat - lat) / getMinCoord(),
                lng: (curr.lng - lng) / getMinCoord()
            };
            const distance = Math.sqrt(vector.lat ** 2 + vector.lng ** 2);
            acc += (1 / distance**2) * (curr.value / sumVerticesValue);
            return acc;
        }, 0);
        return numerator * sumVerticesValue / denomimator;

        /*
        const combinedVector = data.reduce((acc, curr) => {
            if (isInSide(curr, grid, {ignoreCenterPoint: true})) {
                const vector = {
                    lat: (curr.lat - lat),
                    lng: (curr.lng - lng)
                };
                const distance = Math.sqrt(vector.lat ** 2 + vector.lng ** 2);
                const mag = calcValueFromDistance(curr.value, distance);

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
                acc.lat *= PROPAGATE_RATE;
                acc.lng *= PROPAGATE_RATE;
            }
            return acc;
        }, {lat: 0, lng: 0});
        return Math.sqrt(combinedVector.lat ** 2 + combinedVector.lng ** 2);
        */
    }
    function getContourData(data) {
        const { lats, lngs, ...statistic} = getGrid();
        const contourData = {
            width: lngs.length,
            height: lats.length,
            values: new Array(lats.length * lngs.length).fill(null)
        }
        if (!lats.length && !lngs.length) return contourData;
        data.forEach(d => {
            if (isInSide(d, statistic)) {
                contourData.values[
                    Math.round(Math.floor((statistic.maxLat - d.lat) / getMinCoord()) * contourData.width
                    + Math.floor((getLng(d.lng) - statistic.minLng) / getMinCoord()))
                ] = d.value;
            }
        });
        contourData.values.forEach((d, i) => {
            if (d == null) {
                contourData.values[i] = calcValue(i, contourData, generalizeData(data, statistic), statistic.maxLat, statistic.minLng);
            }
        })
        return contourData;
    }

    function drawContour() {
        clearLayer();
        requestAnimationFrame(_drawContour);
    }
    function _drawContour() {
        if (!self.data || !self.data.length) return;
        const context = self.canvas.getContext('2d');
        const labelContext = self.labelCanvas.getContext("2d");
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
        if (!lats.length || !lngs.length) return;
        const maxLat = d3.max(lats);
        const minLng = d3.min(lngs);
        if (!_.isFinite(maxLat) || !_.isFinite(minLng)) return;
        const transformToPx = ({ type, value, coordinates }) => {
            return {
                type, value, coordinates: coordinates.map(rings => {
                    return rings.map(points => {
                        return points.map(([x, y]) => {
                            const lat = maxLat - y * getMinCoord();
                            const lng = minLng + x * getMinCoord();
                            // const projected = map.project({ lat, lng });
                            const projected = getProjectionFn()(getLatLngObj(lat, lng));
                            return [projected.x, projected.y];
                        });
                    });
                })
            };
        }

        const maxVal = d3.max(contourData.values);
        const minVal = d3.min(contourData.values);
        const rangeValPerContour = (maxVal - minVal) / (self.contourStep || 10);
        const thresholds = d3.range(minVal, maxVal + rangeValPerContour, rangeValPerContour);
        // const thresholds = d3.range(1, NUM_OF_CONTOURS, 1)
        //     .map(contNum => calcValueFromDistance(maxVal, window.test * contNum/getMinCoord()));

        const contours = d3.contours()
            .size([contourData.width, contourData.height])
            .thresholds(thresholds)
            // .thresholds(self.contourStep || 10)
            // .thresholds(d3.range(minVal, maxVal, rangeVal * 1/NUM_OF_CONTOURS))
            // .thresholds(color.ticks(self.contourStep || 10))
            (contourData.values)
            .map(transformToPx);
        context.strokeStyle = 'black';
        // context.globalAlpha = 0.3;
        contours.forEach(contour => {
            const path = d3.geoPath()(contour);
            const path2D = new Path2D(path);
            if (self.showContourStroke)
                context.stroke(path2D);
            context.fillStyle = color(contour.value);
            context.fill(path2D);
        })

        // draw well point
        /*
        const projectFn = getProjectionFn();
        context.fillStyle = "black";
        context.textAlign = "center";
        context.font = 'bold 14px';
        self.data.forEach(well => {
            const point = projectFn(getLatLngObj(well.lat, well.lng));
            const contourColor = color(well.value);
            if (isLightColor(contourColor)) {
                context.fillStyle = "black";
            } else {
                context.fillStyle = "white";
            }
            context.fillRect(point.x, point.y, 5, 5);
            context.fillText(well.wellName, point.x, point.y - 5);
        })
        */

        // draw text label
        if (self.showContourText) {
            context.fillStyle = "black";
            context.textAlign = "center";
            const bounds = getBounds();
            const projectFn = getProjectionFn();
            const boundsInPx = {
                sw: projectFn(getLatLngObj(bounds._sw.lat, bounds._sw.lng)),
                ne: projectFn(getLatLngObj(bounds._ne.lat, bounds._ne.lng)),
            }
            const TEXT_SPACE = 10;
            const ERR_IN_EDGE = 10; // px
            contours.forEach(contour => {
                if (!contour.coordinates[0]) return;
                const pointsLength = contour.coordinates[0][0].length;
                if (pointsLength && pointsLength >= 3) {
                    d3.range(0, pointsLength, getLabelSpacingUnit())
                        .forEach(index => {
                            const _point = contour.coordinates[0][0][index];
                            if (!_point) { return; }
                            const point = { x: _point[0], y: _point[1] };
                            if (Math.abs(point.x - boundsInPx.sw.x) <= ERR_IN_EDGE || Math.abs(point.y - boundsInPx.sw.y) <= ERR_IN_EDGE
                                || Math.abs(point.x - boundsInPx.ne.x) <= ERR_IN_EDGE || Math.abs(point.y - boundsInPx.ne.y) <= ERR_IN_EDGE) {
                                return;
                            }
                            else {
                                context.fillText(textFormatFunc(contour.value), point.x, point.y);
                            }
                        })
                }
            })
        }

        // fill text for test only
        if (window.viewNum) {
            context.font = 'bold 16px san-serif';
            context.fillStyle = 'black';
            context.textAlign = 'center';
            contourData.values.forEach((d, i) => {
                if (window.testFn(i)) {return;}
                const lat = maxLat - Math.floor(i / contourData.width) * getMinCoord();
                const lng = minLng + (i % contourData.width) * getMinCoord();
                const { x, y } = getProjectionFn()(getLatLngObj(lat, lng));
                const next = getProjectionFn()(getLatLngObj(lat - 1 * getMinCoord(), lng + 1 * getMinCoord() ))
                context.fillText(d.toFixed(2), x + (next.x - x) / 2, y + (next.y - y) / 2);
            })
        }

        // create gradient
        const NUM_OF_COLORSTOP = 10;
        const OFFSET_FROM_RIGHT = 360;
        const WIDTH = 320;
        const OFFSET_FROM_BOTTOM = 120;
        const HEIGHT = 10;
        const grd = labelContext.createLinearGradient(viewWidth - OFFSET_FROM_RIGHT, viewHeight - OFFSET_FROM_BOTTOM, viewWidth - (OFFSET_FROM_RIGHT - WIDTH), viewHeight - OFFSET_FROM_BOTTOM);
        const colorDomainRange = Math.abs(color.domain()[1] - color.domain()[0]);
        const colorDomainStart = Math.min(color.domain()[0], color.domain()[1]);
        d3.range(0, NUM_OF_COLORSTOP + 1).forEach(colorStop => {
            const proportion = colorStop / NUM_OF_COLORSTOP;
            grd.addColorStop(proportion, color(colorDomainStart + proportion * colorDomainRange));
        })
        labelContext.fillStyle = grd;
        labelContext.fillRect(viewWidth - OFFSET_FROM_RIGHT, viewHeight - OFFSET_FROM_BOTTOM, WIDTH, HEIGHT);
        labelContext.strokeStyle = "transparent";
        labelContext.strokeRect(viewWidth - OFFSET_FROM_RIGHT, viewHeight - OFFSET_FROM_BOTTOM, WIDTH, HEIGHT);
        labelContext.fillStyle = "black";
        labelContext.textAlign = "left";
        labelContext.font = "300 12px Sans-serif";
        labelContext.fillText(textFormatFunc(colorDomainStart), viewWidth - OFFSET_FROM_RIGHT, viewHeight - OFFSET_FROM_BOTTOM - 10);
        labelContext.textAlign = "right";
        labelContext.fillText(textFormatFunc(colorDomainStart + colorDomainRange), viewWidth - (OFFSET_FROM_RIGHT - WIDTH), viewHeight - OFFSET_FROM_BOTTOM - 10);
    }
}