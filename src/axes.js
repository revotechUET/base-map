module.exports = Axes;

const FIXED_DECIMAL = 0;
function Axes(container, map) {
    const self = this;
    this.container = d3.select(container);
    this.map = map;

    let viewWidth = this.container.node().offsetWidth;
    let viewHeight = this.container.node().offsetHeight;

    // create canvas
    let canvas = this.container.select('canvas');
    if (!canvas.node())
        canvas = this.container
            .append('canvas')
            .attr('width', viewWidth)
            .attr('height', viewHeight);
    this.canvas = canvas.node();

    let bCanvas = this.container.select('canvas.bound-canvas');
    if (!bCanvas.node())
        bCanvas = this.container
            .append('canvas')
            .attr("class", "bound-canvas")
            .attr('width', viewWidth)
            .attr('height', viewHeight);
    this.bCanvas = bCanvas.node();

    this.drawAxesDebounced = _.debounce(drawAxes);

    function latLng2Point(latLng) {
        var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
        var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
        var scale = Math.pow(2, map.getZoom());
        var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
        // return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
        return new google.maps.Point(
            ((worldPoint.x > bottomLeft.x) ? (worldPoint.x - bottomLeft.x):(256 - bottomLeft.x + worldPoint.x)) * scale,
            (worldPoint.y - topRight.y) * scale)
    }
    function getLatLngObj(lat, lng) {
        if (map instanceof google.maps.Map) {
            return new google.maps.LatLng(lat, lng);
        }
        return {lat, lng};
    }

    function getProjectionFn() {
        if (map instanceof google.maps.Map) {
            // return map.getProjection().fromLatLngToPoint;
            return latLng2Point;
        }
        return map.project.bind(map);
    }
    function getLng(lng) {
        return lng;
        /*
        if (typeof(self.map.getCenter().lng) == "function")
            return self.map.getCenter().lng() < 0 ? -1 * (360 - lng):lng;
        return self.map.getCenter().lng < 0 ? -1 * (360 - lng):lng;
        */
    }
    this.updateCanvasSize = function() {
        viewWidth = self.container.node().offsetWidth;
        viewHeight = self.container.node().offsetHeight;
        d3.select(self.canvas)
            .attr("width", viewWidth)
            .attr("height", viewHeight)
        d3.select(self.bCanvas)
            .attr("width", viewWidth)
            .attr("height", viewHeight)
    }
    this.clearLayer = clearLayer;
    function clearLayer() {
        requestAnimationFrame(() => {
            const context = self.canvas.getContext('2d');
            context.clearRect(0, 0, viewWidth, viewHeight);
        })
    }

    function drawAxes() {
        clearLayer();
        requestAnimationFrame(_drawAxes);
    }

    function getDivisionsX() {
        return self.xDivision || 10;
    }

    function getMinorDivX() {
        return self.xMinorDivision || 5;
    }

    function getDivisionsY() {
        return self.yDivision || 10;
    }

    function getMinorDivY() {
        return self.yMinorDivision || 5;
    }

    function _drawAxes() {
        if (!map.getBounds()) return;
        const unit = typeof(self.latLng2XYFn) === "function" 
                ? typeof(self.getUnitLabel) === "function"
                    ? self.getUnitLabel()
                    : "m"
                :"°";
        const projectFn = getProjectionFn();    
        const context = self.canvas.getContext("2d");
        context.fillStyle = "#4c81c6";
        const southWest = map.getBounds().getSouthWest();
        const northEast = map.getBounds().getNorthEast();
        const xDiv = getDivisionsX();
        const xMinorDiv = getMinorDivX();
        const yDiv = getDivisionsY();
        const yMinorDiv = getMinorDivY();
        const lngs = [southWest.lng(), northEast.lng()];
        let xPoints = [];
        let xMinorStep = null;
        // console.log(lngs);
        if (lngs[0] > lngs[1]) {
            const xStep = (180 - lngs[0] + lngs[1] + 180) / xDiv;
            xMinorStep = xStep / xMinorDiv;
            xPoints = [...d3.range(lngs[0], 180, xStep), ...d3.range(-180, lngs[1] + xStep, xStep)];
        } else {
            const xStep = (lngs[1] - lngs[0]) / xDiv;
            xMinorStep = xStep / xMinorDiv;
            xPoints = d3.range(lngs[0], lngs[1] + xStep, xStep);
        }
        // console.log(xPoints);
        // draw yAxis
        // draw straight line
        /*
        context.beginPath();
        context.moveTo(viewWidth - 30, 0);
        context.lineTo(viewWidth - 30, viewHeight - 20);
        context.closePath();
        context.stroke();
        */

        // context.textBaseline = "middle";
        context.textAlign = "center"
        context.font = "300 12px Sans-serif";

        const yStep = (northEast.lat() - southWest.lat()) / yDiv;
        const yMinorStep = yStep / yMinorDiv;
        const yMajorLats = d3.range(southWest.lat(), northEast.lat() + yStep, yStep);
        yMajorLats.forEach((lat, i) => {
            const projected = projectFn(getLatLngObj(lat, northEast.lng()));
            const textValues = self.latLng2XYFn ? self.latLng2XYFn(lat, northEast.lng()) : {x: 0, y: lat};
            context.fillRect(viewWidth - 10, projected.y - 2, 10, 4);

            context.save();
            context.translate(viewWidth - 30, projected.y);
            context.rotate(Math.PI / 2);
            context.textAlign = "center";
            context.fillText(textValues.y.toFixed(FIXED_DECIMAL) + unit, 0, 0);
            context.restore();

            // minor ticks
            if (i > 0) {
                d3.range(yMajorLats[i - 1], lat, yMinorStep).forEach(minorLat => {
                    const _projected = projectFn(getLatLngObj(minorLat, northEast.lng()));
                    context.fillRect(viewWidth - 5, _projected.y - 1, 5, 2);
                })
            }
        })
        // draw x Axis
        // draw straight line 
        /*
        context.beginPath();
        context.moveTo(0, viewHeight - 20);
        context.lineTo(viewWidth - 30, viewHeight - 20);
        context.closePath();
        context.stroke();
        */

        xPoints.forEach((lng, i) => {
            const projected = projectFn(getLatLngObj(southWest.lat(), getLng(lng)));
            const textValues = self.latLng2XYFn ? self.latLng2XYFn(southWest.lat(), getLng(lng)) : {x: getLng(lng), y: 0};
            context.fillRect(projected.x - 2, viewHeight-10, 4, 10);
            context.fillText(textValues.x.toFixed(FIXED_DECIMAL) + unit, projected.x, viewHeight - 20);
            if (i > 0) {
                d3.range(xPoints[i - 1], lng, xMinorStep).forEach(minorLng => {
                    const _projected = projectFn(getLatLngObj(southWest.lat(), minorLng));
                    context.fillRect(_projected.x - 1, viewHeight - 5, 2, 5);
                })
            }
        });
    }
    this.clearBoundsLayer = function() {
        const context = self.bCanvas.getContext("2d");
        context.clearRect(0, 0, viewWidth, viewHeight);
    }
    this.drawBounds = function(bound) {
        const context = self.bCanvas.getContext("2d");
        const projectFn = getProjectionFn();    
        const sw = bound.southWest;
        const ne = bound.northEast;
        context.strokeStyle = "red";
        const _sw_projected = projectFn(getLatLngObj(sw.lat, sw.lng));
        const _ne_projected = projectFn(getLatLngObj(ne.lat, ne.lng));
        context.beginPath();
        context.moveTo(_sw_projected.x, _sw_projected.y);
        context.lineTo(_sw_projected.x, _ne_projected.y);
        context.closePath();
        context.stroke();

        // context.strokeStyle = "green";
        context.beginPath();
        context.moveTo(_sw_projected.x, _ne_projected.y);
        context.lineTo(_ne_projected.x, _ne_projected.y);
        context.closePath();
        context.stroke();

        // context.strokeStyle = "blue";
        context.beginPath();
        context.moveTo(_ne_projected.x, _ne_projected.y);
        context.lineTo(_ne_projected.x, _sw_projected.y);
        context.closePath();
        context.stroke();

        // context.strokeStyle = "purple";
        context.beginPath();
        context.moveTo(_ne_projected.x, _sw_projected.y);
        context.lineTo(_sw_projected.x, _sw_projected.y);
        context.closePath();
        context.stroke();
    }
}