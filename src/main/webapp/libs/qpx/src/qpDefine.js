/**
 * - registraci widgetu
 * - jQuery plugin wrapper
 * - metadata (_widgetName)
 * - bezpečnou inicializaci
 */
(function($) {
	$.qpDefine = function(name, widgetClass) {
		// registrace do frameworku
		qpRegistry.register(name, widgetClass);
		$.fn[name] = function(options) {
			return this.each(function() {
				var instance = $.data(this, name);
				if (!instance) {
					instance = new widgetClass(this, options);
					instance._widgetName = name;
					$.data(this, name, instance);
				}
				if (typeof options === "string") {
					var method = options;
					if (typeof instance[method] === "function") {
						instance[method].apply(instance, Array.prototype.slice.call(arguments, 1));
					}
				}
			});
		};
	};
})(jQuery);