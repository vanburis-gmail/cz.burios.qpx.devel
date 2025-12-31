/* --------------------------------------------------------
 * widget: qpTabNav
 * role: navigace tabů + overflow + responsive/scroll
 * --------------------------------------------------------
 */
var qpTabNav = qpOverflowWidget.extend({

    _widgetName: "qpTabNav",

    version: "1.0.0",

    defaults: {
        // deklarativní JSON konfigurace
        // [{ title, icon }]
        tabs: [],

        // vzhled/behavior
        closable: true,
        draggable: true,
        responsive: true,     // true = popup, false = scroll tlačítka
        contextMenu: true
    },

    /* ---------------------------------------
     * CREATE
     * ---------------------------------------
     */
    _create: function() {

        // wrapper pro navigaci
        this.el.addClass("qp-tabs-nav-wrapper");

        // samotný <ul> s taby
        this.nav = this.el.find(".qp-tabs-nav");
        if (!this.nav.length) {
            this.nav = $("<ul class='qp-tabs-nav'></ul>").appendTo(this.el);
        }

        // existující HTML <li> dekorujeme
        this._decorateExistingTabs();

        // JSON tabs → vytvořit
        this._createTabsFromOptions();

        // overflow logika (more button, popup, resize observer)
        qpOverflowWidget.prototype._create.call(this);

        // navigační tlačítka (scroll) pro responsive:false
        if (this.options.responsive === false) {
            this._createScrollButtons();
        }

        // bind událostí
        this._bind();
    },

    /* ---------------------------------------
     * INITIAL TABS DECORATION
     * ---------------------------------------
     */
    _decorateExistingTabs: function() {
        var self = this;
        this.nav.children("li").each(function() {
            self._decorateTab($(this));
        });
    },

    _decorateTab: function($tab) {
        if (this.options.closable && !$tab.find(".qp-tab-close").length) {
            $("<span class='qp-tab-close'>×</span>").appendTo($tab);
        }
        if (this.options.draggable) {
            $tab.attr("draggable", true);
        }
    },

    _createTabsFromOptions: function() {
        var self = this;

        if (!Array.isArray(this.options.tabs) || !this.options.tabs.length) return;

        this.options.tabs.forEach(function(t) {
            self.addTab(t.title || "Tab", t.icon || null);
        });
    },

    /* ---------------------------------------
     * PUBLIC API
     * ---------------------------------------
     */
    addTab: function(title, icon) {
        var html = "";

        if (icon) {
            html += "<span class='qp-tab-icon " + icon + "'></span>";
        }
        html += title;

        var $tab = $("<li>" + html + "</li>");
        this._decorateTab($tab);
        this.nav.append($tab);
        this.checkOverflow && this.checkOverflow();
        return $tab.index();
    },

    removeTab: function(index) {
        this.nav.children().eq(index).remove();
        this.checkOverflow && this.checkOverflow();
    },

    activate: function(index) {
        var tabs = this.nav.children();
        if (!tabs.length) return;

        index = Math.max(0, Math.min(index, tabs.length - 1));

        tabs.removeClass("active").eq(index).addClass("active");

        // posunout do viditelné oblasti při scroll režimu
        if (this.options.responsive === false) {
            this._scrollTabIntoView(index);
        }
    },

    getTabs: function() {
        return this.nav.children();
    },

    onTabClick: function(handler) {
        this._onTabClick = handler;
    },

    onTabClose: function(handler) {
        this._onTabClose = handler;
    },

    /* ---------------------------------------
     * BIND EVENTS
     * ---------------------------------------
     */
    _bind: function() {
        var self = this;
        var ns = "." + this._widgetName;

        // click na tab
        this.nav.on("click" + ns, "li", function(e) {
            var $li = $(this);

            // ignore click na close (řešíme zvlášť)
            if ($(e.target).closest(".qp-tab-close").length) return;

            var index = $li.index();
            if (self._onTabClick) self._onTabClick(index);
        });

        // close button
        this.nav.on("click" + ns, ".qp-tab-close", function(e) {
            e.stopPropagation();
            var index = $(this).closest("li").index();
            if (self._onTabClose) self._onTabClose(index);
        });

        // drag & drop (základní varianta)
        if (this.options.draggable) {
            this._bindDragAndDrop(ns);
        }
    },

    _bindDragAndDrop: function(ns) {
        var self = this;
        var dragIndex = null;

        this.nav.on("dragstart" + ns, "li", function(e) {
            dragIndex = $(this).index();
            e.originalEvent.dataTransfer.effectAllowed = "move";
        });

        this.nav.on("dragover" + ns, "li", function(e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "move";
        });

        this.nav.on("drop" + ns, "li", function(e) {
            e.preventDefault();
            var targetIndex = $(this).index();
            if (dragIndex == null || dragIndex === targetIndex) return;

            var $tabs = self.nav.children();
            var $dragged = $tabs.eq(dragIndex);

            if (targetIndex === $tabs.length - 1) {
                $dragged.appendTo(self.nav);
            } else if (dragIndex < targetIndex) {
                $dragged.insertAfter($tabs.eq(targetIndex));
            } else {
                $dragged.insertBefore($tabs.eq(targetIndex));
            }

            dragIndex = null;
            self.checkOverflow && self.checkOverflow();
        });
    },

    /* ---------------------------------------
     * SCROLL BUTTONS (responsive:false)
     * ---------------------------------------
     */
    _createScrollButtons: function() {
        if (this.el.find(".qp-tabs-nav-prev").length) return;

        this.prevBtn = $("<button type='button' class='qp-tabs-nav-prev' aria-label='Previous tabs'>&lsaquo;</button>")
            .prependTo(this.el);
        this.nextBtn = $("<button type='button' class='qp-tabs-nav-next' aria-label='Next tabs'>&rsaquo;</button>")
            .appendTo(this.el);

        var self = this;
        this.prevBtn.on("click", function() {
            self._scrollBy(-100);
        });
        this.nextBtn.on("click", function() {
            self._scrollBy(100);
        });

        this.nav.css({
            overflow: "hidden",
            whiteSpace: "nowrap"
        });
    },

    _scrollBy: function(delta) {
        var current = this.nav.scrollLeft();
        this.nav.scrollLeft(current + delta);
    },

    _scrollTabIntoView: function(index) {
        var $tab = this.nav.children().eq(index);
        if (!$tab.length) return;

        var navOffset = this.nav.offset().left;
        var navScroll = this.nav.scrollLeft();
        var navWidth = this.nav.innerWidth();

        var tabOffset = $tab.offset().left;
        var tabWidth = $tab.outerWidth();

        var left = tabOffset - navOffset + navScroll;
        var right = left + tabWidth;

        if (left < navScroll) {
            this.nav.scrollLeft(left);
        } else if (right > navScroll + navWidth) {
            this.nav.scrollLeft(right - navWidth);
        }
    },

    /* ---------------------------------------
     * OVERFLOW API (UNIFIED)
     * ---------------------------------------
     */
    getOverflowTargetWidth: function() {
        return this.el.width();
    },

    getOverflowItems: function() {
        var items = [];

        // pokud responsive:false, overflow řešíme přes scroll tlačítka
        if (this.options.responsive === false) {
            return items;
        }

        var wrapperRight = this.el.offset().left + this.el.width();
        var moreWidth = this.moreBtn ? this.moreBtn.outerWidth() : 0;

        this.nav.children().each((i, el) => {
            var $el = $(el);
            var right = $el.offset().left + $el.outerWidth();

            if (right > wrapperRight - moreWidth) {
                items.push({
                    text: $el.text().trim(),
                    action: () => {
                        if (this._onTabClick) this._onTabClick(i);
                        this.activate(i);
                    }
                });
            }
        });

        return items;
    },

    onOverflowChange: function(isOverflowing) {
        // místo pro další logiku (třeba CSS stavy)
    }
});

$.qpDefine("qpTabNav", qpTabNav);
