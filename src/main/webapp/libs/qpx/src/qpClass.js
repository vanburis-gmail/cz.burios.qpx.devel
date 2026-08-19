// ================================
// OOP engine: Class
// ================================
(function(global) {

	var Class = function() {};
	
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
		SubClass.mixin = Class.mixin;
		
		return SubClass;
	};

	// Přimíchání dalších vlastností do prototypu (obdoba Java interface / traits).
	// Používá se např. pro vložení QPX.EventsMixin (on/off/trigger) do QPX.Widget.
	Class.mixin = function() {
		var mixins = Array.prototype.slice.call(arguments);
		for (var i = 0; i < mixins.length; i++) {
			var mixin = mixins[i];
			for (var name in mixin) {
				if (name !== "constructor") {
					this.prototype[name] = mixin[name];
				}
			}
		}
		return this;
	};

	global.Class = Class;
})(window);

// ================================
// Globální konfigurace frameworku
// ================================
var qpConfig = {
	debug: false
};

// ================================
// Jmenný prostor knihovny QPX
// ================================
(function(global) {
	var QPX = global.QPX || (global.QPX = {});
	QPX.version = "0.2.0";
	QPX.Class = Class;     // stejná třída je dostupná jak globálně jako Class, tak jako QPX.Class
	QPX.config = qpConfig; // totéž pro globální konfiguraci
	global.QPX = QPX;
})(window);
