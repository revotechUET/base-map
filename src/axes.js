module.exports = Axes;
function Axes(container, map) {
    const self = this;
    this.container = d3.select(container);
    this.map = map;

    const viewWidth = this.container.node().offsetWidth;
    const viewHeight = this.container.node().offsetHeight;

    // create canvas
    let canvas = this.container.select('canvas');
    if (!canvas.node())
        canvas = this.container
            .append('canvas')
            .attr('width', viewWidth)
            .attr('height', viewHeight);
    this.canvas = canvas.node();

    this.drawAxesDebounced = _.debounce(drawAxes);

    function latLng2Point(latLng) {
        var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
        var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
        var scale = Math.pow(2, map.getZoom());
        var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
        return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
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
    function clearLayer() {
        requestAnimationFrame(() => {
            const context = self.canvas.getContext('2d');
            context.clearRect(0, 0, viewWidth, viewHeight);
        })
    }

    function drawAxes() {
        return;
        clearLayer();
        requestAnimationFrame(_drawAxes);
    }

    function _drawAxes() {
        /*
        const projectFn = getProjectionFn();    
        const context = self.canvas.getContext("2d");
        context.fillStyle = "red";
        d3.range(-360, 360, 10).forEach(lng => {
            projected = projectFn(getLatLngObj(0, lng));
            console.log("project", lng, "to", projected)
            context.fillRect(projected.x, projected.y, 10, 10);
        })
        */
    }
}