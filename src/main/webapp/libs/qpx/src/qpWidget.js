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
	
	defaults: {}, 

	init: function(el, options) { 
		this.el = $(el); 
		this.options = $.extend(true, {}, this.defaults, options); 
		this._events = {}; 
	
		this.beforeCreate(); 
		this._create(); this.afterCreate(); 
		this._bind(); 
		this.beforeRender(); 
		this.render(); 
		this.afterRender(); 
	}, 
	beforeCreate: function() {}, 
	afterCreate: function() {}, 
	beforeRender: function() {}, 
	afterRender: function() {}, 
	beforeDestroy: function() {}, 
	afterDestroy: function() {}, 

	// Lifecycle: zničení widgetu
	destroy: function() {
		this.beforeDestroy(); 
		this.el.off("." + this._widgetName); 
		this._events = {}; 
		this.el.removeData(this._widgetName); 
		this.afterDestroy(); 
	},

	// Lifecycle: vytvoření widgetu
	_create: function() { },

	// Lifecycle: navázání eventů
	_bind: function() {
		var ns = "." + this._widgetName; 
		this.el.on("click" + ns, ".item", this._onItemClick.bind(this));
	 },

	// Lifecycle: vykreslení widgetu
	render: function() { },

	// Lifecycle: přepočet / překreslení
	refresh: function() { },

	// Event API
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

	// Dynamická změna konfigurace
	setOption: function(key, value) {
		this.options[key] = value;
		this.refresh();
	}
});