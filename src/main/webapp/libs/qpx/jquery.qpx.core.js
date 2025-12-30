// ================================
// OOP engine: Class
// ================================
(function(global) {

	var Class = function() { };

	Class.extend = function(props) {
		var _super = this.prototype || {};
		var prototype = Object.create(_super);

		for (var name in props) {
			if (!props.hasOwnProperty(name)) continue;

			if (typeof props[name] === "function" &&
				typeof _super[name] === "function") {

				// Wrap pro super volání
				prototype[name] = (function(name, fn) {
					return function() {
						var tmp = this._super;
						this._super = _super[name];
						var result = fn.apply(this, arguments);
						this._super = tmp;
						return result;
					};
				})(name, props[name]);

			} else {
				prototype[name] = props[name];
			}
		}

		function SubClass() {
			if (this.init) {
				this.init.apply(this, arguments);
			}
		}

		SubClass.prototype = prototype;
		SubClass.prototype.constructor = SubClass;
		SubClass.extend = Class.extend;

		return SubClass;
	};

	global.Class = Class;

})(window);


// ================================
// 2) Globální konfigurace frameworku
// ================================
var qpConfig = {
	debug: false
};


// ================================
// 3) Globální EventEmitter pro komunikaci mezi widgety
// ================================
var qpEvents = {
	_events: {},

	on: function(event, handler) {
		if (!this._events[event]) {
			this._events[event] = [];
		}
		this._events[event].push(handler);
	},

	off: function(event) {
		if (this._events[event]) {
			delete this._events[event];
		}
	},

	trigger: function(event, data) {
		var handlers = this._events[event];
		if (handlers) {
			handlers.forEach(function(fn) {
				fn(data);
			});
		}
	}
};


// ================================
// 4) Widget registry (třídy + instance)
// ================================
var qpRegistry = {
	widgets: {},
	instances: [],

	register: function(name, widgetClass) {
		if (this.widgets[name]) {
			console.warn("qpWidget '" + name + "' je již registrován.");
		}
		this.widgets[name] = widgetClass;
	},

	get: function(name) {
		return this.widgets[name];
	},

	registerInstance: function(instance) {
		this.instances.push(instance);
	},

	findByElement: function(el) {
		return this.instances.find(function(inst) {
			return inst.el && inst.el[0] === el;
		});
	}
};


// ================================
// 5) Mixiny (volitelné rozšíření tříd)
// ================================
var qpMixin = {
	apply: function(targetPrototype, mixin) {
		Object.keys(mixin).forEach(function(key) {
			if (typeof mixin[key] === "function") {
				targetPrototype[key] = mixin[key];
			}
		});
	}
};


// ================================
// 6) Základní třída: qpWidget
// ================================
var qpWidget = Class.extend({

	// Defaultní options – potomci si rozšiřují/override
	defaults: {},

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
	}
});


// ================================
// 7) jQuery integrace: $.qpDefine
// ================================
(function($) {

	$.qpDefine = function(name, widgetClass) {

		// registrace widget třídy
		qpRegistry.register(name, widgetClass);

		$.fn[name] = function(options) {
			var args = Array.prototype.slice.call(arguments, 1);

			return this.each(function() {
				var instance = $.data(this, name);

				// vytvoření instance
				if (!instance && typeof options !== "string") {
					instance = new widgetClass(this, options);
					instance._widgetName = name;
					$.data(this, name, instance);
					qpRegistry.registerInstance(instance);
				}

				// volání metody
				if (instance && typeof options === "string") {
					var method = options;
					if (typeof instance[method] === "function") {
						instance[method].apply(instance, args);
					} else {
						if (qpConfig.debug) {
							console.warn("Metoda '" + method + "' neexistuje na widgetu '" + name + "'.");
						}
					}
				}
			});
		};
	};
})(jQuery);


// ================================
// 8) Automatická inicializace přes data-atributy
//    <div data-qp="qpTabs" data-active="1"></div>
// ================================
$(function() {
	$("[data-qp]").each(function() {
		var $el = $(this);
		var widgetName = $el.data("qp");
		var WidgetClass = qpRegistry.get(widgetName);

		if (!WidgetClass) {
			if (qpConfig.debug) {
				console.warn("Widget '" + widgetName + "' není registrován.");
			}
			return;
		}

		var options = {};

		// načíst všechna data-* kromě data-qp
		var dataset = this.dataset || {};
		Object.keys(dataset).forEach(function(key) {
			if (key === "qp") return;
			options[key] = dataset[key];
		});

		// inicializace přes jQuery plugin
		if (typeof $el[widgetName] === "function") {
			$el[widgetName](options);
		}
	});
});