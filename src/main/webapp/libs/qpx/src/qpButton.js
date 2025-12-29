var qpButton = qpWidget.extend({
	_widgetName: "qpButton",
	defaults: {
		id: null,
		text: "",
		icon: null,
		toggle: false,
		onClick: null
	},
	_create: function() {
		this.el.addClass("qp-btn");
		if (this.options.icon) {
			var $icon = $("<span class='qp-btn-icon'></span>");
			if (this.options.icon.indexOf("<svg") === 0) {
				$icon.html(this.options.icon);
			} else if (this.options.icon.indexOf("/") !== -1) {
				$icon.append("<img src='" + this.options.icon + "'/>");
			} else {
				$icon.addClass(this.options.icon);
			}
			this.el.append($icon);
		}
		if (this.options.text) {
			this.el.append("<span class='qp-btn-text'>" + this.options.text + "</span>");
		}
		if (this.options.toggle) {
			this.el.addClass("qp-btn-toggle");
		}
		this._bind();
	},
	_bind: function() {
		var self = this;

		this.el.on("click." + this._widgetName, function() {
			if (self.options.toggle) {
				self.el.toggleClass("active");
			}
			if (self.options.onClick) {
				self.options.onClick(self.options.id, self.el);
			}
		});
	}
});

$.qpDefine("qpButton", qpButton);
