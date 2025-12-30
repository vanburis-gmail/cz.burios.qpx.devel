/**
 * 
 * qpMixin (rozšiřitelnost bez dědičnosti)
 * Mixiny jsou ideální pro:
 * - resizable
 * - selectable
 * - draggable
 * - keyboard navigation
 * - event namespaces
 * 
 * Příklad použití:
 * <pre>
 * qpMixin.apply(qpTabs.prototype, {
 *   logActive: function() {
 *     console.log("Active tab:", this.options.active);
 *   }
 * });
 * </pre>
 * 
 */
var qpMixin = {
	apply: function(targetPrototype, mixin) {
		Object.keys(mixin).forEach(function(key) {
			if (typeof mixin[key] === "function") {
				targetPrototype[key] = mixin[key];
			}
		});
	}
};
