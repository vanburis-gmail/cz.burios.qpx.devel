var qpTabs = qpWidget.extend({

    version: "1.0.0",

    defaults: {
        active: 0,
        closable: true,
        draggable: true,
        lazy: false,
        lazyLoader: null,
        ajax: false,
        ajaxUrl: null,
        ajaxMap: {},
        contextMenu: true,
        autoInitNested: true,
        data: [],

        responsive: true,      // NOVÉ: true = overflow -> popup, false = scroll arrows
        popupMaxHeight: 300,

        onAdd: null,
        onRemove: null,
        onActivate: null,
        onReorder: null,
        onAjaxLoad: null
    },

    // ---------------------------------------
    // CREATE
    // ---------------------------------------
    _create: function() {
        this.nav = this.el.find(".qp-tabs-nav");
        this.content = this.el.find(".qp-tabs-content");

        if (!this.nav.length) {
            this.nav = $("<ul class='qp-tabs-nav'></ul>");
            this.el.prepend(this.nav);
        }
        if (!this.content.length) {
            this.content = $("<div class='qp-tabs-content'></div>");
            this.el.append(this.content);
        }

        // wrapper pro scroll
        this.nav.wrap("<div class='qp-tabs-nav-wrapper'></div>");
        this.wrapper = this.nav.parent();

        // šipky
        this.leftArrow = $("<div class='qp-tabs-scroll-left'>◀</div>").prependTo(this.wrapper);
        this.rightArrow = $("<div class='qp-tabs-scroll-right'>▶</div>").appendTo(this.wrapper);

        // vykreslení existujících HTML tabů
        this._renderInitialTabs();

        // taby z options.data
        if (this.options.data && this.options.data.length) {
            this._renderDataTabs();
        }

        if (this.options.draggable) {
            this._enableDrag();
        }
        if (this.options.contextMenu) {
            this._bindContextMenu();
        }

        this._bindScrollButtons();

        // kontrola overflow (responsive / scroll)
        this._checkOverflow();
        $(window).on("resize." + this._widgetName, this._checkOverflow.bind(this));
		this._resizeObserver = new ResizeObserver(() => {
		    this._checkOverflow();

		    // 🔥 pokud je popup otevřený, přepočítat jeho pozici
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

        // kliknutí na tab
        this.nav.on("click" + ns, "li", function(e) {
            if ($(e.target).hasClass("qp-tab-close")) return;
            var index = $(this).index();
            self.activate(index);
        });

        // zavírání tabů
        this.nav.on("click" + ns, ".qp-tab-close", function(e) {
            e.stopPropagation();
            var index = $(this).closest("li").index();
            self.remove(index);
        });
    },

    // ---------------------------------------
    // RENDER
    // ---------------------------------------
    render: function() {
        this.activate(this.options.active);
    },

    afterRender: function() {
        if (this.options.autoInitNested) {
            this._initNestedTabs();
        }
    },

    // ---------------------------------------
    // PRIVATE: existující HTML taby
    // ---------------------------------------
    _renderInitialTabs: function() {
        var self = this;

        this.nav.children().each(function() {
            self._decorateTab($(this));
        });
    },

    // ---------------------------------------
    // PRIVATE: taby z options.data
    // ---------------------------------------
    _renderDataTabs: function() {
        var self = this;

        this.options.data.forEach(function(item) {
            var idx = self.add(
                item.title || "Tab",
                item.content || "",
                item.icon || null
            );

            if (item.ajaxUrl) {
                self.options.ajax = true;
                self.options.ajaxMap[idx] = item.ajaxUrl;
            }

            if (item.lazyLoader) {
                self.options.lazy = true;
                self.options.lazyLoader = item.lazyLoader;
            }
        });
    },

    // ---------------------------------------
    // PRIVATE: dekorace tabu (close)
    // ---------------------------------------
    _decorateTab: function($tab) {
        if (this.options.closable && !$tab.find(".qp-tab-close").length) {
            $("<span class='qp-tab-close'>×</span>").appendTo($tab);
        }
    },

    // ---------------------------------------
    // PRIVATE: ikony
    // ---------------------------------------
    _renderIcon: function($tab, icon) {
        if (!icon) return;

        var $icon = $("<span class='qp-tab-icon'></span>");

        if (icon.indexOf("<svg") === 0) {
            $icon.html(icon);
        } else if (icon.indexOf("/") !== -1) {
            $icon.append("<img src='" + icon + "'/>");
        } else {
            $icon.addClass(icon);
        }

        $tab.prepend($icon);
    },

    // ---------------------------------------
    // PUBLIC: aktivace tabu
    // ---------------------------------------
    activate: function(index) {
        var tabs = this.nav.children();
        var contents = this.content.children();

        if (!tabs.length) return;

        index = Math.max(0, Math.min(index, tabs.length - 1));
        this.options.active = index;

        var self = this;

        // Lazy load
        if (this.options.lazy && !contents.eq(index).data("loaded")) {
            contents.eq(index).html("<div class='qp-tabs-loading'>Loading...</div>");

            if (typeof this.options.lazyLoader === "function") {
                this.options.lazyLoader.call(this, index, function(html) {
                    contents.eq(index).html(html);
                    contents.eq(index).data("loaded", true);
                });
            }
        }

        // AJAX load
        if (this.options.ajax && !contents.eq(index).data("loaded")) {
            contents.eq(index).html("<div class='qp-tabs-loading'>Loading...</div>");

            var url = this.options.ajaxMap[index] || this.options.ajaxUrl;

            if (url) {
                $.get(url, function(html) {
                    contents.eq(index).html(html);
                    contents.eq(index).data("loaded", true);

                    if (typeof self.options.onAjaxLoad === "function") {
                        self.options.onAjaxLoad.call(self, index, html);
                    }
                });
            }
        }

        tabs.removeClass("active").eq(index).addClass("active");
        contents.removeClass("active").eq(index).addClass("active");

        // nested refresh
        if (this.options.autoInitNested) {
            this.content.children().eq(index).find("[data-qp='qpTabs']").each(function() {
                var inst = $(this).data("qpTabs");
                if (inst) inst.refresh();
            });
        }

        if (typeof this.options.onActivate === "function") {
            this.options.onActivate.call(this, index);
        }

        this.trigger("activate", index);
    },

    // ---------------------------------------
    // PUBLIC: add
    // ---------------------------------------
    add: function(title, htmlContent, icon) {
        var index = this.nav.children().length;

        var $tab = $("<li>" + title + "</li>");
        this._renderIcon($tab, icon);
        this._decorateTab($tab);
        this.nav.append($tab);

        var $content = $("<div class='qp-tab-panel'></div>").html(htmlContent || "");
        this.content.append($content);

        if (typeof this.options.onAdd === "function") {
            this.options.onAdd.call(this, index, $tab, $content);
        }

        this.trigger("add", { index, tab: $tab, content: $content });

        this.activate(index);
        this._checkOverflow();

        return index;
    },

    // ---------------------------------------
    // PUBLIC: remove
    // ---------------------------------------
    remove: function(index) {
        var tabs = this.nav.children();
        var contents = this.content.children();

        if (index < 0 || index >= tabs.length) return;

        var $tab = tabs.eq(index);
        var $content = contents.eq(index);

        if (typeof this.options.onRemove === "function") {
            this.options.onRemove.call(this, index, $tab, $content);
        }

        this.trigger("remove", { index, tab: $tab, content: $content });

        $tab.remove();
        $content.remove();

        var newIndex = Math.min(index, this.nav.children().length - 1);
        this.activate(newIndex);
        this._checkOverflow();
    },

    // ---------------------------------------
    // PUBLIC: rename
    // ---------------------------------------
    rename: function(index, newTitle) {
        var $tab = this.nav.children().eq(index);
        if (!$tab.length) return;

        $tab.contents().filter(function() {
            return this.nodeType === 3;
        }).first().replaceWith(newTitle);
        this._checkOverflow();
    },

    // ---------------------------------------
    // DRAG & DROP
    // ---------------------------------------
    _enableDrag: function() {
        var self = this;
        var ns = "." + this._widgetName;

        this.nav.on("dragstart" + ns, "li", function(e) {
            e.originalEvent.dataTransfer.setData("text/plain", $(this).index());
            $(this).addClass("dragging");
        });

        this.nav.on("dragend" + ns, "li", function() {
            $(this).removeClass("dragging");
        });

        this.nav.on("dragover" + ns, "li", function(e) {
            e.preventDefault();
            $(this).addClass("drag-over");
        });

        this.nav.on("dragleave" + ns, "li", function() {
            $(this).removeClass("drag-over");
        });

        this.nav.on("drop" + ns, "li", function(e) {
            e.preventDefault();
            var oldIndex = parseInt(e.originalEvent.dataTransfer.getData("text/plain"), 10);
            var newIndex = $(this).index();

            $(this).removeClass("drag-over");
            self._reorder(oldIndex, newIndex);
        });

        this.nav.children().attr("draggable", true);
    },

    _reorder: function(oldIndex, newIndex) {
        if (oldIndex === newIndex) return;

        var tabs = this.nav.children();
        var contents = this.content.children();

        var $tab = tabs.eq(oldIndex);
        var $content = contents.eq(oldIndex);

        if (newIndex < oldIndex) {
            $tab.insertBefore(tabs.eq(newIndex));
            $content.insertBefore(contents.eq(newIndex));
        } else {
            $tab.insertAfter(tabs.eq(newIndex));
            $content.insertAfter(contents.eq(newIndex));
        }

        if (typeof this.options.onReorder === "function") {
            this.options.onReorder.call(this, oldIndex, newIndex);
        }

        this.trigger("reorder", { oldIndex, newIndex });

        this.activate(newIndex);
        this._checkOverflow();
    },

    // ---------------------------------------
    // NESTED TABS
    // ---------------------------------------
    _initNestedTabs: function() {
        this.content.find("[data-qp='qpTabs']").each(function() {
            var $nested = $(this);
            if (!$nested.data("qpTabs")) {
                $nested.qpTabs();
            }
        });
    },

    // ---------------------------------------
    // KONTEXTOVÉ MENU
    // ---------------------------------------
    _bindContextMenu: function() {
        var self = this;
        var ns = "." + this._widgetName;

        this.nav.on("contextmenu" + ns, "li", function(e) {
            e.preventDefault();
            var index = $(this).index();
            self._showContextMenu(e.pageX, e.pageY, index);
        });
    },

    _showContextMenu: function(x, y, index) {
        var self = this;

        $(".qp-tabs-context").remove();

        var $menu = $("<ul class='qp-tabs-context'></ul>").appendTo("body");

        var items = [
            { text: "Zavřít", action: () => self.remove(index) },
            { text: "Zavřít ostatní", action: () => self._closeOthers(index) },
            { text: "Zavřít všechny", action: () => self._closeAll() },
            { text: "Refresh", action: () => self.refresh() }
        ];

        items.forEach(function(item) {
            $("<li>" + item.text + "</li>")
                .appendTo($menu)
                .on("click", function() {
                    item.action();
                    $menu.remove();
                });
        });

        $menu.css({ top: y, left: x });
    },

    _closeOthers: function(index) {
        var self = this;
        this.nav.children().each(function(i) {
            if (i !== index) self.remove(i < index ? 0 : 1);
        });
    },

    _closeAll: function() {
        while (this.nav.children().length) {
            this.remove(0);
        }
    },

    // ---------------------------------------
    // RESPONSIVE / SCROLL
    // ---------------------------------------
    _checkOverflow: function() {
        var wrapperWidth = this.wrapper.width();
        var navWidth = this.nav[0].scrollWidth;

        if (this.options.responsive) {
            if (navWidth > wrapperWidth) {
                this._enablePopupOverflow();
            } else {
                this._disablePopupOverflow();
            }
            this._disableScrollOverflow();
        } else {
            this._disablePopupOverflow();
            if (navWidth > wrapperWidth) {
                this._enableScrollOverflow();
            } else {
                this._disableScrollOverflow();
            }
        }
    },

	// --- Popup overflow (responsive: true) ---
	_enablePopupOverflow: function() {
		if (this.popupEnabled) return;
		this.popupEnabled = true;

		var self = this;

		// vytvořit tlačítko More uvnitř wrapperu
		this.moreBtn = $("<div class='qp-tabs-more'>⋯</div>").appendTo(this.wrapper);

		// popup menu (zatím skryté)
		this.moreMenu = $("<ul class='qp-tabs-more-menu'></ul>")
			.appendTo("body")
			.hide(); // 🔥 popup je při vytvoření vždy zavřený

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

		this.nav.children().each(function(i) {
			var $tab = $(this);
			var clone = $tab.clone();
			clone.find(".qp-tab-close, .qp-tab-icon").remove();
			var title = clone.text().trim();

			$("<li>" + title + "</li>")
				.appendTo(self.moreMenu)
				.on("click", function() {
					self.activate(i);
					self.moreMenu.hide();
				});
		});
	},

	_togglePopupMenu: function() {
	    if (!this.moreMenu || !this.moreBtn) return;

	    if (this.moreMenu.is(":visible")) {
	        this.moreMenu.hide();
	    } else {
	        this._positionPopupMenu(); // zarovnání popupu
	        this.moreMenu.show();
	    }
	},

	_positionPopupMenu: function() {
		if (!this.moreMenu || !this.moreBtn) return;

		var btnOffset = this.moreBtn.offset();
		var btnHeight = this.moreBtn.outerHeight();
		var btnWidth = this.moreBtn.outerWidth();
		var menuWidth = this.moreMenu.outerWidth();

		var left = btnOffset.left + btnWidth - menuWidth;
		var top = btnOffset.top + btnHeight;

		this.moreMenu.css({
			top: top,
			left: left
		});
	},

    // --- Scroll overflow (responsive: false) ---
    _enableScrollOverflow: function() {
        this.leftArrow.show();
        this.rightArrow.show();
    },

    _disableScrollOverflow: function() {
        this.leftArrow.hide();
        this.rightArrow.hide();
        this.nav.scrollLeft(0);
    },

    _bindScrollButtons: function() {
        var self = this;
        var ns = "." + this._widgetName;

        this.leftArrow.on("click" + ns, function() {
            self._scrollTabs(-100);
        });

        this.rightArrow.on("click" + ns, function() {
            self._scrollTabs(100);
        });
    },

    _scrollTabs: function(amount) {
        this.nav.animate({
            scrollLeft: this.nav.scrollLeft() + amount
        }, 150);
    },

    // ---------------------------------------
    // API
    // ---------------------------------------
    getTabs: function() {
        return this.nav.children().map(function() {
            var clone = $(this).clone();
            clone.find(".qp-tab-close, .qp-tab-icon").remove();
            return clone.text().trim();
        }).get();
    },

    move: function(from, to) {
        this._reorder(from, to);
    }
});

$.qpDefine("qpTabs", qpTabs);
