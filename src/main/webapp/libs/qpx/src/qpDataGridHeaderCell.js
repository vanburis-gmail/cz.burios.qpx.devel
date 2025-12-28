/**
 * qpDataGridHeaderCell
 */
var qpDataGridHeaderCell = qpWidget.extend({

    _widgetName: "qpDataGridHeaderCell",

    defaults: {
        column: null,
        grid: null,
        index: 0
    },

    _create: function() {
        var col = this.options.column;

        // wrapper – jeden cell
        this.wrapper = $("<div class='qp-dg-header-cell'></div>")
            .appendTo(this.el);

        // text
        this.title = $("<div class='qp-dg-header-title'></div>")
            .text(col.title || "")
            .appendTo(this.wrapper);

        // sort ikona
        this.sortIcon = $("<div class='qp-dg-sort-icon'></div>")
            .appendTo(this.wrapper);

        // zarovnání
        if (col.align === "right") {
            this.title.css("text-align", "right");
        } else if (col.align === "center") {
            this.title.css("text-align", "center");
        } else {
            this.title.css("text-align", "left");
        }

        // počáteční šířka z definice
        if (col.width) {
            this.setWidth(col.width);
        }

        // sortable flag (použijeme v _bind)
        if (col.sortable !== false && col.field) {
            this.wrapper.addClass("sortable");
        }

        this.updateSortIcon();
    },
	/*
	_bind: function() {
	    var self = this;
	    var ns = "." + this._widgetName;
	    var col = this.options.column;
	    var grid = this.options.grid;

	    if (!grid || !col || col.sortable === false || !col.field) return;

	    this.wrapper.on("click" + ns, function(e) {
	        e.preventDefault();
	        e.stopPropagation();

	        grid._setSort(col.field);   // 🔥 TADY SE SPOUŠTÍ AJAX SORT
	    });
	},
	*/
    _bind: function() {
        var self = this;
        var ns = "." + this._widgetName;
        var col = this.options.column;
        var grid = this.options.grid;

        if (!grid || !col || col.sortable === false || !col.field) return;

        this.wrapper.on("click" + ns, function(e) {
            e.preventDefault();
            e.stopPropagation();

            grid._setSort(col.field, e.shiftKey);   // 🔥 SHIFT MULTI-SORT
        });
    },

    // ---------------------------------------
    // SORT ICON UPDATE
    // ---------------------------------------
	/*
    updateSortIcon: function() {
        var grid = this.options.grid;
        var col = this.options.column;

        if (!grid || !grid._state || !grid._state.sort) {
            this.sortIcon.removeClass("asc desc").hide();
            return;
        }

        var sort = grid._state.sort;

        if (sort.field !== col.field || !sort.dir) {
            this.sortIcon.removeClass("asc desc").hide();
            return;
        }

        this.sortIcon.show();

        if (sort.dir === "asc") {
            this.sortIcon.removeClass("desc").addClass("asc");
        } else {
            this.sortIcon.removeClass("asc").addClass("desc");
        }
    },
	*/
	updateSortIcon: function() {
	    var grid = this.options.grid;
	    var col = this.options.column;

	    var sorts = grid._state.sort;
	    var index = sorts.findIndex(s => s.field === col.field);

	    if (index === -1) {
	        this.sortIcon.removeClass("asc desc").hide();
	        this.wrapper.removeClass("multi-sort");
	        return;
	    }

	    var sort = sorts[index];

	    this.sortIcon.show();
	    this.wrapper.addClass("multi-sort");

	    if (sort.dir === "asc") {
	        this.sortIcon.removeClass("desc").addClass("asc");
	    } else {
	        this.sortIcon.removeClass("asc").addClass("desc");
	    }

	    // pořadí sortu (1,2,3…)
	    this.sortIcon.attr("data-order", index + 1);
	},
	
    // ---------------------------------------
    // WIDTH HANDLING
    // ---------------------------------------
    setWidth: function(w) {
        if (typeof w === "number") w = w + "px";
        this.wrapper.css("width", w);
    },

    destroy: function() {
        var ns = "." + this._widgetName;
        if (this.wrapper) {
            this.wrapper.off(ns);
        }
        this.el.empty();
        this.el.removeData(this._widgetName);
    }
});

$.qpDefine("qpDataGridHeaderCell", qpDataGridHeaderCell);
