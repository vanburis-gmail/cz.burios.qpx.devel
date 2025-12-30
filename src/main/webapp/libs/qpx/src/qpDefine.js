/**
 * - registraci widgetu
 * - jQuery plugin wrapper
 * - metadata (_widgetName)
 * - bezpečnou inicializaci
 */
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

/*
 * Automatická inicializace přes data-atributy
 * <div data-qp="qpTabs" data-active="1"></div>
 */
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