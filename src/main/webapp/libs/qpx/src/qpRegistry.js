/**
 *  qpRegistry Umožní:
 * 
 * - registrovat widgety podle jména
 * - později je introspektovat
 * - automaticky inicializovat widgety přes data‑atributy
 * - řešit konflikty jmen
 */
var qpRegistry = {
	widgets: {},
	register: function(name, widgetClass) {
		if (this.widgets[name]) {
			console.warn("qpWidget '" + name + "' je již registrován.");
		}
		this.widgets[name] = widgetClass;
	},
	get: function(name) {
		return this.widgets[name];
	}
};