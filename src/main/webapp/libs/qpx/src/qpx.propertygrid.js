/*!
 * qpx - qpPropertyGrid
 * PropertyGrid inspirovaný Kendo UI PropertyGrid.
 */

(function (qpx, $) {
    "use strict";

    var PropertyGrid = qpx.Widget.extend({

        defaults: {
            items: [],
            readOnly: false,
            showCategories: true,
            categoryField: "category",
            disabled: false,
            visible: true,

            onValueChanged: null,
            onItemChanged: null,
            onOptionChanged: null
        },

        render: function () {
            var cfg = this.config;

            this.$container
                .addClass("qpx-propertygrid")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled);

            if (cfg.onValueChanged) this.on("valueChanged", cfg.onValueChanged);
            if (cfg.onItemChanged) this.on("itemChanged", cfg.onItemChanged);
            if (cfg.onOptionChanged) this.on("optionChanged", cfg.onOptionChanged);

            this._renderGrid();
        },

        _renderGrid: function () {
            var self = this;
            var cfg = this.config;

            this.$container.empty();

            var groups = {};

            cfg.items.forEach(function (item) {
                var cat = cfg.showCategories ? (item[cfg.categoryField] || "General") : "_nocat";
                groups[cat] = groups[cat] || [];
                groups[cat].push(item);
            });

            Object.keys(groups).forEach(function (cat) {
                if (cfg.showCategories) {
                    self.$container.append(
                        $("<div class='qpx-pg-category'></div>").text(cat)
                    );
                }

                var $table = $("<table class='qpx-pg-table'></table>");

                groups[cat].forEach(function (item) {
                    var $tr = $("<tr class='qpx-pg-row'></tr>");

                    var $label = $("<td class='qpx-pg-label'></td>").text(item.label || item.field);
                    var $editor = $("<td class='qpx-pg-editor'></td>");

                    var editor = self._createEditor(item);
                    $editor.append(editor);

                    $tr.append($label, $editor);
                    $table.append($tr);
                });

                self.$container.append($table);
            });
        },

		_createEditor: function (item) {
		    var self = this;
		    var cfg = this.config;
		    var val = item.value;

		    if (cfg.readOnly || item.readOnly) {
		        return $("<span class='qpx-pg-readonly'></span>").text(val);
		    }

		    switch (item.editor) {

		        case "textbox":
		        case "text":
		            return qpx.ui({
		                view: "qpTextBox",
		                value: val,
		                onValueChanged: function (e) {
		                    self._updateValue(item, e.value);
		                }
		            }).getContainer();

		        case "number":
		        case "numberbox":
		            return qpx.ui({
		                view: "qpNumberBox",
		                value: val,
		                onValueChanged: function (e) {
		                    self._updateValue(item, Number(e.value));
		                }
		            }).getContainer();

		        case "checkbox":
		            return qpx.ui({
		                view: "qpCheckBox",
		                value: !!val,
		                onValueChanged: function (e) {
		                    self._updateValue(item, !!e.value);
		                }
		            }).getContainer();

		        case "switch":
		            return qpx.ui({
		                view: "qpSwitch",
		                value: !!val,
		                onValueChanged: function (e) {
		                    self._updateValue(item, !!e.value);
		                }
		            }).getContainer();

		        case "dropdown":
		            return qpx.ui({
		                view: "dropDownButton",
		                items: item.dataSource || [],
		                useSelectMode: true,
		                selectedItemKey: val,
		                onSelectionChanged: function (e) {
		                    self._updateValue(item, e.key);
		                }
		            }).getContainer();

		        default:
		            return $("<span></span>").text(val);
		    }
		},

        _updateValue: function (item, newVal) {
            var prev = item.value;
            item.value = newVal;

            this.trigger("itemChanged", {
                field: item.field,
                value: newVal,
                previousValue: prev,
                item: item,
                component: this
            });

            this.trigger("valueChanged", {
                field: item.field,
                value: newVal,
                previousValue: prev,
                component: this
            });
        },

        getValues: function () {
            var obj = {};
            this.config.items.forEach(function (it) {
                obj[it.field] = it.value;
            });
            return obj;
        },

        setValues: function (obj) {
            this.config.items.forEach(function (it) {
                if (obj[it.field] !== undefined) {
                    it.value = obj[it.field];
                }
            });
            this.refresh();
        },

        option: function (name, value) {
            if (arguments.length === 0) return this.config;
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) return this.config[name];

            var prev = this.config[name];
            this.config[name] = value;

            if (name === "items") {
                this.refresh();
            } else if (name === "visible") {
                this.$container.toggleClass("qpx-hidden", !value);
            } else if (name === "disabled") {
                this.$container.toggleClass("qpx-state-disabled", !!value);
            }

            this.trigger("optionChanged", { name, value, previousValue: prev });
            return this;
        },

        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        destroy: function () {
            this.$container.off();
            this._super();
        }
    });

    qpx.registerWidget("qpPropertyGrid", PropertyGrid);
    qpx.qpPropertyGrid = PropertyGrid;

})(window.qpx, jQuery);
