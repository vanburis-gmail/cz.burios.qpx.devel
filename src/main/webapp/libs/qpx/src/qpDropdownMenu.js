var qpDropdownMenu = qpWidget.extend({
	_widgetName: "qpDropdownMenu",
	defaults: {
		id: null,
		text: "",
		icon: null,
		items: [],
		onClick: null
	},
	_create: function() {
		var self = this;
		this.el.addClass("qp-btn qp-btn-dropdown");
		if (this.options.icon) {
			var $icon = $("<span class='qp-btn-icon'></span>");
			$icon.append("<img src='" + this.options.icon + "'/>");
			this.el.append($icon);
		}
		this.el.append("<span class='qp-btn-text'>" + this.options.text + "</span>");
		this.el.append("<span class='qp-btn-arrow'>▼</span>");

		this.menu = $("<ul class='qp-toolbar-dropdown'></ul>").appendTo("body").hide();

		this.options.items.forEach(function(mi) {
            $("<li>" + mi.text + "</li>")
                .appendTo(self.menu)
                .on("click", function(e) {
                    e.stopPropagation();
                    self.menu.hide();
                    if (self.options.onClick) {
                        self.options.onClick(mi.id, self.el);
                    }
                });
        });
        this._bind();
    },
    _bind: function() {
        var self = this;
        this.el.on("click." + this._widgetName, function(e) {
            e.stopPropagation();
            self._toggle();
        });
        $(document).on("click." + this._widgetName, function() {
            self.menu.hide();
        });
    },
    _toggle: function() {
        if (this.menu.is(":visible")) {
            this.menu.hide();
        } else {
            var o = this.el.offset();
            this.menu.css({
                top: o.top + this.el.outerHeight(),
                left: o.left
            }).show();
        }
    }
});

$.qpDefine("qpDropdownMenu", qpDropdownMenu);
