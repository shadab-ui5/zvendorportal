sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter"
], (Controller, Models, Formatter) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.PurchaseOrder", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePurchaseOrder").attachPatternMatched(this._onRouteMatched, this);
            const oPoItems = new sap.ui.model.json.JSONModel();
            this.getOwnerComponent().setModel(oPoItems, "PoItemModel");
            const oODataModel = this.getOwnerComponent().getModel("RoutePoData");
            this.getView().setModel(oODataModel, "RoutePoData");
            const oPoHeader = this.getOwnerComponent().getModel("RoutePoData")?.getProperty("/PoHeader");
            var oTable = this.byId("idPoItemTable");
            if (oTable) {
                // use .attachEvent to preserve 'this' with bind
                oTable.attachEvent("updateFinished", this._markDeliveredRows.bind(this));
            }
            if (!oPoHeader || Object.keys(oPoHeader).length === 0) {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal");
            }
        },
        _markDeliveredRows: function () {
            var oTable = this.byId("idPoItemTable");
            if (!oTable) return;

            oTable.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("PoItemModel");
                if (!oCtx) return;

                var oData = oCtx.getObject();
                var scheduled = parseFloat(oData.ScheduleQty) || 0;
                var delivered = parseFloat(oData.DeliveredQty) || 0;

                var $checkbox = oItem.$().find(".sapMCb"); // MultiSelect checkbox
                if (scheduled === delivered) {
                    // gray out row
                    oItem.addStyleClass("rowDisabled");

                    // disable checkbox via CSS pointer-events
                    $checkbox.css("pointer-events", "none");
                    $checkbox.css("opacity", "0.4");

                    // deselect if already selected
                    if (oItem.getSelected && oItem.getSelected()) {
                        oItem.setSelected(false);
                    }
                } else {
                    oItem.removeStyleClass("rowDisabled");
                    $checkbox.css("pointer-events", "");
                    $checkbox.css("opacity", "");
                }
            });
        },
        onSelectionChange: function (oEvent) {
            // guard to avoid handling programmatic changes
            if (this._suppressSelectionHandler) {
                return;
            }

            var oTable = this.byId("idPoItemTable");
            var aChangedItems = oEvent.getParameter("listItems") || [];
            var bSelected = oEvent.getParameter("selected");

            var that = this;

            // if listItems is empty (rare), fall back to all items (covers some edge cases)
            if (!aChangedItems.length) {
                aChangedItems = oTable.getItems();
            }

            aChangedItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("PoItemModel");
                if (!oCtx) return;

                var oData = oCtx.getObject();
                var scheduled = parseFloat(oData.ScheduleQty) || 0;
                var delivered = parseFloat(oData.DeliveredQty) || 0;

                if (scheduled === delivered && bSelected) {
                    // Prevent recursion while we change selection programmatically
                    that._suppressSelectionHandler = true;

                    // Preferred: use ListBase API available on sap.m.Table
                    if (typeof oTable.setSelectedItem === "function") {
                        oTable.setSelectedItem(oItem, false);
                    }
                    // Fallback: set the item selected property directly
                    else if (typeof oItem.setSelected === "function") {
                        oItem.setSelected(false);
                    }

                    that._suppressSelectionHandler = false;
                }
            });
        },
        formatter: Formatter,
        _onRouteMatched: function (oEvent) {
            const oTable = this.byId("idPoItemTable");
            oTable.setBusy(true); // Show busy indicator
            var sPoNumber = oEvent.getParameter("arguments").po;
            console.log("Routed PO ID:", sPoNumber);
            const oODataModel = this.getOwnerComponent().getModel("vendorModel");
            // Assuming the model name is "PoItemModel"
            const oPoItemModel = this.getOwnerComponent().getModel("PoItemModel");
            oPoItemModel.setProperty("/POItems", []); // Clear the data
            oPoItemModel.refresh(); // Only if necessary
            Models.loadPOItems(oODataModel, oPoItemModel, sPoNumber, oTable);
            // Use sPOId to filter model or fetch data
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal", {}, true); // replace with actual route
            }
        },
        onNavNext: function () {
            const oTable = this.byId("idPoItemTable");
            const aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems.length) {
                sap.m.MessageToast.show('Select atleast One Item');
                return;
            }
            const aSelectedData = aSelectedItems.map(oItem =>
                oItem.getBindingContext("PoItemModel").getObject()
            );

            const oModel = new sap.ui.model.json.JSONModel({ POItems: aSelectedData });
            this.getOwnerComponent().setModel(oModel, "SelectedPoItemsModel");
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAsnCreation", {
                po: aSelectedData[0].PurchaseOrder // pass any key you need
            });
            // Optional: Console log for debugging
            console.log("Selected PO Items:", aSelectedData);
        },
        onMaterialSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query");
            var oTable = this.byId("idPoItemTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                // Filter based on Material or Item Description
                var aFilters = [
                    new sap.ui.model.Filter("ItemDescription", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sQuery)
                ];

                var oCombinedFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false
                });

                oBinding.filter(oCombinedFilter);
            } else {
                // Clear filter
                oBinding.filter([]);
            }
        }

    });
});