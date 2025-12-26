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

	defaults: {
		width: null,
		height: null
	},

	init: function(el, options) {
		this.el = $(el);
		this.options = $.extend(true, {}, this.defaults, options);
		this._events = {};
		this._rendered = false;
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

		// -----------------------------
		// LIFECYCLE
		// -----------------------------
		this.beforeCreate();
		this._create();
		this.afterCreate();

		this._bind();

		this.beforeRender();
		this.render();
		this.afterRender();
		this._rendered = true;
	},

	beforeCreate: function() { },
	afterCreate: function() { },
	beforeRender: function() { },
	afterRender: function() { },
	beforeDestroy: function() { },
	afterDestroy: function() { },

	destroy: function() {
		this.beforeDestroy();
		this.el.off("." + this._widgetName);
		this._events = {};
		this.el.removeData(this._widgetName);
		this.afterDestroy();
	},

	_create: function() { },

	_bind: function() {
		var ns = "." + this._widgetName;
		this.el.on("click" + ns, ".item", this._onItemClick?.bind(this));
	},

	render: function() { },

	refresh: function() { },

	on: function(eventName, handler) {
		this._events[eventName] = this._events[eventName] || [];
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

	setOption: function(key, value) {
		this.options[key] = value;
		this.refresh();
	},

	// 🔥 OPRAVENÁ VERZE
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
