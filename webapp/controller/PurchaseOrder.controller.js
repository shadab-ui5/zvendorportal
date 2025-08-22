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

            if (!oPoHeader || Object.keys(oPoHeader).length === 0) {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal");
            }
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
        }
    });
});