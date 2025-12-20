var qpTabs = qpWidget.extend({
	defaults: {
		active: 0
	},
	_create: function() {
		this.tabs = this.el.find(".tab");
		this.contents = this.el.find(".tab-content");
	},
	_bind: function() {
		var self = this;
		this.tabs.on("click", function() {
			var index = $(this).index();
			self.activate(index);
		});
	},
	render: function() {
		this.activate(this.options.active);
	},
	activate: function(index) {
		this.tabs.removeClass("active").eq(index).addClass("active");
		this.contents.removeClass("active").eq(index).addClass("active");
		this.trigger("change", index);
	}
});

$.qpDefine("qpTabs", qpTabs);
