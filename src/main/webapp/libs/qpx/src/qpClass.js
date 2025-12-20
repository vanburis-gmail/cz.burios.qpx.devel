(function(global) {

	var Class = function() { };

	Class.extend = function(props) {
		var _super = this.prototype;
		var prototype = Object.create(_super);

		for (var name in props) {
			if (typeof props[name] === "function" &&
				typeof _super[name] === "function") {

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

		return SubClass;
	};

	global.Class = Class;

})(window);
