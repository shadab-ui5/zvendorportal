sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter"
], (Controller, Models, Formatter) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.ScheduleAgreeOrder", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteScheduleAgreeOrder").attachPatternMatched(this._onRouteMatched, this);
            const oSaItems = new sap.ui.model.json.JSONModel();
            this.getOwnerComponent().setModel(oSaItems, "SaItemModel");
            const oODataModel = this.getOwnerComponent().getModel("RouteSaData");
            this.getView().setModel(oODataModel, "RouteSaData");
            const oSaHeader = this.getOwnerComponent().getModel("RouteSaData")?.getProperty("/SaHeader");
            var oTable = this.byId("idSaItemTable");
            if (oTable) {
                // use .attachEvent to preserve 'this' with bind
                oTable.attachEvent("updateFinished", this._markDeliveredRows.bind(this));
            }
            if (!oSaHeader || Object.keys(oSaHeader).length === 0) {
                this.getOwnerComponent().getRouter().navTo("RouteSchedulingAgg");
            }
        },
        _markDeliveredRows: function () {
            var oTable = this.byId("idSaItemTable");
            if (!oTable) return;

            oTable.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("SaItemModel");
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

        formatter: Formatter,
        _onRouteMatched: function (oEvent) {
            const oTable = this.byId("idSaItemTable");
            oTable.setBusy(true); // Show busy indicator
            var sSaNumber = oEvent.getParameter("arguments").po;
            console.log("Routed PO ID:", sSaNumber);
            const oODataModel = this.getOwnerComponent().getModel("vendorModel");
            // Assuming the model name is "SaItemModel"
            const oSaItemModel = this.getOwnerComponent().getModel("SaItemModel");
            oSaItemModel.setProperty("/SaItems", []); // Clear the data
            oSaItemModel.refresh(); // Only if necessary
            Models.loadSaItems(oODataModel, oSaItemModel, sSaNumber, oTable);
            // Use sPOId to filter model or fetch data
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteSchedulingAgg", {}, true); // replace with actual route
            }
        },
        onNavNext: function () {
            const oTable = this.byId("idSaItemTable");
            const aSelectedItems = oTable.getSelectedItems();
            if (!aSelectedItems.length) {
                sap.m.MessageToast.show('Select atleast One Item');
                return;
            }
            const aSelectedData = aSelectedItems.map(oItem =>
                oItem.getBindingContext("SaItemModel").getObject()
            );

            const oModel = new sap.ui.model.json.JSONModel({ SaItems: aSelectedData });
            this.getOwnerComponent().setModel(oModel, "SelectedSaItemsModel");
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAsnSaCreation", {
                po: aSelectedData[0].SchedulingAgreement // pass any key you need
            });
            // Optional: Console log for debugging
            console.log("Selected PO Items:", aSelectedData);
        }
    });
});