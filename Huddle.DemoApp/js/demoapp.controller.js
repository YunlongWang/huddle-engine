﻿var DemoAppController = Class.create({
    initialize: function (host, port, mapContainerSelector) {
        this.mapContainerSelector = mapContainerSelector;

        this.deviceId = this.getParameterByName('id');
        if (!this.deviceId || this.deviceId == 'undefined')
            this.deviceId = 0;

        this.isDragging = false;
        this.dragPosition = {
            x: 0,
            y: 0
        };
        this.isUpdateProxemics = true;

        this.activationAngle = 20;

        this.createQrCodeView();
        this.huddle = this.createHuddle(host, port);
        this.map = this.createMap();
        this.worldMapCenter = this.map.getCenter();
        this.latestWorldMapCenter = this.map.getCenter();

        this.mapOffset = {
            x: 0,
            y: 0
        };

        this.lastPosition = {
            x: 0,
            y: 0
        };

        this.initializeListeners();
    },

    createQrCodeView: function () {
        this.qrCodeContainer = $('<div id="qrcode-container" class="huddle-fullscreen"><div id="qrcode"></div></div>');
        $('body').append(this.qrCodeContainer);

        var windowWidth = $(window).width();
        var windowHeight = $(window).height();

        var qrCodeSize = windowWidth > windowHeight ? windowHeight : windowWidth;

        $('#qrcode').qrcode({
            width: qrCodeSize - 100,
            height: qrCodeSize - 100,
            text: this.deviceId
        });

        this.qrCodeContainer.width(windowWidth);
        this.qrCodeContainer.height(windowHeight);
    },

    createHuddle: function (host, port) {
        var controller = this;

        var huddle = new Huddle(this.deviceId, function (data) {
            if (data.Type) {
                switch (data.Type) {
                    case 'Proximity':
                        if (controller.isUpdateProxemics)
                            controller.processProximity(data.Data);//.bind(controller);
                        break;
                    case 'Digital':
                        if (data.Data.Value)
                            controller.qrCodeContainer.show();
                        else
                            controller.qrCodeContainer.hide();
                        break;
                    case 'Broadcast':
                        if (data.panBy) {
                            var x = data.panBy.x;
                            var y = data.panBy.y;

                            controller.map.panBy(x, y);
                        }
                        else if (data.mapTypeId) {
                            controller.map.setMapTypeId(data.mapTypeId);
                        }
                        else if (data.worldMapCenter) {
                            var wmc = data.worldMapCenter;

                            controller.worldMapCenter = new google.maps.LatLng(wmc.lat, wmc.lng);
                        }
                        else {
                            controller.isUpdateProxemics = data.isUpdateProxemics;
                        }

                        break;
                }
            } else {
                console.log("echo");
            }
        });
        huddle.reconnect = true;
        huddle.connect(host, port);

        return huddle;
    },

    createMap: function () {

        var latitude = this.getParameterByName('lat');
        if (!latitude || latitude == 'undefined')
            latitude = 47.7083395;

        var longitude = this.getParameterByName('lng');
        if (!longitude || longitude == 'undefined')
            longitude = 9.1517065;

        var zoom = this.getParameterByName('zoom');
        if (!zoom || zoom == 'undefined')
            zoom = 13;

        var mapTypeId = this.getParameterByName('mtype');
        if (!mapTypeId || mapTypeId == 'undefined')
            mapTypeId = google.maps.MapTypeId.ROADMAP;

        $('<div id="map-canvas"></div>').appendTo($(this.mapContainerSelector));

        var centerLatLng = new google.maps.LatLng(latitude, longitude);
        var mapOptions = {
            center: centerLatLng,
            mapTypeId: mapTypeId,
            zoom: zoom,
            disableDefaultUI: true,
            draggable: false
        };
        return new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    },

    changeMapType: function (mapTypeId) {
        this.map.setMapTypeId(mapTypeId);

        var broadcast = '"mapTypeId": "{0}"'.format(mapTypeId);
        this.huddle.broadcast(broadcast);
    },

    initializeListeners: function () {
        $(this.mapContainerSelector).on("mousedown", { controller: this }, this.dragstart);
        //$(this.mapContainerSelector).on("touchdown", { controller: this }, dragstart);

        $(this.mapContainerSelector).on("mousemove", { controller: this }, this.dragmove);
        //$(this.mapContainerSelector).on("touchmove", { controller: this }, dragmove);

        $(this.mapContainerSelector).on("mouseup", { controller: this }, this.dragend);
        //$(this.mapContainerSelector).on("touchend", { controller: this }, dragend);
    },

    dragstart: function (e) {
        e.preventDefault();

        var controller = e.data.controller;
        controller.isDragging = true;
        controller.dragPosition.x = e.screenX;
        controller.dragPosition.y = e.screenY;

        controller.isUpdateProxemics = false;
        var broadcast = '"isUpdateProxemics": false';
        controller.huddle.broadcast(broadcast);
    },

    dragmove: function (e) {
        e.preventDefault();

        var controller = e.data.controller;

        if (!controller.isDragging) return;

        var deltaX = controller.dragPosition.x - e.screenX;
        var deltaY = controller.dragPosition.y - e.screenY;

        controller.dragPosition.x = e.screenX;
        controller.dragPosition.y = e.screenY;

        controller.map.panBy(deltaX, deltaY);

        var broadcast = '"panBy": {{"x": {0}, "y": {1}}}'.format(deltaX, deltaY);
        controller.huddle.broadcast(broadcast);
    },

    dragend: function (e) {
        e.preventDefault();

        var controller = e.data.controller;

        console.log(controller.worldMapCenter);

        var localMapCenter = controller.map.getCenter();

        var globalMapCenter = new google.maps.LatLng(localMapCenter.d + controller.mapOffset.x, localMapCenter.e + controller.mapOffset.y);

        console.log("WorldMap: {0}, GlobalMap: {1}".format(localMapCenter.toString(), globalMapCenter.toString()));

        //controller.worldMapCenter.d -= controller.latestWorldMapCenter.d;
        //controller.worldMapCenter.e -= controller.latestWorldMapCenter.e;

        controller.worldMapCenter = globalMapCenter;

        var broadcastWmc = '"worldMapCenter": {{"lat": {0}, "lng": {1}}}'.format(globalMapCenter.d, globalMapCenter.e);
        controller.huddle.broadcast(broadcastWmc);

        controller.isDragging = false;

        controller.isUpdateProxemics = true;
        var broadcast = '"isUpdateProxemics": true';
        controller.huddle.broadcast(broadcast);
    },

    getParameterByName: function (name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    },

    processProximity: function (data) {
        var location = data.Location.split(",");
        var x = location[0];
        var y = location[1];
        var angle = data.Orientation % 360;

        if (angle < 0)
            angle += 360;

        if (angle > this.activationAngle && angle < this.activationAngle + 45) {
            $('#tool-palette-container').show();
        }
        else {
            $('#tool-palette-container').hide();
        }

        if (angle > (360 - this.activationAngle - 45) && angle < (360 - this.activationAngle)) {
            $('#note-container').show();
        }
        else {
            $('#note-container').hide();
        }

        if (!this.isUpdateProxemics) return;

        //if (Math.abs(this.lastPosition.x - x) < 0.001 || Math.abs(this.lastPosition.y - y) < 0.001)
        //    return;

        this.lastPosition.x = x;
        this.lastPosition.y = y;

        var zoom = this.map.getZoom();
        var offsetX = y / zoom * 8;
        var offsetY = (1.0 - x) / zoom * 8;

        this.mapOffset.x = offsetX;
        this.mapOffset.y = offsetY;

        this.latestWorldMapCenter = new google.maps.LatLng(this.worldMapCenter.d - offsetX, this.worldMapCenter.e - offsetY);

        //this.map.panTo(this.latestWorldMapCenter);

        //console.log("World: {0}".format(this.latestWorldMapCenter));

        this.map.setCenter(this.latestWorldMapCenter);
    },
});