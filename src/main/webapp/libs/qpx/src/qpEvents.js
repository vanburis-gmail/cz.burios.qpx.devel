/**
 *  EventEmitter je globální pro komunikaci mezi widgety
 * 
 * Umožní:
 * 
 * - widget → widget komunikaci
 * - globální eventy (např. „themeChanged“, „layoutUpdated“)
 * - debugování
 * - odpojování eventů podle namespace
 * 
 * Použití:
 * <pre>
 * qpEvents.on("themeChanged", function(theme) {
 *   console.log("Theme changed to:", theme);
 * });
 * </pre>
 * 
 */
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
