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
var qpEvents = {
	_events: {},
	on: function(event, handler) {
		this._events[event] = this._events[event] || [];
		this._events[event].push(handler);
	},
	off: function(event) {
		delete this._events[event];
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