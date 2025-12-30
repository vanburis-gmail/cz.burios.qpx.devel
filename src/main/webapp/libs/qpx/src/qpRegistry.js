/**
 *  qpRegistry Umožní:
 * 
 * - registrovat widgety podle jména
 * - později je introspektovat
 * - automaticky inicializovat widgety přes data‑atributy
 * - řešit konflikty jmen
 */
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
