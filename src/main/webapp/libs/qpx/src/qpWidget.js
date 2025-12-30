/**
 * Tohle je tvrdé jádro frameworku.
 * Obsahuje: 
 * 
 * - init(el, options)
 * - defaults
 * - render()
 * - destroy()
 * - trigger(eventName, data)
 * - on(eventName, handler)
 * - off(eventName)
 * - setOption(key, value)
 * - refresh()
 * 
 * - beforeCreate
 * - afterCreate
 * - beforeRender
 * - afterRender
 * - beforeDestroy
 * - afterDestroy
 */
var qpWidget = Class.extend({
	// Defaultní options – potomci si rozšiřují/override
	defaults: {
		width: null,
		height: null
	},
	// Verze widgetu – potomci mohou přepsat
	version: "1.0.0",
	// Konstruktor
	init: function(el, options) {
		this.el = $(el);
		this.options = $.extend(true, {}, this.defaults, options);
		this._events = {};      // interní eventy (on/trigger)
		this._timeline = [];    // lifecycle log
		this._widgetId = "qp-" + Math.random().toString(36).substr(2, 9);
		this._createdAt = Date.now();
		this._version = this.version || "1.0.0";
		this._widgetName = this._widgetName || "qpWidget";
		if (this.options.width != null) {
			if (typeof this.options.width === "number") {
				this.el.css("width", this.options.width + "px");
			} else {
				this.el.css("width", this.options.width);
			}
		}
		if (this.options.height != null) {
			if (typeof this.options.height === "number") {
				this.el.css("height", this.options.height + "px");
			} else {
				this.el.css("height", this.options.height);
			}
		}
		this.timeline("init:start");
		this.beforeCreate();
		this.timeline("beforeCreate");
		this._create();
		this.timeline("_create");
		this.afterCreate();
		this.timeline("afterCreate");
		this._bind();
		this.timeline("_bind");
		this.beforeRender();
		this.timeline("beforeRender");
		this.render();
		this.timeline("render");
		this.afterRender();
		this.timeline("afterRender");
		this.timeline("init:end");
	},
	// ---- Lifecycle hooks ----
	beforeCreate: function() { },
	afterCreate: function() { },
	beforeRender: function() { },
	afterRender: function() { },
	beforeDestroy: function() { },
	afterDestroy: function() { },

	// ---- Vnitřní lifecycle metody k override ----
	_create: function() { },
	_bind: function() { },
	render: function() { },

	refresh: function() {
		this.timeline("refresh");
	},
	// ---- Destroy ----
	destroy: function() {
		this.timeline("destroy:start");
		this.beforeDestroy();
		// odpojení jQuery eventů s namespace
		if (this._widgetName) {
			this.el.off("." + this._widgetName);
		}
		// interní eventy
		this._events = {};
		// odstranění data z elementu
		if (this.el) {
			this.el.removeData(this._widgetName);
		}
		this.afterDestroy();
		this.timeline("destroy:end");
	},
	// ============================
	// Event API (lokální pro instanci)
	// ============================
	on: function(eventName, handler) {
		if (!this._events[eventName]) {
			this._events[eventName] = [];
		}
		this._events[eventName].push(handler);
	},
	off: function(eventName) {
		if (this._events[eventName]) {
			delete this._events[eventName];
		}
	},
	trigger: function(eventName, data) {
		var handlers = this._events[eventName];
		if (handlers) {
			handlers.forEach(function(fn) {
				fn.call(this, data);
			}, this);
		}
	},
	// ============================
	// Global event API (mezi widgety)
	// ============================
	sendGlobal: function(event, data) {
		qpEvents.trigger(event, data);
	},
	listenGlobal: function(event, handler) {
		qpEvents.on(event, handler);
	},
	stopGlobal: function(event) {
		qpEvents.off(event);
	},
	// ============================
	// Options API
	// ============================
	setOption: function(key, value) {
		this.options[key] = value;
		this.timeline("setOption:" + key);
		this.refresh();
	},
	getOption: function(key) {
		return this.options[key];
	},
	// ============================
	// Debug / logování / timeline
	// ============================
	log: function() {
		if (qpConfig.debug) {
			var args = Array.prototype.slice.call(arguments);
			args.unshift("[" + this._widgetName + "][" + this._widgetId + "]");
			console.log.apply(console, args);
		}
	},
	timeline: function(event) {
		this._timeline.push({
			event: event,
			time: Date.now()
		});
		this.log("lifecycle:", event);
	},
	renderTo: function($container) {
		// přesun widgetu do nového kontejneru
		$container.append(this.el);
		// pokud widget ještě nebyl renderován (lazy)
		if (!this._rendered) {
			this.beforeRender();
			this.render();
			this.afterRender();
			this._rendered = true;
		}
		return this;
	}
});
