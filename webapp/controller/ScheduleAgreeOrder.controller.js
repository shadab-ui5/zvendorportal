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

            if (!oSaHeader || Object.keys(oSaHeader).length === 0) {
                this.getOwnerComponent().getRouter().navTo("RouteSchedulingAgg");
            }
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