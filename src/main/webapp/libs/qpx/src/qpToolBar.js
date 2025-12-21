var qpToolBar = qpWidget.extend({

    version: "1.0.0",

    defaults: {
        data: [],               // seznam tlačítek
        responsive: true,       // true = overflow → popup
        popupMaxHeight: 300,
        scrollStep: 80,         // posun při scroll režimu
        onClick: null,          // callback při kliknutí na tlačítko
        onToggle: null          // callback při toggle tlačítku
    },

    // ---------------------------------------
    // CREATE
    // ---------------------------------------
    _create: function() {
        this.wrapper = $("<div class='qp-toolbar-wrapper'></div>").appendTo(this.el);
        this.bar = $("<div class='qp-toolbar'></div>").appendTo(this.wrapper);

        // scroll arrows
        this.leftArrow = $("<div class='qp-toolbar-scroll-left'>◀</div>").prependTo(this.wrapper);
        this.rightArrow = $("<div class='qp-toolbar-scroll-right'>▶</div>").appendTo(this.wrapper);

        // vykreslit tlačítka
        this._renderDataButtons();

        // responsive režim
        this._checkOverflow();

        // scroll buttons
        this._bindScrollButtons();

        // ResizeObserver
        this._resizeObserver = new ResizeObserver(() => {
            this._checkOverflow();
            if (this.moreMenu && this.moreMenu.is(":visible")) {
                this._positionPopupMenu();
            }
        });
        this._resizeObserver.observe(this.wrapper[0]);
    },

    // ---------------------------------------
    // BIND
    // ---------------------------------------
    _bind: function() {
        var self = this;
        var ns = "." + this._widgetName;

        // kliknutí na tlačítko
        this.bar.on("click" + ns, ".qp-btn", function(e) {
            var $btn = $(this);
            var id = $btn.data("id");

            // toggle
            if ($btn.hasClass("qp-btn-toggle")) {
                $btn.toggleClass("active");
                if (typeof self.options.onToggle === "function") {
                    self.options.onToggle.call(self, id, $btn.hasClass("active"));
                }
            }

            // callback
            if (typeof self.options.onClick === "function") {
                self.options.onClick.call(self, id, $btn);
            }

            self.trigger("click", { id, button: $btn });
        });
    },

    // ---------------------------------------
    // RENDER
    // ---------------------------------------
    render: function() {},

    // ---------------------------------------
    // DATA → BUTTONS
    // ---------------------------------------
    _renderDataButtons: function() {
        var self = this;

        this.options.data.forEach(function(item) {
            if (item.type === "separator") {
                $("<div class='qp-separator'></div>").appendTo(self.bar);
                return;
            }

            var $btn = $("<div class='qp-btn'></div>")
                .attr("data-id", item.id || "")
                .appendTo(self.bar);

            // ikona
            if (item.icon) {
                var $icon = $("<span class='qp-btn-icon'></span>");
                if (item.icon.indexOf("<svg") === 0) {
                    $icon.html(item.icon);
                } else if (item.icon.indexOf("/") !== -1) {
                    $icon.append("<img src='" + item.icon + "'/>");
                } else {
                    $icon.addClass(item.icon);
                }
                $btn.append($icon);
            }

            // text
            if (item.text) {
                $btn.append("<span class='qp-btn-text'>" + item.text + "</span>");
            }

            // toggle
            if (item.toggle) {
                $btn.addClass("qp-btn-toggle");
            }

            // dropdown
            if (item.menu) {
                $btn.addClass("qp-btn-dropdown");
                $btn.append("<span class='qp-btn-arrow'>▼</span>");
                self._createDropdown($btn, item.menu);
            }
        });
    },

    // ---------------------------------------
    // DROPDOWN
    // ---------------------------------------
    _createDropdown: function($btn, menuItems) {
        var self = this;

        var $menu = $("<ul class='qp-toolbar-dropdown'></ul>").appendTo("body").hide();

        menuItems.forEach(function(mi) {
            $("<li>" + mi.text + "</li>")
                .appendTo($menu)
                .on("click", function(e) {
                    e.stopPropagation();
                    $menu.hide();
                    if (typeof self.options.onClick === "function") {
                        self.options.onClick.call(self, mi.id, $btn);
                    }
                });
        });

        $btn.on("click", function(e) {
            e.stopPropagation();
            self._toggleDropdown($btn, $menu);
        });

        $(document).on("click." + this._widgetName, function() {
            $menu.hide();
        });
    },

    _toggleDropdown: function($btn, $menu) {
        if ($menu.is(":visible")) {
            $menu.hide();
        } else {
            var o = $btn.offset();
            $menu.css({
                top: o.top + $btn.outerHeight(),
                left: o.left
            }).show();
        }
    },

    // ---------------------------------------
    // RESPONSIVE OVERFLOW → POPUP
    // ---------------------------------------
    _checkOverflow: function() {
        var wrapperWidth = this.wrapper.width();
        var barWidth = this.bar[0].scrollWidth;

        if (this.options.responsive) {
            if (barWidth > wrapperWidth) {
                this._enablePopupOverflow();
            } else {
                this._disablePopupOverflow();
            }
            this._disableScrollOverflow();
        } else {
            this._disablePopupOverflow();
            if (barWidth > wrapperWidth) {
                this._enableScrollOverflow();
            } else {
                this._disableScrollOverflow();
            }
        }
    },

    _enablePopupOverflow: function() {
        if (this.popupEnabled) return;
        this.popupEnabled = true;

        var self = this;

        this.moreBtn = $("<div class='qp-toolbar-more'>⋯</div>").appendTo(this.wrapper);

        this.moreMenu = $("<ul class='qp-toolbar-more-menu'></ul>")
            .appendTo("body")
            .hide();

        this._fillPopupMenu();

        this.moreBtn.on("click." + this._widgetName, function(e) {
            e.stopPropagation();
            self._togglePopupMenu();
        });

        $(document).on("click." + this._widgetName, function() {
            self.moreMenu.hide();
        });
    },

    _disablePopupOverflow: function() {
        if (!this.popupEnabled) return;
        this.popupEnabled = false;

        if (this.moreBtn) this.moreBtn.remove();
        if (this.moreMenu) this.moreMenu.remove();

        $(document).off("click." + this._widgetName);
    },

    _fillPopupMenu: function() {
        var self = this;
        if (!this.moreMenu) return;

        this.moreMenu.empty();

        this.bar.children(".qp-btn").each(function() {
            var $btn = $(this);
            var id = $btn.data("id");
            var text = $btn.find(".qp-btn-text").text() || id;

            $("<li>" + text + "</li>")
                .appendTo(self.moreMenu)
                .on("click", function() {
                    self.trigger("click", { id, button: $btn });
                    if (typeof self.options.onClick === "function") {
                        self.options.onClick.call(self, id, $btn);
                    }
                    self.moreMenu.hide();
                });
        });
    },

    _togglePopupMenu: function() {
        if (!this.moreMenu || !this.moreBtn) return;

        if (this.moreMenu.is(":visible")) {
            this.moreMenu.hide();
        } else {
            this._positionPopupMenu();
            this.moreMenu.show();
        }
    },

    _positionPopupMenu: function() {
        var btnOffset = this.moreBtn.offset();
        var btnHeight = this.moreBtn.outerHeight();
        var btnWidth = this.moreBtn.outerWidth();
        var menuWidth = this.moreMenu.outerWidth();

        var left = btnOffset.left + btnWidth - menuWidth;
        var top = btnOffset.top + btnHeight;

        this.moreMenu.css({ top, left });
    },

    // ---------------------------------------
    // SCROLL OVERFLOW (responsive: false)
    // ---------------------------------------
    _enableScrollOverflow: function() {
        this.leftArrow.show();
        this.rightArrow.show();
    },

    _disableScrollOverflow: function() {
        this.leftArrow.hide();
        this.rightArrow.hide();
        this.bar.scrollLeft(0);
    },

    _bindScrollButtons: function() {
        var self = this;

        this.leftArrow.on("click." + this._widgetName, function() {
            self._scrollBar(-self.options.scrollStep);
        });

        this.rightArrow.on("click." + this._widgetName, function() {
            self._scrollBar(self.options.scrollStep);
        });
    },

    _scrollBar: function(amount) {
        this.bar.animate({
            scrollLeft: this.bar.scrollLeft() + amount
        }, 150);
    },

    // ---------------------------------------
    // DESTROY
    // ---------------------------------------
    destroy: function() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }

        this.el.off("." + this._widgetName);
        this.bar.off("." + this._widgetName);
        $(document).off("." + this._widgetName);
        $(window).off("." + this._widgetName);

        this.el.removeData(this._widgetName);
    }
});

$.qpDefine("qpToolBar", qpToolBar);
