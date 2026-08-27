/*!
 * qpx - qpPropertyGrid
 * PropertyGrid inspirovaný Kendo UI PropertyGrid — vlastnosti seskupené
 * do kategorií, editace přímo v mřížce pomocí odpovídajícího qpx
 * editoru (text/number/checkbox/switch/dropdown) podle "editor" u
 * každé položky. Vzhledem se řídí widgets/_propertygrid.scss, který je
 * naladěný na styl Kendo UI "Classic" (Silver) — světlá i tmavá
 * varianta jedou nad stejnými --qpx-* proměnnými jako zbytek frameworku.
 *
 * API je zachováno beze změny oproti předchozí verzi (items, readOnly,
 * showCategories, categoryField, disabled, visible, onValueChanged,
 * onItemChanged, onOptionChanged, editor: "text"|"number"|"checkbox"|
 * "switch"|"dropdown", getValues()/setValues()). Doplněno pouze
 * NEDESTRUKTIVNĚ:
 *   - showHeader / nameHeader / valueHeader — volitelná hlavička
 *     sloupců "Vlastnost | Hodnota" (typický Kendo PropertyGrid vzhled),
 *   - onInitialized / onContentReady / onDisposing — pro konzistenci
 *     s ostatními qpx widgety,
 *   - oprava: refresh() už znovu neregistruje event handlery (dřív
 *     způsobovalo vícenásobné volání onValueChanged po setValues()),
 *   - oprava: option("readOnly"/"showCategories"/"categoryField"/...)
 *     teď skutečně překreslí mřížku,
 *   - vnořené editor-widgety (qpTextBox/qpNumberBox/qpCheckBox/
 *     qpSwitch/dropDownButton) se při každém překreslení i při
 *     destroy() korektně destruují (dřív mohly zůstávat "osiřelé").
 *
 * options:
 *   items ([{ field, label, value, editor, category, readOnly, dataSource }]),
 *   readOnly, showCategories, categoryField,
 *   showHeader, nameHeader, valueHeader,
 *   disabled, visible
 *
 * events:
 *   onInitialized, onContentReady, onValueChanged, onItemChanged,
 *   onOptionChanged, onDisposing
 *
 * methods:
 *   option(name[, value]), getValues(), setValues(obj),
 *   refresh(), enable(), disable(), destroy()
 */
(function (qpx, $) {
    "use strict";

    var PropertyGrid = qpx.Widget.extend({

        defaults: {
            items: [],
            readOnly: false,
            showCategories: true,
            categoryField: "category",

            showHeader: true,
            nameHeader: "Vlastnost",
            valueHeader: "Hodnota",

            disabled: false,
            visible: true,

            onValueChanged: null,
            onItemChanged: null,
            onOptionChanged: null,
            onInitialized: null,
            onContentReady: null,
            onDisposing: null
        },

        // ---------------------------------------------------------------
        render: function () {
            var cfg = this.config;
            var self = this;

            this.$container
                .addClass("qpx-propertygrid")
                .toggleClass("qpx-hidden", !cfg.visible)
                .toggleClass("qpx-state-disabled", !!cfg.disabled);

            if (cfg.onValueChanged) { this.on("valueChanged", cfg.onValueChanged); }
            if (cfg.onItemChanged) { this.on("itemChanged", cfg.onItemChanged); }
            if (cfg.onOptionChanged) { this.on("optionChanged", cfg.onOptionChanged); }
            if (cfg.onInitialized) { this.on("ready", cfg.onInitialized); }
            if (cfg.onContentReady) { this.on("contentReady", cfg.onContentReady); }
            if (cfg.onDisposing) { this.on("destroy", cfg.onDisposing); }

            this._editorInstances = [];

            this._renderGrid();

            setTimeout(function () { self.trigger("contentReady", { component: self }); }, 0);
        },

        // znovu-vykreslení BEZ opětovné registrace event handlerů
        // (base Widget.refresh() by volal render() znovu -> duplicitní .on(...))
        refresh: function () {
            this._renderGrid();
            return this;
        },

        // ---------------------------------------------------------------
        _renderGrid: function () {
            var self = this;
            var cfg = this.config;

            this._destroyEditors();
            this.$container.empty();

            if (cfg.showHeader) {
                var $headerTable = $("<table class='qpx-pg-table qpx-pg-header-table'></table>");
                var $headerRow = $("<tr class='qpx-pg-header-row'></tr>");
                $headerRow.append($("<th class='qpx-pg-label'></th>").text(cfg.nameHeader));
                $headerRow.append($("<th class='qpx-pg-editor'></th>").text(cfg.valueHeader));
                $headerTable.append($headerRow);
                this.$container.append($headerTable);
            }

            var groups = {};
            var order = [];

            cfg.items.forEach(function (item) {
                var cat = cfg.showCategories ? (item[cfg.categoryField] || "General") : "_nocat";
                if (!groups[cat]) { groups[cat] = []; order.push(cat); }
                groups[cat].push(item);
            });

            order.forEach(function (cat) {
                if (cfg.showCategories) {
                    self.$container.append($("<div class='qpx-pg-category'></div>").text(cat));
                }

                var $table = $("<table class='qpx-pg-table'></table>");

                groups[cat].forEach(function (item) {
                    var $tr = $("<tr class='qpx-pg-row'></tr>");

                    var $label = $("<td class='qpx-pg-label'></td>").text(item.label || item.field);
                    var $editor = $("<td class='qpx-pg-editor'></td>");

                    $editor.append(self._createEditor(item));

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
                return $("<span class='qpx-pg-readonly'></span>").text(this._formatReadOnlyValue(item));
            }

            var widgetCfg = null;

            switch (item.editor) {

                case "textbox":
                case "text":
                    widgetCfg = {
                        view: "qpTextBox",
                        value: val,
                        onValueChanged: function (e) { self._updateValue(item, e.value); }
                    };
                    break;

                case "number":
                case "numberbox":
                    widgetCfg = {
                        view: "qpNumberBox",
                        value: val,
                        onValueChanged: function (e) { self._updateValue(item, Number(e.value)); }
                    };
                    break;

                case "checkbox":
                    widgetCfg = {
                        view: "qpCheckBox",
                        value: !!val,
                        onValueChanged: function (e) { self._updateValue(item, !!e.value); }
                    };
                    break;

                case "switch":
                    widgetCfg = {
                        view: "qpSwitch",
                        value: !!val,
                        onValueChanged: function (e) { self._updateValue(item, !!e.value); }
                    };
                    break;

                case "dropdown":
                    widgetCfg = {
                        view: "dropDownButton",
                        items: item.dataSource || [],
                        useSelectMode: true,
                        selectedItemKey: val,
                        onSelectionChanged: function (e) { self._updateValue(item, e.key); }
                    };
                    break;
            }

            if (!widgetCfg) {
                return $("<span></span>").text(val);
            }

            var instance = qpx.ui(widgetCfg);
            this._editorInstances.push(instance);
            return instance.getContainer();
        },

        // checkbox/switch v readOnly zobrazí "Ano"/"Ne" místo true/false
        _formatReadOnlyValue: function (item) {
            if (item.editor === "checkbox" || item.editor === "switch") {
                return item.value ? "Ano" : "Ne";
            }
            return item.value;
        },

        _destroyEditors: function () {
            (this._editorInstances || []).forEach(function (inst) {
                try { inst.destroy(); } catch (e) { /* noop */ }
            });
            this._editorInstances = [];
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

        // ---------------------------------------------------------------
        // Veřejné API
        // ---------------------------------------------------------------
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
            return this;
        },

        enable: function () { return this.option("disabled", false); },
        disable: function () { return this.option("disabled", true); },

        option: function (name, value) {
            if (arguments.length === 0) { return this.config; }
            if (qpx.isObject(name)) {
                var self = this;
                $.each(name, function (k, v) { self.option(k, v); });
                return this;
            }
            if (arguments.length === 1) { return this.config[name]; }

            var prev = this.config[name];
            if (prev === value) { return this; }
            this.config[name] = value;

            switch (name) {
                case "items":
                case "showCategories":
                case "categoryField":
                case "readOnly":
                case "showHeader":
                case "nameHeader":
                case "valueHeader":
                    this.refresh();
                    break;

                case "visible":
                    this.$container.toggleClass("qpx-hidden", !value);
                    break;

                case "disabled":
                    this.$container.toggleClass("qpx-state-disabled", !!value);
                    break;
            }

            this.trigger("optionChanged", { name: name, value: value, previousValue: prev, component: this });
            return this;
        },

        destroy: function () {
            this._destroyEditors();
            this.$container.off();
            this._super();
        }
    });

    qpx.registerWidget("qpPropertyGrid", PropertyGrid);
    qpx.qpPropertyGrid = PropertyGrid;

})(window.qpx, jQuery);
